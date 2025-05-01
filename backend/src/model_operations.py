"""
Functions for model operations such as adding/removing variables.
"""

import pandas as pd
import numpy as np
import copy
import statsmodels.api as sm
from IPython.display import display, HTML

def apply_adstock(series, adstock_rate):
    """
    Apply adstock transformation to a time series.
    
    Parameters:
    -----------
    series : pandas.Series
        The original time series
    adstock_rate : float
        Adstock rate (between 0 and 1)
    
    Returns:
    --------
    pandas.Series
        The transformed series with adstock applied
    """
    if adstock_rate == 0:
        return series
    
    # Make a copy and convert to float to avoid dtype warnings
    result = series.astype(float).copy()
    
    # Apply adstock formula
    for i in range(1, len(result)):
        result.iloc[i] = float(series.iloc[i]) + adstock_rate * result.iloc[i-1]
    
    return result

def add_variables_to_model(model, variable_names, adstock_rates=None):
    """
    Add variables to a model with optional adstock transformation.
    
    Parameters:
    -----------
    model : LinearModel
        The model to add variables to
    variable_names : list of str
        List of variable names to add
    adstock_rates : list of float, optional
        List of adstock rates corresponding to each variable
        
    Returns:
    --------
    tuple
        (old_summary_df, new_model_preview, new_model)
    """
    if model is None or model.results is None:
        print("No valid model to add variables to.")
        return None, None, None
    
    # If no adstock rates provided, assume all zeros (no adstock)
    if adstock_rates is None:
        adstock_rates = [0] * len(variable_names)
    
    # Ensure adstock_rates and variable_names have the same length
    if len(adstock_rates) != len(variable_names):
        print("Error: Number of adstock rates must match number of variables.")
        return None, None, None
    
    # Create a copy of the model for preview
    preview_model = copy.deepcopy(model)
    
    # Store the current coefficients and t-stats
    old_features = model.features.copy()
    old_params = model.results.params.copy() if model.results is not None else {}
    old_tvalues = model.results.tvalues.copy() if model.results is not None else {}
    
    # Create a summary dataframe of the current model
    old_summary = []
    
    # Add constant term
    if 'const' in old_params:
        old_summary.append({
            'Variable': 'const',
            'Coefficient': old_params['const'],
            'T-statistic': old_tvalues['const'],
            'New Coefficient': None,
            'New T-statistic': None,
            'Coef Change': None,
            'T-stat Change': None
        })
    
    # Add existing features
    for feature in old_features:
        if feature in old_params:
            old_summary.append({
                'Variable': feature,
                'Coefficient': old_params[feature],
                'T-statistic': old_tvalues[feature],
                'New Coefficient': None,
                'New T-statistic': None,
                'Coef Change': None,
                'T-stat Change': None
            })
    
    old_summary_df = pd.DataFrame(old_summary)
    
    # Add the new variables to the preview model
    for var, adstock in zip(variable_names, adstock_rates):
        if var not in preview_model.model_data.columns:
            print(f"Warning: Variable '{var}' not found in the data.")
            continue
            
        if var == preview_model.kpi:
            print(f"Warning: Cannot add KPI '{var}' as a feature.")
            continue
            
        if var in preview_model.features:
            print(f"Warning: Feature '{var}' already in the model.")
            continue
        
        try:
            # Apply adstock if needed
            if adstock > 0:
                # Create a new column name for the adstocked variable
                adstock_var = f"{var}_adstock_{int(adstock*100)}"
                
                # Apply adstock transformation
                preview_model.model_data[adstock_var] = apply_adstock(preview_model.model_data[var], adstock)
                
                # Add the adstocked variable to the model
                preview_model.features.append(adstock_var)
            else:
                # Add the original variable
                preview_model.features.append(var)
            
        except Exception as e:
            print(f"Error adding variable '{var}': {str(e)}")
    
    # Fit the preview model
    if preview_model.features:
        try:
            # Prepare the data
            y = preview_model.model_data[preview_model.kpi]
            X = pd.DataFrame(index=y.index)
            
            # Add the constant and features
            X = sm.add_constant(preview_model.model_data[preview_model.features])
            
            # Fit the model
            preview_model.model = sm.OLS(y, X)
            preview_model.results = preview_model.model.fit()
        except Exception as e:
            print(f"Error fitting preview model: {str(e)}")
            return old_summary_df, None, None
    
    # Get new coefficients and t-stats
    new_params = preview_model.results.params.copy()
    new_tvalues = preview_model.results.tvalues.copy()
    
    # Create a new dataframe with the comparison
    new_summary = []
    
    # Add constant term
    if 'const' in new_params:
        const_change = new_tvalues['const'] - old_tvalues['const'] if 'const' in old_tvalues else None
        coef_change = new_params['const'] - old_params['const'] if 'const' in old_params else None
        
        new_summary.append({
            'Variable': 'const',
            'Coefficient': old_params['const'] if 'const' in old_params else None,
            'T-statistic': old_tvalues['const'] if 'const' in old_tvalues else None,
            'New Coefficient': new_params['const'],
            'New T-statistic': new_tvalues['const'],
            'Coef Change': coef_change,
            'T-stat Change': const_change
        })
    
    # Add all features from old model
    for feature in old_features:
        if feature in new_params:
            t_change = new_tvalues[feature] - old_tvalues[feature] if feature in old_tvalues else None
            coef_change = new_params[feature] - old_params[feature] if feature in old_params else None
            
            new_summary.append({
                'Variable': feature,
                'Coefficient': old_params[feature] if feature in old_params else None,
                'T-statistic': old_tvalues[feature] if feature in old_tvalues else None,
                'New Coefficient': new_params[feature],
                'New T-statistic': new_tvalues[feature],
                'Coef Change': coef_change,
                'T-stat Change': t_change
            })
        else:
            # Feature was in old model but not in new model
            new_summary.append({
                'Variable': feature,
                'Coefficient': old_params[feature] if feature in old_params else None,
                'T-statistic': old_tvalues[feature] if feature in old_tvalues else None,
                'New Coefficient': None,
                'New T-statistic': None,
                'Coef Change': None,
                'T-stat Change': None
            })
    
    # Add new features
    for feature in preview_model.features:
        if feature not in old_features and feature in new_params:
            new_summary.append({
                'Variable': feature,
                'Coefficient': None,
                'T-statistic': None,
                'New Coefficient': new_params[feature],
                'New T-statistic': new_tvalues[feature],
                'Coef Change': None,
                'T-stat Change': None
            })
    
    new_summary_df = pd.DataFrame(new_summary)
    
    # Reorder columns
    if not new_summary_df.empty:
        new_summary_df = new_summary_df[['Variable', 'Coefficient', 'T-statistic', 
                                         'New Coefficient', 'New T-statistic', 
                                         'Coef Change', 'T-stat Change']]
    
    return old_summary_df, new_summary_df, preview_model

def remove_variables_from_model(model, variable_names):
    """
    Remove variables from a model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to remove variables from
    variable_names : list of str
        List of variable names to remove
        
    Returns:
    --------
    tuple
        (old_summary_df, new_model_preview, new_model)
    """
    if model is None or model.results is None:
        print("No valid model to remove variables from.")
        return None, None, None
    
    # Create a copy of the model for preview
    preview_model = copy.deepcopy(model)
    
    # Store the current coefficients and t-stats
    old_features = model.features.copy()
    old_params = model.results.params.copy() if model.results is not None else {}
    old_tvalues = model.results.tvalues.copy() if model.results is not None else {}
    
    # Create a summary dataframe of the current model
    old_summary = []
    
    # Add constant term
    if 'const' in old_params:
        old_summary.append({
            'Variable': 'const',
            'Coefficient': old_params['const'],
            'T-statistic': old_tvalues['const'],
            'New Coefficient': None,
            'New T-statistic': None,
            'Coef Change': None,
            'T-stat Change': None
        })
    
    # Add existing features
    for feature in old_features:
        if feature in old_params:
            old_summary.append({
                'Variable': feature,
                'Coefficient': old_params[feature],
                'T-statistic': old_tvalues[feature],
                'New Coefficient': None,
                'New T-statistic': None,
                'Coef Change': None,
                'T-stat Change': None
            })
    
    old_summary_df = pd.DataFrame(old_summary)
    
    # Remove the variables from the preview model
    for var in variable_names:
        if var not in preview_model.features:
            print(f"Warning: Feature '{var}' not in the model.")
            continue
        
        try:
            # Remove the feature
            preview_model.features.remove(var)
        except Exception as e:
            print(f"Error removing variable '{var}': {str(e)}")
    
    # Fit the preview model
    if preview_model.features:
        try:
            # Prepare the data
            y = preview_model.model_data[preview_model.kpi]
            
            # Add the constant and features
            X = sm.add_constant(preview_model.model_data[preview_model.features])
            
            # Fit the model
            preview_model.model = sm.OLS(y, X)
            preview_model.results = preview_model.model.fit()
        except Exception as e:
            print(f"Error fitting preview model: {str(e)}")
            return old_summary_df, None, None
    else:
        # If no features left, reinitialize with just the constant
        preview_model.initialize_model()
    
    # Get new coefficients and t-stats
    new_params = preview_model.results.params.copy()
    new_tvalues = preview_model.results.tvalues.copy()
    
    # Create a new dataframe with the comparison
    new_summary = []
    
    # Add constant term
    if 'const' in new_params:
        const_change = new_tvalues['const'] - old_tvalues['const'] if 'const' in old_tvalues else None
        coef_change = new_params['const'] - old_params['const'] if 'const' in old_params else None
        
        new_summary.append({
            'Variable': 'const',
            'Coefficient': old_params['const'] if 'const' in old_params else None,
            'T-statistic': old_tvalues['const'] if 'const' in old_tvalues else None,
            'New Coefficient': new_params['const'],
            'New T-statistic': new_tvalues['const'],
            'Coef Change': coef_change,
            'T-stat Change': const_change
        })
    
    # Add remaining features
    for feature in preview_model.features:
        if feature in new_params and feature in old_params:
            t_change = new_tvalues[feature] - old_tvalues[feature]
            coef_change = new_params[feature] - old_params[feature]
            
            new_summary.append({
                'Variable': feature,
                'Coefficient': old_params[feature],
                'T-statistic': old_tvalues[feature],
                'New Coefficient': new_params[feature],
                'New T-statistic': new_tvalues[feature],
                'Coef Change': coef_change,
                'T-stat Change': t_change
            })
        elif feature in new_params:
            # Feature is in new model but wasn't in old model (shouldn't happen in remove case)
            new_summary.append({
                'Variable': feature,
                'Coefficient': None,
                'T-statistic': None,
                'New Coefficient': new_params[feature],
                'New T-statistic': new_tvalues[feature],
                'Coef Change': None,
                'T-stat Change': None
            })
    
    # Add removed features
    for feature in variable_names:
        if feature in old_features and feature in old_params:
            new_summary.append({
                'Variable': feature,
                'Coefficient': old_params[feature],
                'T-statistic': old_tvalues[feature],
                'New Coefficient': None,
                'New T-statistic': None,
                'Coef Change': None,
                'T-stat Change': None
            })
    
    new_summary_df = pd.DataFrame(new_summary)
    
    # Reorder columns
    if not new_summary_df.empty:
        new_summary_df = new_summary_df[['Variable', 'Coefficient', 'T-statistic', 
                                         'New Coefficient', 'New T-statistic', 
                                         'Coef Change', 'T-stat Change']]
    
    return old_summary_df, new_summary_df, preview_model

def display_model_summary(model, return_dataframes=True):
    """
    Display a comprehensive summary of the current model with enhanced styling.
    
    Parameters:
    -----------
    model : LinearModel
        The model to display
    return_dataframes : bool, optional
        If True, returns the dataframes as well as displaying the HTML
        
    Returns:
    --------
    tuple or None
        (coefficients_df, statistics_df) if return_dataframes is True, None otherwise
    """
    import pandas as pd
    from IPython.display import display, HTML
    
    if model is None or model.results is None:
        print("No valid model to display.")
        return (None, None) if return_dataframes else None
    
    # Update the transformations from the loader if available
    if hasattr(model, 'loader') and model.loader is not None:
        loader_transformations = model.loader.get_transformations()
    else:
        loader_transformations = {}
    
    # Create a dataframe with coefficients and t-statistics
    coef_data = []
    
    # Get coefficients and t-stats
    params = model.results.params
    tvalues = model.results.tvalues
    pvalues = model.results.pvalues
    
    # Try to load contribution groups if available
    groups = {}
    try:
        from src.contribution_groups import get_contribution_groups
        group_settings = get_contribution_groups(model)
        if group_settings:
            for var_name, var_data in group_settings.items():
                groups[var_name] = var_data.get('Group', '')
    except:
        pass  # If groups can't be loaded, we'll just use empty strings
    
    # Add constant term
    if 'const' in params:
        coef_data.append({
            'Variable': 'const',
            'Coefficient': params['const'],
            'T-stat': tvalues['const'],
            'Adstock': 0,  # Constant has no adstock
            'Transformation': 'None',  # Constant has no transformation
            'Group': groups.get('const', '')  # Get group if available
        })
    
    # Add features
    for feature in model.features:
        if feature in params:
            # Extract adstock value if present in the variable name
            adstock = 0
            if '_adstock_' in feature:
                try:
                    # Try to extract the adstock value from the variable name
                    adstock = int(feature.split('_adstock_')[1])
                except:
                    pass
            
            # Get transformation if available - check all possible sources
            transformation = 'None'
            
            # 1. Check loader transformations first
            base_var = feature.split('_adstock_')[0] if '_adstock_' in feature else feature
            base_var = base_var.split('|')[0] if '|' in base_var else base_var
            
            if base_var in loader_transformations:
                transformation = loader_transformations[base_var]
            
            # 2. Check feature_transformations
            elif hasattr(model, 'feature_transformations') and feature in model.feature_transformations:
                transformation = model.feature_transformations[feature]
            
            # 3. Check base variable name in feature_transformations
            elif hasattr(model, 'feature_transformations') and base_var in model.feature_transformations:
                transformation = model.feature_transformations[base_var]
            
            # Get the group if available
            group = groups.get(feature, '')
            
            coef_data.append({
                'Variable': feature,
                'Coefficient': params[feature],
                'T-stat': tvalues[feature],
                'Adstock': adstock,
                'Transformation': transformation,
                'Group': group
            })
    
    coef_df = pd.DataFrame(coef_data)
    
    # Create a dataframe with model statistics
    stats_data = {
        'Statistic': [
            'R-squared',
            'Adjusted R-squared',
            'F-statistic',
            'Prob (F-statistic)',
            'AIC',
            'BIC',
            'No. Observations',
            'Df Residuals',
            'Df Model'
        ],
        'Value': [
            model.results.rsquared,
            model.results.rsquared_adj,
            model.results.fvalue,
            model.results.f_pvalue,
            model.results.aic,
            model.results.bic,
            model.results.nobs,
            model.results.df_resid,
            model.results.df_model
        ]
    }
    
    # Add Durbin-Watson statistic if available
    try:
        from statsmodels.stats.stattools import durbin_watson
        dw = durbin_watson(model.results.resid)
        stats_data['Statistic'].append('Durbin-Watson')
        stats_data['Value'].append(dw)
    except:
        pass
    
    # Add Jarque-Bera test if available
    try:
        import statsmodels.api as sm
        jb_stat, jb_pval = sm.stats.jarque_bera(model.results.resid)
        stats_data['Statistic'].append('Jarque-Bera')
        stats_data['Value'].append(jb_stat)
        stats_data['Statistic'].append('Prob (Jarque-Bera)')
        stats_data['Value'].append(jb_pval)
    except:
        pass
    
    stats_df = pd.DataFrame(stats_data)
    
    # Get the HTML table for coefficients
    from src.table_styles import get_results_table_html
    
    # Define columns for display in the order specified
    coef_columns = ["Variable", "Coefficient", "T-stat", "Adstock", "Transformation", "Group"]
    
    # Convert the coefficients dataframe to a styled HTML table
    coef_html = get_results_table_html(
        coef_df, 
        initial_columns=coef_columns,
        detail_columns=None,
        table_id="model-coef-table"
    )
    
    # Create a simpler HTML table for model statistics (no need for fancy sorting and details)
    stats_html = """
    <style>
    #model-stats-table {
        border-collapse: collapse;
        width: 100%;
        font-family: Arial, sans-serif;
        margin-top: 20px;
    }
    
    #model-stats-table th, #model-stats-table td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    
    #model-stats-table th {
        background-color: #444;
        color: white;
        font-weight: bold;
    }
    
    #model-stats-table tr:nth-child(even) {
        background-color: #f9f9f9;
    }
    
    #model-stats-table tr:hover {
        background-color: #f2f2f2;
    }
    </style>
    
    <table id="model-stats-table">
      <thead>
        <tr>
          <th>Statistic</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
    """
    
    # Add each statistic to the table
    for i, row in stats_df.iterrows():
        stat = row['Statistic']
        value = row['Value']
        
        # Format the value based on type
        if isinstance(value, (int, float)):
            # Apply different formatting for p-values
            if 'prob' in stat.lower() or 'p-value' in stat.lower():
                formatted_value = f"{value:.6f}"
            else:
                formatted_value = f"{value:.4f}"
        else:
            formatted_value = str(value)
        
        stats_html += f"""
        <tr>
          <td>{stat}</td>
          <td>{formatted_value}</td>
        </tr>
        """
    
    # Close the table
    stats_html += """
      </tbody>
    </table>
    """
    
    # Display the HTML tables
    display(HTML(coef_html))
    display(HTML(stats_html))
    
    # Display model name and KPI
    print(f"Model: {model.name}")
    print(f"KPI: {model.kpi}")
    
    if model.start_date or model.end_date:
        print(f"Date Range: {model.start_date or 'beginning'} to {model.end_date or 'end'}")
    
    if return_dataframes:
        return coef_df, stats_df
    return None


def apply_split_by_date(model, variable_name, start_date=None, end_date=None, identifier=""):
    """
    Apply a date-based split transformation to a variable in the model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to apply the transformation to
    variable_name : str
        Name of the variable to transform
    start_date : str or datetime, optional
        Start date for the period to keep values (inclusive)
    end_date : str or datetime, optional
        End date for the period to keep values (inclusive)
    identifier : str, optional
        Custom identifier to append to the variable name
        
    Returns:
    --------
    str
        The name of the new variable
    """
    from src.variable_transformations import split_by_date
    
    if model.model_data is None:
        print("No data available. Please set data first.")
        return None
    
    if variable_name not in model.model_data.columns:
        print(f"Variable '{variable_name}' not found in the model data.")
        return None
    
    try:
        # Apply the transformation
        _, new_var_name = split_by_date(
            model.model_data, 
            variable_name, 
            start_date, 
            end_date, 
            identifier, 
            inplace=True
        )
        
        # Store transformation information
        if not hasattr(model, 'var_transformations'):
            model.var_transformations = {}
            
        model.var_transformations[new_var_name] = {
            'type': 'split_by_date',
            'original_var': variable_name,
            'start_date': start_date,
            'end_date': end_date,
            'identifier': identifier
        }
        
        print(f"Created new variable '{new_var_name}'")
        return new_var_name
        
    except Exception as e:
        print(f"Error applying transformation: {str(e)}")
        return None

def apply_multiply_vars(model, var1, var2, identifier=""):
    """
    Apply multiplication transformation to two variables in the model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to apply the transformation to
    var1 : str
        Name of the first variable
    var2 : str
        Name of the second variable
    identifier : str, optional
        Custom identifier for the new variable name
        
    Returns:
    --------
    str
        The name of the new variable
    """
    from src.variable_transformations import multiply_variables
    
    if model.model_data is None:
        print("No data available. Please set data first.")
        return None
    
    if var1 not in model.model_data.columns:
        print(f"Variable '{var1}' not found in the model data.")
        return None
    
    if var2 not in model.model_data.columns:
        print(f"Variable '{var2}' not found in the model data.")
        return None
    
    try:
        # Apply the transformation
        _, new_var_name = multiply_variables(
            model.model_data, 
            var1, 
            var2, 
            identifier, 
            inplace=True
        )
        
        # Store transformation information
        if not hasattr(model, 'var_transformations'):
            model.var_transformations = {}
            
        model.var_transformations[new_var_name] = {
            'type': 'multiply',
            'var1': var1,
            'var2': var2,
            'identifier': identifier
        }
        
        print(f"Created new variable '{new_var_name}'")
        return new_var_name
        
    except Exception as e:
        print(f"Error applying transformation: {str(e)}")
        return None

def load_transformed_variables(model):
    """
    Load transformed variables stored in the model.
    
    Parameters:
    -----------
    model : LinearModel
        The model containing transformation information
        
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    if not hasattr(model, 'var_transformations') or not model.var_transformations:
        print("No variable transformations to load.")
        return False
    
    if model.model_data is None:
        print("No data available. Please set data first.")
        return False
    
    from src.variable_transformations import split_by_date, multiply_variables
    
    try:
        count = 0
        for var_name, info in model.var_transformations.items():
            if info['type'] == 'split_by_date':
                # Apply split by date
                split_by_date(
                    model.model_data,
                    info['original_var'],
                    info['start_date'],
                    info['end_date'],
                    info['identifier'],
                    inplace=True
                )
                count += 1
                
            elif info['type'] == 'multiply':
                # Apply multiplication
                multiply_variables(
                    model.model_data,
                    info['var1'],
                    info['var2'],
                    info['identifier'],
                    inplace=True
                )
                count += 1
            
        if count > 0:
            print(f"Loaded {count} transformed variables")
        
        return True
        
    except Exception as e:
        print(f"Error loading transformations: {str(e)}")
        return False
    
    """
Functions for applying lead and lag transformations in models.
"""

def apply_lead_to_model(model, variable_names=None, periods=None):
    """
    Apply lead transformation to variables in the model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to apply the transformation to
    variable_names : str, list, or None, optional
        Variable name(s) to create leads for. If None, will prompt for input.
    periods : int, list, or None, optional
        Number of periods to shift forward for each lead. If None, will prompt for input.
        
    Returns:
    --------
    list
        List of new variable names created
    """
    from src.variable_transformations import create_lead
    
    if model.model_data is None:
        print("No data available. Please set data first.")
        return None
    
    try:
        # Apply the transformation
        _, new_var_names = create_lead(
            model.model_data, 
            variables=variable_names, 
            periods=periods, 
            inplace=True
        )
        
        # Store transformation information
        if not hasattr(model, 'var_transformations'):
            model.var_transformations = {}
            
        # Add each new variable to var_transformations
        for new_var in new_var_names:
            # Parse the variable name to get the base variable and period
            parts = new_var.split('|LEAD')
            base_var = parts[0]
            period = int(parts[1].strip())
            
            model.var_transformations[new_var] = {
                'type': 'lead',
                'original_var': base_var,
                'period': period
            }
        
        print(f"Created {len(new_var_names)} lead variables")
        return new_var_names
        
    except Exception as e:
        print(f"Error applying lead transformation: {str(e)}")
        return None
    
def apply_lag_to_model(model, variable_names=None, periods=None):
    """
    Apply lag transformation to variables in the model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to apply the transformation to
    variable_names : str, list, or None, optional
        Variable name(s) to create lags for. If None, will prompt for input.
    periods : int, list, or None, optional
        Number of periods to shift backward for each lag. If None, will prompt for input.
        
    Returns:
    --------
    list
        List of new variable names created
    """
    from src.variable_transformations import create_lag
    
    if model.model_data is None:
        print("No data available. Please set data first.")
        return None
    
    try:
        # Apply the transformation
        _, new_var_names = create_lag(
            model.model_data, 
            variables=variable_names, 
            periods=periods, 
            inplace=True
        )
        
        # Store transformation information
        if not hasattr(model, 'var_transformations'):
            model.var_transformations = {}
            
        # Add each new variable to var_transformations
        for new_var in new_var_names:
            # Parse the variable name to get the base variable and period
            parts = new_var.split('|LAG')
            base_var = parts[0]
            period = int(parts[1].strip())
            
            model.var_transformations[new_var] = {
                'type': 'lag',
                'original_var': base_var,
                'period': period
            }
        
        print(f"Created {len(new_var_names)} lag variables")
        return new_var_names
        
    except Exception as e:
        print(f"Error applying lag transformation: {str(e)}")
        return None