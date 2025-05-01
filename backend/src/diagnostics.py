"""
Functions for model diagnostics and variable testing with support for lead/lag variables.
"""

import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

def test_variable(model, variable_name, adstock_rate=0):
    """
    Test a variable's performance before adding it to the model.
    
    Parameters:
    -----------
    model : LinearModel
        The current model
    variable_name : str
        Name of the variable to test
    adstock_rate : float, optional
        Adstock rate to apply (0-1)
        
    Returns:
    --------
    dict
        Test results
    """
    if model is None or model.results is None:
        print("No valid model to test variables with.")
        return None
        
    if variable_name not in model.model_data.columns:
        print(f"Error: Variable '{variable_name}' not found in the data.")
        return None
        
    if variable_name == model.kpi:
        print(f"Error: Cannot test KPI '{variable_name}' as a feature.")
        return None
        
    if variable_name in model.features:
        print(f"Note: Variable '{variable_name}' is already in the model.")
    
    # Create a copy of the model data
    data = model.model_data.copy()
    
    # Apply adstock if needed
    test_var_name = variable_name
    if adstock_rate > 0:
        from src.model_operations import apply_adstock
        test_var_name = f"{variable_name}_adstock_{int(adstock_rate*100)}"
        data[test_var_name] = apply_adstock(data[variable_name], adstock_rate)
    
    # Clean data from missing values (important for lead/lag variables)
    # Create a mask of rows with complete data for all relevant variables
    complete_mask = data[model.kpi].notna()
    complete_mask &= data[test_var_name].notna()
    for feature in model.features:
        complete_mask &= data[feature].notna()
    
    # Filter to only complete rows
    clean_data = data[complete_mask].copy()
    
    # If we have too few data points after filtering, warn user
    if len(clean_data) < 10:
        print(f"Warning: Only {len(clean_data)} complete observations available for testing '{test_var_name}'.")
        print("This may be due to missing values in lead/lag variables.")
        if len(clean_data) < 5:
            print("Too few observations for reliable testing. Try a different variable or lag/lead period.")
            return None
    
    # Calculate simple correlation with KPI
    correlation = clean_data[model.kpi].corr(clean_data[test_var_name])
    
    # Run a simple regression with just this variable
    y = clean_data[model.kpi]
    X = sm.add_constant(clean_data[[test_var_name]])
    
    # Fit the simple model
    try:
        simple_model = sm.OLS(y, X).fit()
    except Exception as e:
        print(f"Error fitting simple model: {str(e)}")
        print("This may be due to missing or invalid values in the data.")
        return None
    
    # Run a regression with this variable added to the current model
    current_features = model.features.copy()
    if test_var_name not in current_features:
        current_features.append(test_var_name)
    
    # Prepare features for the full model
    X_full = sm.add_constant(clean_data[current_features])
    
    # Fit the full model
    try:
        full_model = sm.OLS(y, X_full).fit()
    except Exception as e:
        print(f"Error fitting full model: {str(e)}")
        print("This may be due to collinearity or invalid values in the data.")
        return None
    
    # Calculate correlation with residuals of the current model
    if model.results is not None:
        # Get residuals and align with clean_data
        residuals = model.results.resid
        common_idx = residuals.index.intersection(clean_data.index)
        if len(common_idx) > 0:
            aligned_residuals = residuals.loc[common_idx]
            aligned_var = clean_data.loc[common_idx, test_var_name]
            resid_corr = aligned_residuals.corr(aligned_var)
        else:
            resid_corr = None
    else:
        resid_corr = None
    
    # Check for collinearity (with error handling for infinite VIF values)
    vif_data = pd.DataFrame()
    vif_data["Variable"] = X_full.columns
    
    # Calculate VIF values with error handling
    vif_values = []
    for i in range(X_full.shape[1]):
        try:
            vif = variance_inflation_factor(X_full.values, i)
            # Handle infinite VIF values
            if np.isinf(vif) or np.isnan(vif):
                vif = 999.99  # Use a high but finite value
                print(f"Warning: Very high collinearity detected for '{X_full.columns[i]}'.")
            vif_values.append(vif)
        except Exception as e:
            print(f"Error calculating VIF for '{X_full.columns[i]}': {str(e)}")
            vif_values.append(999.99)
    
    vif_data["VIF"] = vif_values
    
    # Calculate impact at mean
    beta = full_model.params[test_var_name]
    mean_value = clean_data[test_var_name].mean()
    impact_at_mean = beta * mean_value
    
    # Get the R-squared from the current model using the same filtered data
    # This ensures a fair comparison
    X_current = sm.add_constant(clean_data[model.features])
    try:
        current_model = sm.OLS(y, X_current).fit()
        current_rsquared = current_model.rsquared
    except Exception as e:
        print(f"Warning: Could not calculate R-squared for current model on filtered data: {str(e)}")
        # Use the full model's R-squared as a fallback
        current_rsquared = model.results.rsquared
    
    # Prepare results
    results = {
        "Variable": test_var_name,
        "Correlation with KPI": correlation,
        "Correlation with Residuals": resid_corr,
        "Simple Regression": {
            "Coefficient": simple_model.params[test_var_name],
            "T-statistic": simple_model.tvalues[test_var_name],
            "P-value": simple_model.pvalues[test_var_name],
            "R-squared": simple_model.rsquared
        },
        "In Full Model": {
            "Coefficient": full_model.params[test_var_name],
            "T-statistic": full_model.tvalues[test_var_name],
            "P-value": full_model.pvalues[test_var_name],
            "R-squared": full_model.rsquared,
            "R-squared Increase": full_model.rsquared - current_rsquared
        },
        "Collinearity": {
            "VIF": vif_data.loc[vif_data["Variable"] == test_var_name, "VIF"].values[0]
        },
        "Impact": {
            "Mean Value": mean_value,
            "Impact at Mean": impact_at_mean,
            "Percent of KPI Mean": impact_at_mean / y.mean() * 100
        }
    }
    
    return results

def test_variables(model, variable_names, adstock_rates=None):
    """
    Test multiple variables before adding them to the model.
    
    Parameters:
    -----------
    model : LinearModel
        The current model
    variable_names : list of str
        Names of variables to test
    adstock_rates : list of float, optional
        Adstock rates to apply for each variable
        
    Returns:
    --------
    pandas.DataFrame
        Test results for all variables
    """
    if model is None or model.results is None:
        print("No valid model to test variables with.")
        return None
    
    # If no adstock rates provided, assume all zeros (no adstock)
    if adstock_rates is None:
        adstock_rates = [0] * len(variable_names)
    elif len(adstock_rates) < len(variable_names):
        # Pad with zeros if not enough rates
        adstock_rates.extend([0] * (len(variable_names) - len(adstock_rates)))
    
    # Test each variable
    results_list = []
    
    for var, adstock in zip(variable_names, adstock_rates):
        try:
            result = test_variable(model, var, adstock)
            
            if result:
                # Extract key metrics for the results table with the new column order
                results_list.append({
                    "Variable": result["Variable"],
                    "Coefficient": result["In Full Model"]["Coefficient"],
                    "T-stat": result["In Full Model"]["T-statistic"],
                    "R² Increase": result["In Full Model"]["R-squared Increase"],
                    "VIF": result["Collinearity"]["VIF"],
                    "Impact % of KPI": result["Impact"]["Percent of KPI Mean"],
                    "Correlation": result["Correlation with KPI"],
                    "Corr. with Residuals": result["Correlation with Residuals"]
                })
        except Exception as e:
            print(f"Error testing variable '{var}': {str(e)}")
            continue
    
    if not results_list:
        print("No valid variables to test.")
        return None
    
    # Create DataFrame
    results_df = pd.DataFrame(results_list)
    
    # Sort by absolute value of t-statistic
    results_df = results_df.sort_values("T-stat", key=abs, ascending=False)
    
    return results_df