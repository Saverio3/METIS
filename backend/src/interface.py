"""
Interface functions for the econometric tool.
These are simple wrappers around the core functionality.
"""

import sys
import os
import pandas as pd
import traceback
import ipywidgets as widgets
from IPython.display import display, clear_output

# Global variables to hold state
_model = None
_loader = None
_filtered_data = None

def set_globals(model=None, loader=None, filtered_data=None):
    """Set global variables for the interface."""
    global _model, _loader, _filtered_data
    if model is not None:
        _model = model
    if loader is not None:
        _loader = loader
    if filtered_data is not None:
        _filtered_data = filtered_data

def get_globals():
    """Get global variables from the interface."""
    return _model, _loader, _filtered_data

def load_data(file_path=None):
    """
    Load data from a file.
    
    Parameters:
    -----------
    file_path : str, optional
        Path to the data file. If None, prompts for input.
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    global _loader, _filtered_data
    
    from src.data_loader import DataLoader
    
    if _loader is None:
        _loader = DataLoader()
    
    if file_path is None:
        file_path = input("Enter path to data file: ")
    
    success = _loader.load_data(file_path)
    
    if success:
        print("Data loaded successfully!")
        
        # Display summary of loaded data
        summary = _loader.get_summary()
        print(f"\nFile: {summary['file_name']}")
        print(f"Observations: {summary['n_observations']}")
        print(f"Date range: {summary['date_range']}")
        print(f"Number of variables: {summary['variables']}")
        print(f"Variable names: {', '.join(summary['variable_names'])}")
        
        # Display transformation info if available
        transformations = _loader.get_transformations()
        if transformations:
            print(f"\nTransformations loaded for {len(transformations)} variables")
            print("Examples:")
            
            # Show a few examples of transformations
            for i, (var, trans) in enumerate(transformations.items()):
                print(f"  {var}: {trans}")
                if i >= 4:  # Show max 5 examples
                    remaining = len(transformations) - 5
                    if remaining > 0:
                        print(f"  ... and {remaining} more")
                    break
        
        # Display the first few rows
        print("\nFirst 5 rows of data:")
        display(_loader.get_data().head())
    else:
        print("Failed to load data. Please check the file path and format.")
    
    return success

def filter_date(start_date=None, end_date=None):
    """
    Filter data by date range.
    
    Parameters:
    -----------
    start_date : str, optional
        Start date (YYYY-MM-DD)
    end_date : str, optional
        End date (YYYY-MM-DD)
    
    Returns:
    --------
    pandas.DataFrame
        Filtered data
    """
    global _loader, _filtered_data
    
    if _loader is None or _loader.get_data() is None:
        print("No data loaded. Please load data first.")
        return None
    
    if start_date is None:
        start_date = input("Enter start date (YYYY-MM-DD) or leave blank for no lower bound: ")
    
    if end_date is None:
        end_date = input("Enter end date (YYYY-MM-DD) or leave blank for no upper bound: ")
    
    _filtered_data = _loader.filter_date_range(
        start_date if start_date else None, 
        end_date if end_date else None
    )
    
    if _filtered_data is not None:
        print(f"Data filtered from {start_date or 'beginning'} to {end_date or 'end'}")
        print(f"Number of observations: {len(_filtered_data)}")
        display(_filtered_data.head())
    
    return _filtered_data

# Apply enhancements to the LinearModel class
try:
    from src.compatibility import enhance_model_class
    enhance_model_class()
except ImportError:
    pass

def create_model(model_name=None, kpi=None):
    """
    Create a new model.
    
    Parameters:
    -----------
    model_name : str, optional
        Name for the model
    kpi : str, optional
        Name of the KPI variable
    
    Returns:
    --------
    LinearModel
        The created model
    """
    global _model, _loader, _filtered_data
    
    from src.linear_models import LinearModel
    import pandas as pd
    
    # Use filtered data if available, otherwise use the full dataset
    data_to_use = _filtered_data if _filtered_data is not None else _loader.get_data()
    
    if data_to_use is None:
        print("No data available. Please load data first.")
        return None
    
    # Get user input if not provided
    if model_name is None:
        model_name = input("Enter model name: ")
    
    if kpi is None:
        # Display available variables
        print("\nAvailable variables:")
        for var in _loader.get_variable_names():
            print(f"  {var}")
        
        # Get KPI selection by name
        kpi = input("\nEnter the name of the KPI variable: ").strip()
    
    if kpi not in _loader.get_variable_names():
        print(f"Error: Variable '{kpi}' not found in the data.")
        return None
    
    # Create a new model with data loader for transformations
    _model = LinearModel(name=model_name, loader=_loader)
    
    # Set the data
    _model.set_data(data_to_use)
    
    # Set the KPI
    _model.set_kpi(kpi)
    
    # Update transformations from the data loader
    if hasattr(_model, 'update_transformations_from_loader'):
        _model.update_transformations_from_loader()
    
    # Apply transformations to the model data
    if hasattr(_model, 'apply_loader_transformations'):
        _model.apply_loader_transformations()
    
    # Display model summary
    try:
        # Try to use the get_summary method if it exists
        if hasattr(_model, 'get_summary'):
            from IPython.display import display
            display(_model.get_summary())
        else:
            # Fall back to displaying a basic summary
            print(f"Model created: {model_name}")
            print(f"KPI: {kpi}")
            print(f"Data shape: {data_to_use.shape}")
    except Exception as e:
        print(f"Warning: Could not display model summary: {str(e)}")
    
    return _model

def add_var(variables=None, adstock_rates=None):
    """
    Add variables to the model.
    
    Parameters:
    -----------
    variables : str or list, optional
        Variable name(s) to add. If None, prompts for input.
    adstock_rates : str or list, optional
        Adstock rate(s) for the variables. If None, prompts for input.
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    global _model
    
    if _model is None:
        print("No model to add variables to. Please create or load a model first.")
        return False
    
    from src.model_operations import add_variables_to_model
    import ipywidgets as widgets
    from IPython.display import display, HTML, clear_output
    import pandas as pd
    
    # Process variable names
    if variables is None:
        # Get user input for variables
        print("Enter variable names to add, separated by commas:")
        var_input = input()
        variable_names = [var.strip() for var in var_input.split(',') if var.strip()]
    elif isinstance(variables, str):
        variable_names = [variables.strip()]
    else:
        variable_names = variables
    
    if not variable_names:
        print("No valid variable names entered.")
        return False
    
    # Process adstock rates
    if adstock_rates is None:
        # Get adstock rates
        print("\nEnter adstock rates for each variable (0-100%, where 0 means no adstock).")
        print("Use the same order as variables, separated by commas. Leave blank for all zeros:")
        adstock_input = input()
        
        if adstock_input.strip():
            try:
                adstock_rates = [float(rate.strip())/100 for rate in adstock_input.split(',')]
                
                # If fewer adstock rates than variables, pad with zeros
                if len(adstock_rates) < len(variable_names):
                    adstock_rates.extend([0] * (len(variable_names) - len(adstock_rates)))
            except:
                print("Invalid adstock rates. Using zeros instead.")
                adstock_rates = [0] * len(variable_names)
        else:
            adstock_rates = [0] * len(variable_names)
    elif isinstance(adstock_rates, str):
        # Convert string to list, assuming comma-separated values
        try:
            adstock_rates = [float(rate.strip())/100 for rate in adstock_rates.split(',')]
        except:
            print("Invalid adstock rates. Using zeros instead.")
            adstock_rates = [0] * len(variable_names)
    elif isinstance(adstock_rates, (int, float)):
        # Single number provided
        adstock_rates = [float(adstock_rates)/100] * len(variable_names)
    
    # Ensure length matches
    if len(adstock_rates) < len(variable_names):
        adstock_rates.extend([0] * (len(variable_names) - len(adstock_rates)))
    
    # Preview the changes
    _, comparison_df, preview_model = add_variables_to_model(_model, variable_names, adstock_rates)
    
    if comparison_df is not None:
        # Calculate percentage changes
        if 'Coef Change' in comparison_df.columns and 'Coef Change %' not in comparison_df.columns:
            comparison_df['Coef Change %'] = comparison_df.apply(
                lambda row: (row['New Coefficient'] / row['Coefficient'] - 1) * 100 
                if pd.notnull(row['Coefficient']) and pd.notnull(row['New Coefficient']) and row['Coefficient'] != 0
                else None, 
                axis=1
            )
            comparison_df = comparison_df.drop('Coef Change', axis=1)
            
        if 'T-stat Change' in comparison_df.columns and 'T-stat Change %' not in comparison_df.columns:
            comparison_df['T-stat Change %'] = comparison_df.apply(
                lambda row: (row['New T-statistic'] / row['T-statistic'] - 1) * 100 
                if pd.notnull(row['T-statistic']) and pd.notnull(row['New T-statistic']) and row['T-statistic'] != 0
                else None, 
                axis=1
            )
            comparison_df = comparison_df.drop('T-stat Change', axis=1)

        # Create a wrapper div for the output
        output_div = widgets.Output()
        
        # Create confirmation buttons using ipywidgets
        confirm_button = widgets.Button(
            description='Confirm',
            button_style='success',
            layout=widgets.Layout(width='100px')
        )
        
        cancel_button = widgets.Button(
            description='Cancel',
            button_style='danger',
            layout=widgets.Layout(width='100px')
        )
        
        # Output area for messages after button click
        result_output = widgets.Output()
        
        with output_div:
            print("\nModel Comparison:")
            
            # Display DataFrame with styling
            styled_df = comparison_df.style.apply(style_comparison_table, axis=1).set_table_styles([
                {'selector': 'thead th', 'props': [('background-color', '#444'), 
                                                ('color', 'white'),
                                                ('font-weight', 'bold')]},
                {'selector': 'table', 'props': [('width', '100%')]},
                {'selector': 'th, td', 'props': [('text-align', 'right'),
                                               ('padding', '8px 12px'),
                                               ('border-bottom', '1px solid #ddd')]}
            ]).format({
                'Coef Change %': '{:.2f}%',
                'T-stat Change %': '{:.2f}%'
            })
            
            display(styled_df)
            
            # Display buttons
            button_box = widgets.HBox([cancel_button, confirm_button])
            display(button_box)
            
            # Print instruction
            print("Click 'Confirm' to accept changes or 'Cancel' to discard them.")
        
        # Display the output div
        display(output_div)
        display(result_output)
        
        # Define button click handlers
        def on_confirm_clicked(b):
            global _model
            # Clear the output div
            output_div.clear_output()
            
            # Update the model
            _model = preview_model
            
            # Show success message in the result output
            with result_output:
                clear_output(wait=True)
                print("Variables added successfully.")
            
            # Disable buttons
            confirm_button.disabled = True
            cancel_button.disabled = True
        
        def on_cancel_clicked(b):
            # Clear the output div
            output_div.clear_output()
            
            # Show cancel message in the result output
            with result_output:
                clear_output(wait=True)
                print("Changes discarded.")
            
            # Disable buttons
            confirm_button.disabled = True
            cancel_button.disabled = True
        
        # Connect the callbacks
        confirm_button.on_click(on_confirm_clicked)
        cancel_button.on_click(on_cancel_clicked)
        
        # Let the user interact with the widgets, the function returns immediately
        return True  # The function returns but the UI remains interactive
    else:
        print("No preview available.")
        return False


def remove_var(variables=None):
    """
    Remove variables from the model.
    
    Parameters:
    -----------
    variables : str or list, optional
        Variable name(s) to remove. If None, prompts for input.
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    global _model
    
    if _model is None:
        print("No model to remove variables from. Please create or load a model first.")
        return False
    
    from src.model_operations import remove_variables_from_model
    import ipywidgets as widgets
    from IPython.display import display, HTML, clear_output
    import pandas as pd
    
    # Show current variables in the model
    print("Current variables in the model:")
    for feature in _model.features:
        trans = _model.feature_transformations.get(feature, "None")
        print(f"  {feature} [Transformation: {trans}]")
    
    # Process variable names
    if variables is None:
        # Get user input for variables to remove
        print("\nEnter variable names to remove, separated by commas:")
        var_input = input()
        variable_names = [var.strip() for var in var_input.split(',') if var.strip()]
    elif isinstance(variables, str):
        variable_names = [variables.strip()]
    else:
        variable_names = variables
    
    if not variable_names:
        print("No valid variable names entered.")
        return False
    
    # Preview the changes
    _, comparison_df, preview_model = remove_variables_from_model(_model, variable_names)
    
    if comparison_df is not None:
        # Calculate percentage changes
        if 'Coef Change' in comparison_df.columns and 'Coef Change %' not in comparison_df.columns:
            comparison_df['Coef Change %'] = comparison_df.apply(
                lambda row: (row['New Coefficient'] / row['Coefficient'] - 1) * 100 
                if pd.notnull(row['Coefficient']) and pd.notnull(row['New Coefficient']) and row['Coefficient'] != 0
                else None, 
                axis=1
            )
            comparison_df = comparison_df.drop('Coef Change', axis=1)
            
        if 'T-stat Change' in comparison_df.columns and 'T-stat Change %' not in comparison_df.columns:
            comparison_df['T-stat Change %'] = comparison_df.apply(
                lambda row: (row['New T-statistic'] / row['T-statistic'] - 1) * 100 
                if pd.notnull(row['T-statistic']) and pd.notnull(row['New T-statistic']) and row['T-statistic'] != 0
                else None, 
                axis=1
            )
            comparison_df = comparison_df.drop('T-stat Change', axis=1)
            
        # Create a wrapper div for the output
        output_div = widgets.Output()
        
        # Create confirmation buttons using ipywidgets
        confirm_button = widgets.Button(
            description='Confirm',
            button_style='success',
            layout=widgets.Layout(width='100px')
        )
        
        cancel_button = widgets.Button(
            description='Cancel',
            button_style='danger',
            layout=widgets.Layout(width='100px')
        )
        
        # Output area for messages after button click
        result_output = widgets.Output()
        
        with output_div:
            print("\nModel Comparison:")
            
            # Display DataFrame with styling
            styled_df = comparison_df.style.apply(style_comparison_table, axis=1).set_table_styles([
                {'selector': 'thead th', 'props': [('background-color', '#444'), 
                                                ('color', 'white'),
                                                ('font-weight', 'bold')]},
                {'selector': 'table', 'props': [('width', '100%')]},
                {'selector': 'th, td', 'props': [('text-align', 'right'),
                                               ('padding', '8px 12px'),
                                               ('border-bottom', '1px solid #ddd')]}
            ]).format({
                'Coef Change %': '{:.2f}%',
                'T-stat Change %': '{:.2f}%'
            })
            
            display(styled_df)
            
            # Display buttons
            button_box = widgets.HBox([cancel_button, confirm_button])
            display(button_box)
            
            # Print instruction
            print("Click 'Confirm' to accept changes or 'Cancel' to discard them.")
        
        # Display the output div
        display(output_div)
        display(result_output)
        
        # Define button click handlers
        def on_confirm_clicked(b):
            global _model
            # Clear the output div
            output_div.clear_output()
            
            # Update the model
            _model = preview_model
            
            # Show success message in the result output
            with result_output:
                clear_output(wait=True)
                print("Variables removed successfully.")
            
            # Disable buttons
            confirm_button.disabled = True
            cancel_button.disabled = True
        
        def on_cancel_clicked(b):
            # Clear the output div
            output_div.clear_output()
            
            # Show cancel message in the result output
            with result_output:
                clear_output(wait=True)
                print("Changes discarded.")
            
            # Disable buttons
            confirm_button.disabled = True
            cancel_button.disabled = True
        
        # Connect the callbacks
        confirm_button.on_click(on_confirm_clicked)
        cancel_button.on_click(on_cancel_clicked)
        
        # Let the user interact with the widgets, the function returns immediately
        return True  # The function returns but the UI remains interactive
    else:
        print("No preview available.")
        return False

def swap_vars(vars_to_remove=None, vars_to_add=None, adstock_rates=None):
    """
    Remove some variables from the model and add others in a single operation.
    
    Parameters:
    -----------
    vars_to_remove : str or list, optional
        Variable name(s) to remove from the model. If None, prompts for input.
    vars_to_add : str or list, optional
        Variable name(s) to add to the model. If None, prompts for input.
    adstock_rates : str, list, or float, optional
        Adstock rate(s) for the variables to add. If None, prompts for input.
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    global _model
    
    if _model is None:
        print("No model to modify. Please create or load a model first.")
        return False
    
    from src.model_operations import remove_variables_from_model, add_variables_to_model
    import ipywidgets as widgets
    from IPython.display import display, HTML, clear_output
    import pandas as pd
    
    # Process variables to remove
    if vars_to_remove is None:
        # Show current variables in the model
        print("Current variables in the model:")
        for feature in _model.features:
            trans = _model.feature_transformations.get(feature, "None")
            print(f"  {feature} [Transformation: {trans}]")
            
        # Get user input for variables to remove
        print("\nEnter variable names to remove, separated by commas:")
        var_input = input()
        vars_to_remove = [var.strip() for var in var_input.split(',') if var.strip()]
    elif isinstance(vars_to_remove, str):
        vars_to_remove = [vars_to_remove.strip()]
    
    # Process variables to add
    if vars_to_add is None:
        # Show available variables not in the model
        available_vars = []
        if hasattr(_model, 'model_data'):
            available_vars = [var for var in _model.model_data.columns 
                             if var != _model.kpi and var not in _model.features]
            
        print("\nAvailable variables to add:")
        for var in available_vars:
            print(f"  {var}")
            
        # Get user input for variables to add
        print("\nEnter variable names to add, separated by commas:")
        var_input = input()
        vars_to_add = [var.strip() for var in var_input.split(',') if var.strip()]
    elif isinstance(vars_to_add, str):
        vars_to_add = [vars_to_add.strip()]
    
    # Process adstock rates for variables to add
    if adstock_rates is None and vars_to_add:
        # Get adstock rates
        print("\nEnter adstock rates for each variable to add (0-100%, where 0 means no adstock).")
        print("Use the same order as variables, separated by commas. Leave blank for all zeros:")
        adstock_input = input()
        
        if adstock_input.strip():
            try:
                adstock_rates = [float(rate.strip())/100 for rate in adstock_input.split(',')]
                
                # If fewer adstock rates than variables, pad with zeros
                if len(adstock_rates) < len(vars_to_add):
                    adstock_rates.extend([0] * (len(vars_to_add) - len(adstock_rates)))
            except:
                print("Invalid adstock rates. Using zeros instead.")
                adstock_rates = [0] * len(vars_to_add)
        else:
            adstock_rates = [0] * len(vars_to_add)
    elif isinstance(adstock_rates, str):
        # Convert string to list, assuming comma-separated values
        try:
            adstock_rates = [float(rate.strip())/100 for rate in adstock_rates.split(',')]
        except:
            print("Invalid adstock rates. Using zeros instead.")
            adstock_rates = [0] * len(vars_to_add)
    elif isinstance(adstock_rates, (int, float)):
        # Single number provided
        adstock_rates = [float(adstock_rates)/100] * len(vars_to_add)
    
    # Ensure adstock_rates length matches vars_to_add length
    if adstock_rates is not None and len(adstock_rates) < len(vars_to_add):
        adstock_rates.extend([0] * (len(vars_to_add) - len(adstock_rates)))
    
    # Create a copy of the current model for preview
    import copy
    preview_model = copy.deepcopy(_model)
    
    # Get original model info before any changes
    original_params = _model.results.params.copy() if _model.results is not None else {}
    original_tvalues = _model.results.tvalues.copy() if _model.results is not None else {}
    
    # Store original values for variables that will be removed
    removed_vars_data = []
    for var in vars_to_remove:
        if var in original_params:
            removed_vars_data.append({
                'Variable': var,
                'Coefficient': original_params[var],
                'T-statistic': original_tvalues[var],
                'New Coefficient': None,
                'New T-statistic': None,
                'Coef Change %': None,
                'T-stat Change %': None
            })
    
    # First, remove variables
    if vars_to_remove:
        # Remove variables from the preview model
        _, comparison_after_remove, preview_model = remove_variables_from_model(preview_model, vars_to_remove)
        
        if comparison_after_remove is None:
            print("Error removing variables. Operation aborted.")
            return False
    
    # Then, add variables
    if vars_to_add:
        # Add variables to the preview model
        _, comparison_df, preview_model = add_variables_to_model(preview_model, vars_to_add, adstock_rates)
        
        if comparison_df is None:
            print("Error adding variables. Operation aborted.")
            return False
    else:
        # If no variables to add, use the comparison from remove operation
        comparison_df = comparison_after_remove
    
    # Calculate percentage changes if needed
    if 'Coef Change' in comparison_df.columns and 'Coef Change %' not in comparison_df.columns:
        comparison_df['Coef Change %'] = comparison_df.apply(
            lambda row: (row['New Coefficient'] / row['Coefficient'] - 1) * 100 
            if pd.notnull(row['Coefficient']) and pd.notnull(row['New Coefficient']) and row['Coefficient'] != 0
            else None, 
            axis=1
        )
        if 'Coef Change' in comparison_df.columns:
            comparison_df = comparison_df.drop('Coef Change', axis=1)
        
    if 'T-stat Change' in comparison_df.columns and 'T-stat Change %' not in comparison_df.columns:
        comparison_df['T-stat Change %'] = comparison_df.apply(
            lambda row: (row['New T-statistic'] / row['T-statistic'] - 1) * 100 
            if pd.notnull(row['T-statistic']) and pd.notnull(row['New T-statistic']) and row['T-statistic'] != 0
            else None, 
            axis=1
        )
        if 'T-stat Change' in comparison_df.columns:
            comparison_df = comparison_df.drop('T-stat Change', axis=1)
    
    # Append data for removed variables to the comparison DataFrame
    if removed_vars_data and len(removed_vars_data) > 0:
        # Convert lists of dictionaries to DataFrames
        # This avoids the empty DataFrame warning
        if len(comparison_df) > 0 and len(removed_vars_data) > 0:
            # Get the desired column order
            columns = ["Variable", "Coefficient", "T-statistic", 
                       "New Coefficient", "New T-statistic", 
                       "Coef Change %", "T-stat Change %"]
            
            # Filter to include only columns that exist
            existing_columns = [col for col in columns if col in comparison_df.columns]
            
            # Convert removed_vars_data to DataFrame with the same columns
            removed_df = pd.DataFrame(removed_vars_data)
            
            # Make sure both DataFrames have the same columns in the same order
            for col in existing_columns:
                if col not in removed_df:
                    removed_df[col] = "-"
                
            # Reorder to match the original column order
            removed_df = removed_df[existing_columns]
            comparison_df = comparison_df[existing_columns]
            
            # Use list append instead of concat to avoid the warning
            all_rows = []
            for _, row in comparison_df.iterrows():
                all_rows.append(row.to_dict())
            for _, row in removed_df.iterrows():
                all_rows.append(row.to_dict())
            
            # Create new DataFrame from the combined rows
            comparison_df = pd.DataFrame(all_rows)
    
    # Create a wrapper div for the output
    output_div = widgets.Output()
    
    # Create confirmation buttons using ipywidgets
    confirm_button = widgets.Button(
        description='Confirm',
        button_style='success',
        layout=widgets.Layout(width='100px')
    )
    
    cancel_button = widgets.Button(
        description='Cancel',
        button_style='danger',
        layout=widgets.Layout(width='100px')
    )
    
    # Output area for messages after button click
    result_output = widgets.Output()
    
    with output_div:
        # Create operation description
        if vars_to_remove and vars_to_add:
            print(f"\nSwapping variables: Removing {len(vars_to_remove)} variable(s) and Adding {len(vars_to_add)} variable(s)")
            print(f"  Variables to remove: {', '.join(vars_to_remove)}")
            print(f"  Variables to add: {', '.join(vars_to_add)}")
        elif vars_to_remove:
            print(f"\nRemoving {len(vars_to_remove)} variable(s): {', '.join(vars_to_remove)}")
        elif vars_to_add:
            print(f"\nAdding {len(vars_to_add)} variable(s): {', '.join(vars_to_add)}")
            
        print("\nModel Comparison:")
        
        # Display DataFrame with styling
        styled_df = comparison_df.style.apply(style_comparison_table, axis=1).set_table_styles([
            {'selector': 'thead th', 'props': [('background-color', '#444'), 
                                            ('color', 'white'),
                                            ('font-weight', 'bold')]},
            {'selector': 'table', 'props': [('width', '100%')]},
            {'selector': 'th, td', 'props': [('text-align', 'right'),
                                           ('padding', '8px 12px'),
                                           ('border-bottom', '1px solid #ddd')]}
        ]).format({
            'Coef Change %': '{:.2f}%',
            'T-stat Change %': '{:.2f}%'
        })
        
        display(styled_df)
        
        # Display buttons
        button_box = widgets.HBox([cancel_button, confirm_button])
        display(button_box)
        
        # Print instruction
        print("Click 'Confirm' to accept changes or 'Cancel' to discard them.")
    
    # Display the output div
    display(output_div)
    display(result_output)
    
    # Define button click handlers
    def on_confirm_clicked(b):
        global _model
        # Clear the output div
        output_div.clear_output()
        
        # Update the model
        _model = preview_model
        
        # Show success message in the result output
        with result_output:
            clear_output(wait=True)
            
            if vars_to_remove and vars_to_add:
                removed_str = ", ".join(vars_to_remove)
                added_str = ", ".join(vars_to_add)
                print(f"Successfully swapped variables: Removed [{removed_str}] and Added [{added_str}]")
            elif vars_to_remove:
                removed_str = ", ".join(vars_to_remove)
                print(f"Successfully removed variables: [{removed_str}]")
            elif vars_to_add:
                added_str = ", ".join(vars_to_add)
                print(f"Successfully added variables: [{added_str}]")
        
        # Disable buttons
        confirm_button.disabled = True
        cancel_button.disabled = True
    
    def on_cancel_clicked(b):
        # Clear the output div
        output_div.clear_output()
        
        # Show cancel message in the result output
        with result_output:
            clear_output(wait=True)
            print("Changes discarded.")
        
        # Disable buttons
        confirm_button.disabled = True
        cancel_button.disabled = True
    
    # Connect the callbacks
    confirm_button.on_click(on_confirm_clicked)
    cancel_button.on_click(on_cancel_clicked)
    
    # Let the user interact with the widgets, the function returns immediately
    return True    

def style_comparison_table(row):
    """
    Apply styling to DataFrame rows for model comparison tables.
    
    Parameters:
    -----------
    row : pandas.Series
        A row from the comparison DataFrame
    
    Returns:
    --------
    list
        List of CSS style strings for each cell
    """
    import pandas as pd
    import numpy as np
    
    styles = [''] * len(row)
    
    # Define indices for columns in the row
    var_idx = row.index.get_loc('Variable') if 'Variable' in row.index else None
    coef_idx = row.index.get_loc('Coefficient') if 'Coefficient' in row.index else None
    tstat_idx = row.index.get_loc('T-statistic') if 'T-statistic' in row.index else None
    new_coef_idx = row.index.get_loc('New Coefficient') if 'New Coefficient' in row.index else None
    new_tstat_idx = row.index.get_loc('New T-statistic') if 'New T-statistic' in row.index else None
    coef_change_pct_idx = row.index.get_loc('Coef Change %') if 'Coef Change %' in row.index else None
    tstat_change_pct_idx = row.index.get_loc('T-stat Change %') if 'T-stat Change %' in row.index else None
    
    # Style for variable name
    if var_idx is not None:
        styles[var_idx] = 'background-color: #444; color: white; font-weight: bold;'
    
    # Coefficient coloring
    if coef_idx is not None and pd.notnull(row.iloc[coef_idx]):
        if row.iloc[coef_idx] > 0:
            styles[coef_idx] = 'color: #28a745;'
        else:
            styles[coef_idx] = 'color: #dc3545;'
    
    if new_coef_idx is not None and pd.notnull(row.iloc[new_coef_idx]):
        if row.iloc[new_coef_idx] > 0:
            styles[new_coef_idx] = 'color: #28a745;'
        else:
            styles[new_coef_idx] = 'color: #dc3545;'
    
    # T-statistic significance coloring
    if tstat_idx is not None and pd.notnull(row.iloc[tstat_idx]):
        if abs(row.iloc[tstat_idx]) > 1.96:
            if coef_idx is not None and pd.notnull(row.iloc[coef_idx]) and row.iloc[coef_idx] > 0:
                styles[tstat_idx] = 'background-color: #d4edda; color: #155724;'
            else:
                styles[tstat_idx] = 'background-color: #f8d7da; color: #721c24;'
    
    if new_tstat_idx is not None and pd.notnull(row.iloc[new_tstat_idx]):
        if abs(row.iloc[new_tstat_idx]) > 1.96:
            if new_coef_idx is not None and pd.notnull(row.iloc[new_coef_idx]) and row.iloc[new_coef_idx] > 0:
                styles[new_tstat_idx] = 'background-color: #d4edda; color: #155724;'
            else:
                styles[new_tstat_idx] = 'background-color: #f8d7da; color: #721c24;'
    
    # Style coefficient change percentage
    if coef_change_pct_idx is not None and pd.notnull(row.iloc[coef_change_pct_idx]):
        pct_change = row.iloc[coef_change_pct_idx]
        
        if abs(pct_change) >= 50:
            if pct_change > 0:
                styles[coef_change_pct_idx] = 'background-color: #d4edda; color: #155724; font-weight: bold;'
            else:
                styles[coef_change_pct_idx] = 'background-color: #f8d7da; color: #721c24; font-weight: bold;'
        elif abs(pct_change) >= 15:
            styles[coef_change_pct_idx] = 'background-color: #fff3cd; color: #856404;'
    
    # Style T-stat change percentage
    if tstat_change_pct_idx is not None and pd.notnull(row.iloc[tstat_change_pct_idx]):
        pct_change = row.iloc[tstat_change_pct_idx]
        
        if abs(pct_change) >= 50:
            if pct_change > 0:
                styles[tstat_change_pct_idx] = 'background-color: #d4edda; color: #155724; font-weight: bold;'
            else:
                styles[tstat_change_pct_idx] = 'background-color: #f8d7da; color: #721c24; font-weight: bold;'
        elif abs(pct_change) >= 15:
            styles[tstat_change_pct_idx] = 'background-color: #fff3cd; color: #856404;'
    
    return styles

def show_model():
    """
    Display the current model with improved styling.
    
    Returns:
    --------
    None
    """
    global _model
    
    if _model is None:
        print("No model to display. Please create or load a model first.")
        return None
    
    from src.model_operations import display_model_summary
    
    # Get the model summary with improved styling but don't return DataFrames
    # to avoid the extra output in the notebook
    display_model_summary(_model, return_dataframes=False)
    
    return None

def save_model(file_path=None):
    """
    Save the current model to a file.
    
    Parameters:
    -----------
    file_path : str, optional
        Path where to save the model. If None, uses default location.
    
    Returns:
    --------
    str
        Path to the saved model file
    """
    global _model
    
    if _model is None:
        print("No model to save. Please create or load a model first.")
        return None
    
    if file_path is None:
        file_path = input("Enter file path to save model (or leave blank for default): ")
    
    if file_path:
        saved_path = _model.save_model(file_path=file_path)
    else:
        saved_path = _model.save_model()
    
    if saved_path:
        print(f"Model saved successfully to {saved_path}")
    
    # If successful, also save weighted variables
    if saved_path:
        try:
            from src.weighted_variables import save_weighted_vars_to_file
            if _model and hasattr(_model, 'wgtd_variables') and _model.wgtd_variables:
                save_weighted_vars_to_file(_model)
        except Exception as e:
            print(f"Warning: Failed to save weighted variables: {str(e)}")
    
    return saved_path

def load_data(file_path=None):
    """
    Load data from a file.
    
    Parameters:
    -----------
    file_path : str, optional
        Path to the data file. If None, prompts for input.
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    global _loader, _filtered_data
    
    from src.data_loader import DataLoader
    
    if _loader is None:
        _loader = DataLoader()
    
    if file_path is None:
        file_path = input("Enter path to data file: ")
    
    success = _loader.load_data(file_path)
    
    if success:
        print("Data loaded successfully!")
        
        # Display summary of loaded data
        summary = _loader.get_summary()
        print(f"\nFile: {summary['file_name']}")
        print(f"Observations: {summary['n_observations']}")
        print(f"Date range: {summary['date_range']}")
        print(f"Number of variables: {summary['variables']}")
        
        # Don't show the full list of variable names
        # Just print that variables were loaded
        print(f"Loaded {summary['variables']} variables.")
        
        # Display transformation info if available
        transformations = _loader.get_transformations()
        if transformations:
            print(f"\nTransformations loaded for {len(transformations)} variables")
            print("Examples:")
            
            # Show a few examples of transformations
            for i, (var, trans) in enumerate(transformations.items()):
                print(f"  {var}: {trans}")
                if i >= 4:  # Show max 5 examples
                    remaining = len(transformations) - 5
                    if remaining > 0:
                        print(f"  ... and {remaining} more")
                    break
        
        # Display the first few rows
        print("\nFirst 5 rows of data:")
        display(_loader.get_data().head())
    else:
        print("Failed to load data. Please check the file path and format.")
    
    return success

def export_excel(file_path=None, include_decomp=True):
    """
    Export the current model to Excel.
    
    Parameters:
    -----------
    file_path : str, optional
        Path where to save the Excel file. If None, prompts for input.
    include_decomp : bool, optional
        Whether to include decomposition sheets in the export
        
    Returns:
    --------
    str
        Path to the saved Excel file
    """
    global _model
    
    if _model is None:
        print("No model to export. Please create or load a model first.")
        return None
    
    from src.model_export import export_model_to_excel
    
    if file_path is None:
        file_path = input("Enter file path for Excel export (or leave blank for default): ")
    
    # Call the export function with the include_decomp parameter
    if file_path:
        excel_path = export_model_to_excel(_model, file_path, include_decomp)
    else:
        excel_path = export_model_to_excel(_model, include_decomp=include_decomp)
    
    if excel_path:
        print(f"Excel file created at: {excel_path}")
        if include_decomp:
            print("The Excel file includes decomposition sheets with group and variable decompositions.")
        print("You can now share this Excel file or use it for reference.")
    
    # If successful, also export weighted variables
    if excel_path:
        try:
            from src.model_export import export_weighted_variables
            if _model and hasattr(_model, 'wgtd_variables') and _model.wgtd_variables:
                export_weighted_variables(_model, excel_path)
        except Exception as e:
            print(f"Warning: Failed to export weighted variables: {str(e)}")
    
    return excel_path

def import_excel(file_path=None):
    """
    Import model from Excel.
    
    Parameters:
    -----------
    file_path : str, optional
        Path to the Excel file. If None, prompts for input.
    
    Returns:
    --------
    LinearModel
        The imported model
    """
    global _model, _loader, _filtered_data
    
    if _loader is None or _loader.get_data() is None:
        print("No data loaded. Please load data first.")
        return None
    
    from src.model_export import import_model_from_excel
    
    if file_path is None:
        file_path = input("Enter path to Excel model specification file: ")
    
    _model = import_model_from_excel(_loader, _filtered_data, file_path)
    
    # Set data loader reference for transformations
    if _model is not None:
        _model.set_data_loader(_loader)
    
    # If successful, also import weighted variables
    if _model:
        try:
            from src.model_export import import_weighted_variables
            import_weighted_variables(_model, file_path)
        except Exception as e:
            print(f"Warning: Failed to import weighted variables: {str(e)}")
    
    return _model

def results_to_html_table(df):
    """
    Convert DataFrame of test results to a custom HTML table.
    
    Parameters:
    -----------
    df : pandas.DataFrame
        DataFrame containing test results
    
    Returns:
    --------
    str
        HTML string for the table with styling and sorting
    """
    try:
        from src.table_styles import get_results_table_html
        
        # Define initial and detail columns based on the specified order
        initial_columns = [
            "Variable", "Coefficient", "T-stat", 
            "R² Increase", "VIF", "Impact % of KPI"
        ]
        
        detail_columns = ["Correlation", "Corr. with Residuals"]
        
        # Check which columns actually exist in the DataFrame
        existing_initial = [col for col in initial_columns if col in df.columns]
        existing_detail = [col for col in detail_columns if col in df.columns]
        
        # Generate HTML table with max 20 rows before scrolling
        html_table = get_results_table_html(
            df, 
            initial_columns=existing_initial,
            detail_columns=existing_detail,
            max_rows=20
        )
        
        return html_table
        
    except ImportError:
        # Fall back to a simpler implementation if table_styles not available
        # Reset index to make sure it's sequential
        df = df.reset_index(drop=True)
        
        # Define columns in the desired order
        initial_columns = [
            "Variable", "Coefficient", "T-stat", 
            "R² Increase", "VIF", "Impact % of KPI"
        ]
        
        detail_columns = ["Correlation", "Corr. with Residuals"]
        
        # Check which columns actually exist in the DataFrame
        existing_initial = [col for col in initial_columns if col in df.columns]
        existing_detail = [col for col in detail_columns if col in df.columns]
        
        all_columns = existing_initial + existing_detail
        
        # Start building the HTML
        html = """
        <style>
        #results-table-container {
            max-width: 100%;
            overflow-x: auto;
            position: relative;
        }
        
        #results-table-wrapper {
            max-height: 780px; /* Approx. row height * 20 rows */
            overflow-y: auto;
            margin-bottom: 10px;
        }
        
        #results-table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial, sans-serif;
            table-layout: fixed;
        }
        
        #results-table th, #results-table td {
            padding: 8px 12px;
            text-align: right;
            border-bottom: 1px solid #ddd;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        #results-table thead {
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        #results-table th {
            background-color: #444;
            color: white;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
            position: relative;
            z-index: 10;
        }
        
        #results-table th .resizer {
            position: absolute;
            top: 0;
            right: 0;
            width: 5px;
            height: 100%;
            background-color: transparent;
            cursor: col-resize;
            z-index: 10;
        }
        
        #results-table .variable-col {
            text-align: left;
            min-width: 200px;
            word-wrap: break-word;
            position: sticky;
            left: 0;
            background-color: #444;
            color: white;
            white-space: normal;
            z-index: 5;
        }
        
        #results-table th.variable-col {
            background-color: #444;
            color: white;
            z-index: 15;
        }
        
        #results-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        #results-table .positive-coef {
            color: #28a745;
        }
        
        #results-table .negative-coef {
            color: #dc3545;
        }
        
        #results-table .significant-positive {
            background-color: #d4edda;
            color: #155724;
        }
        
        #results-table .significant-negative {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .details-button {
            margin: 10px 0;
            padding: 8px 15px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .details-button:hover {
            background-color: #0069d9;
        }
        
        .detail-column {
            display: none;
        }
        </style>
        
        <div id="results-table-container">
        <button id="details-toggle" class="details-button">Show Details</button>
        """
        
        # Table wrapper for scrolling
        html += """
        <div id="results-table-wrapper">
        <table id="results-table">
        <thead>
            <tr>
        """
        
        # Add initial column headers
        for col in existing_initial:
            var_class = ' class="variable-col"' if col == 'Variable' else ''
            html += f'<th{var_class}>{col}<div class="resizer"></div></th>\n'
        
        # Add detail column headers (hidden initially)
        for col in existing_detail:
            html += f'<th class="detail-column">{col}<div class="resizer"></div></th>\n'
        
        html += """
            </tr>
        </thead>
        <tbody>
        """
        
        # Add each row
        for i, row in df.iterrows():
            # Determine row background color (needed for sticky positioning)
            bg_color = '#f9f9f9' if i % 2 == 1 else 'white'
            
            html += f'<tr>\n'
            
            # Add initial columns
            for col in existing_initial:
                if col not in row:
                    continue
                    
                value = row[col]
                
                # Format numeric values
                if isinstance(value, (int, float)):
                    cell_display = f"{value:.4f}"
                else:
                    cell_display = str(value)
                
                # Determine cell classes
                cell_class = ""
                
                # Variable column special handling
                if col == 'Variable':
                    cell_class = 'class="variable-col"'
                # Coefficient coloring
                elif col == 'Coefficient':
                    if value > 0:
                        cell_class = 'class="positive-coef"'
                    else:
                        cell_class = 'class="negative-coef"'
                # T-stat significance highlighting
                elif col == 'T-stat':
                    if abs(value) > 1.645 and row.get('Coefficient', 0) > 0:
                        cell_class = 'class="significant-positive"'
                    elif abs(value) > 1.645 and row.get('Coefficient', 0) < 0:
                        cell_class = 'class="significant-negative"'
                
                html += f'<td {cell_class}>{cell_display}</td>\n'
            
            # Add detail columns (hidden initially)
            for col in existing_detail:
                if col not in row:
                    continue
                    
                value = row[col]
                
                # Format numeric values
                if isinstance(value, (int, float)):
                    cell_display = f"{value:.4f}"
                else:
                    cell_display = str(value)
                
                html += f'<td class="detail-column">{cell_display}</td>\n'
            
            html += '</tr>\n'
        
        # Close the table
        html += """
        </tbody>
        </table>
        </div>
        </div>
        
        <script>
        (function() {
            // Add sorting functionality to table headers
            var table = document.getElementById('results-table');
            var headers = table.querySelectorAll('th');
            var tableBody = table.querySelector('tbody');
            
            // Column resizing functionality
            var resizers = table.querySelectorAll('.resizer');
            var currentResizer;
            
            // Set up column resizing
            [].forEach.call(resizers, function(resizer) {
                resizer.addEventListener('mousedown', function(e) {
                    currentResizer = e.target;
                    var th = e.target.parentElement;
                    
                    // Get the current width
                    var currentWidth = th.offsetWidth;
                    
                    // Calculate the starting position
                    var startX = e.pageX;
                    
                    // Add event listeners for mousemove and mouseup
                    document.addEventListener('mousemove', mousemove);
                    document.addEventListener('mouseup', mouseup);
                    
                    function mousemove(e) {
                        if (currentResizer) {
                            // Calculate the width change
                            var newWidth = currentWidth + (e.pageX - startX);
                            
                            // Set a minimum width to prevent columns from disappearing
                            if (newWidth > 50) {
                                th.style.width = newWidth + 'px';
                            }
                        }
                    }
                    
                    function mouseup() {
                        currentResizer = null;
                        document.removeEventListener('mousemove', mousemove);
                        document.removeEventListener('mouseup', mouseup);
                    }
                    
                    // Prevent text selection while resizing
                    e.preventDefault();
                });
            });
            
            // Sorting functionality
            headers.forEach(function(header, i) {
                header.addEventListener('click', function(e) {
                    // Make sure we're not clicking on the resizer
                    if (e.target.className === 'resizer') {
                        return;
                    }
                    
                    var sortDirection = this.getAttribute('data-sort-direction') === 'asc' ? 'desc' : 'asc';
                    
                    // Reset all headers
                    headers.forEach(function(h) {
                        h.removeAttribute('data-sort-direction');
                    });
                    
                    // Set current header as sorted
                    this.setAttribute('data-sort-direction', sortDirection);
                    
                    // Get rows and sort them
                    var rows = Array.from(tableBody.rows);
                    rows.sort(function(rowA, rowB) {
                        var cellA = rowA.cells[i].textContent.trim();
                        var cellB = rowB.cells[i].textContent.trim();
                        
                        // Convert to numbers if possible
                        var numA = parseFloat(cellA);
                        var numB = parseFloat(cellB);
                        
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return sortDirection === 'asc' ? numA - numB : numB - numA;
                        } else {
                            return sortDirection === 'asc' ? 
                                cellA.localeCompare(cellB) : 
                                cellB.localeCompare(cellA);
                        }
                    });
                    
                    // Rearrange rows based on sort
                    rows.forEach(function(row) {
                        tableBody.appendChild(row);
                    });
                });
            });
            
            // Toggle detail columns
            var toggleButton = document.getElementById('details-toggle');
            var detailColumns = document.querySelectorAll('.detail-column');
            
            toggleButton.addEventListener('click', function() {
                var isHidden = detailColumns[0].style.display === 'none' || detailColumns[0].style.display === '';
                
                detailColumns.forEach(function(element) {
                    element.style.display = isHidden ? 'table-cell' : 'none';
                });
                
                toggleButton.textContent = isHidden ? 'Hide Details' : 'Show Details';
            });
        })();
        </script>
        """
        
        return html

def test_var(variables=None, adstock_rates=None):
    """
    Test variables before adding to model.
    
    Parameters:
    -----------
    variables : str or list, optional
        Variable name(s) to test. If None, displays selector widget.
    adstock_rates : str or list, optional
        Adstock rate(s) for the variables. If None, prompts for input.
    
    Returns:
    --------
    pandas.DataFrame
        Test results
    """
    global _model, _loader
    
    if _model is None:
        print("No model to test variables with. Please create or load a model first.")
        return None
    
    try:
        from src.diagnostics import test_variables
        import ipywidgets as widgets
        from IPython.display import display, clear_output, HTML
        import pandas as pd
    except Exception as e:
        print(f"Error importing required modules: {str(e)}")
        print("Function not implemented yet. Coming soon!")
        return None
    
    # If variables are not provided, show the selector widget
    if variables is None:
        # Get available variables (excluding KPI and variables already in the model)
        available_vars = []
        
        # Include variables from data loader
        if _loader:
            available_vars.extend([var for var in _loader.get_variable_names() 
                                 if var != _model.kpi and var not in _model.features])
        
        # Include transformed variables from model data
        if _model and hasattr(_model, 'model_data'):
            model_vars = _model.model_data.columns
            available_vars.extend([var for var in model_vars 
                                 if var not in available_vars 
                                 and var != _model.kpi 
                                 and var not in _model.features])
        
        if not available_vars:
            print("No available variables to test.")
            return None
        
        # Create main output widget
        main_output = widgets.Output()
        
        # Create search box
        search_box = widgets.Text(
            value='',
            placeholder='Type to search variables...',
            description='Search:',
            disabled=False
        )
        
        # Create select all checkbox
        select_all = widgets.Checkbox(
            value=False,
            description='Select All',
            disabled=False
        )
        
        # Create checkboxes for each variable
        checkboxes = {}
        checkbox_widgets = []
        
        for var in available_vars:
            # Add transformation info if available
            trans_info = ""
            if _loader and hasattr(_loader, 'get_transformation'):
                trans = _loader.get_transformation(var)
                if trans:
                    trans_info = f" [{trans}]"
                    
            checkbox = widgets.Checkbox(value=False, description=f"{var}{trans_info}")
            checkboxes[var] = checkbox
            checkbox_widgets.append(checkbox)
        
        # Create checkbox container with scrolling
        checkbox_container = widgets.VBox(checkbox_widgets)
        
        # Create adstock input with description
        adstock_input = widgets.Text(
            value='0',
            placeholder='0,10,20,30',
            description='Adstock rates (%):',
            disabled=False,
            layout=widgets.Layout(width='50%')
        )
        
        # Create the test button
        test_button = widgets.Button(
            description='Test Selected Variables',
            button_style='success',
            tooltip='Test the selected variables'
        )
        
        # Create add button (hidden initially)
        add_button = widgets.Button(
            description='Add Selected to Model',
            button_style='info',
            tooltip='Add selected variables to the model',
            layout=widgets.Layout(display='none')
        )
        
        # Function to filter checkboxes based on search
        def filter_checkboxes(change):
            search_term = search_box.value.lower()
            filtered_widgets = []
            
            for var, checkbox in checkboxes.items():
                if search_term in var.lower() or search_term in checkbox.description.lower():
                    filtered_widgets.append(checkbox)
            
            checkbox_container.children = filtered_widgets
        
        # Function to handle select all
        def toggle_all(change):
            # Only apply to visible checkboxes (filtered by search)
            visible_checkboxes = checkbox_container.children
            for checkbox in visible_checkboxes:
                checkbox.value = select_all.value
        
        # Connect search and select all functions
        search_box.observe(filter_checkboxes, names='value')
        select_all.observe(toggle_all, names='value')
        
        # Add help text for adstock
        adstock_help = widgets.HTML(
            value="<small>Enter comma-separated adstock percentages to test multiple rates (e.g., 0,10,20,30)</small>"
        )
        
        # Create a container with all elements
        widget_box = widgets.VBox([
            widgets.HTML("<h3>Select Variables to Test</h3>"),
            widgets.HBox([search_box, select_all]),
            widgets.Box([checkbox_container], 
                       layout=widgets.Layout(
                           border='1px solid #ddd',
                           overflow_y='scroll',
                           height='200px',
                           width='100%'
                       )),
            adstock_input,
            adstock_help,
            test_button,
            add_button,
            main_output
        ])
        
        # Display the widget
        display(widget_box)
        
        # Apply the initial filter to show all variables
        filter_checkboxes({'new': ''})
        
        # Function to handle the test button click
        def on_test_button_clicked(b):
            with main_output:
                clear_output()
                
                # Get selected variables
                selected_vars = [var for var, checkbox in checkboxes.items() if checkbox.value]
                
                if not selected_vars:
                    print("No variables selected. Please select at least one variable.")
                    return
                
                # Process adstock rates
                adstock_text = adstock_input.value
                
                try:
                    # Parse adstock rates
                    adstock_rates = [float(rate.strip()) for rate in adstock_text.split(',') if rate.strip()]
                    if not adstock_rates:
                        adstock_rates = [0]  # Default to 0 if empty
                except:
                    print("Invalid adstock rates. Using 0% instead.")
                    adstock_rates = [0]
                
                # Create all combinations of variables and adstock rates
                test_vars = []
                test_adstocks = []
                var_to_adstock = {}  # To keep track of adstock rates for each variable
                
                for var in selected_vars:
                    for rate in adstock_rates:
                        test_vars.append(var)
                        test_adstocks.append(rate/100)  # Convert to decimal
                        
                        # Store for later reference
                        if var not in var_to_adstock:
                            var_to_adstock[var] = []
                        var_to_adstock[var].append(rate/100)
                
                # Run the test
                results_df = test_variables(_model, test_vars, test_adstocks)
                
                if results_df is not None:
                    # Convert the DataFrame to HTML with custom styling
                    html_table = results_to_html_table(results_df)
                    
                    # Display the table
                    display(HTML(html_table))
                    
                    # Show the add button
                    add_button.layout.display = 'block'
                    
                    # Store the results for later use when adding variables
                    add_button.var_to_adstock = var_to_adstock
                else:
                    print("Error testing variables. Please check your selections.")
        
        # Function to handle add button click
        def on_add_button_clicked(b):
            with main_output:
                clear_output()
                
                # Create multi-select for variables and adstock rates
                var_options = []
                
                # Create options for each variable with each tested adstock rate
                for var, adstock_rates in b.var_to_adstock.items():
                    # Get transformation info if available
                    trans_info = ""
                    if _loader and hasattr(_loader, 'get_transformation'):
                        trans = _loader.get_transformation(var)
                        if trans:
                            trans_info = f" [{trans}]"
                            
                    for rate in adstock_rates:
                        label = f"{var}{trans_info} (adstock {int(rate*100)}%)"
                        var_options.append((label, f"{var}|{rate}"))
                
                # Create multi-select widget
                var_select = widgets.SelectMultiple(
                    options=var_options,
                    description='Variables to add:',
                    disabled=False,
                    layout=widgets.Layout(width='70%', height='150px')
                )
                
                add_confirm = widgets.Button(
                    description='Add to Model',
                    button_style='success',
                    tooltip='Add these variables to the model'
                )
                
                display(widgets.VBox([
                    widgets.HTML("<h4>Select Variables to Add to Model</h4>"),
                    widgets.HTML("<p>Select one or more variables to add to your model:</p>"),
                    var_select,
                    add_confirm
                ]))
                
                def confirm_add(b):
                    selected = var_select.value
                    
                    if not selected:
                        print("No variables selected.")
                        return
                    
                    # Parse variable names and adstock rates
                    vars_to_add = []
                    adstock_rates = []
                    
                    for item in selected:
                        var, rate = item.split('|')
                        vars_to_add.append(var)
                        adstock_rates.append(float(rate))
                    
                    # Add the variables
                    clear_output()
                    add_var(vars_to_add, adstock_rates)
                
                add_confirm.on_click(confirm_add)
        
        # Connect the buttons
        test_button.on_click(on_test_button_clicked)
        add_button.on_click(on_add_button_clicked)
        
        # Return None since we're using a widget-based flow
        return None
        
    elif isinstance(variables, str):
        variable_names = [variables.strip()]
    else:
        variable_names = variables
    
    # This section only runs when variables are directly provided
    print(f"Testing {len(variable_names)} variables: {', '.join(variable_names)}")
    
    # Display transformation information if available
    if _loader and hasattr(_loader, 'get_transformation'):
        for var in variable_names:
            trans = _loader.get_transformation(var)
            if trans:
                print(f"  {var} has transformation: {trans}")
    
    # Process adstock rates
    if adstock_rates is None:
        # Since we can't use input() in this context, default to zeros
        print("Using default adstock rates (0%)")
        adstock_rates = [0] * len(variable_names)
    elif isinstance(adstock_rates, str):
        # Convert string to list, assuming comma-separated values
        try:
            adstock_rates = [float(rate.strip())/100 for rate in adstock_rates.split(',')]
        except:
            print("Invalid adstock rates. Using zeros instead.")
            adstock_rates = [0] * len(variable_names)
    elif isinstance(adstock_rates, (int, float)):
        # Single number provided
        adstock_rates = [float(adstock_rates)/100] * len(variable_names)
    
    # Ensure length matches
    if len(adstock_rates) < len(variable_names):
        adstock_rates.extend([0] * (len(variable_names) - len(adstock_rates)))
    
    # Run the test
    results_df = test_variables(_model, variable_names, adstock_rates)
    
    if results_df is not None:
        print("\nVariable Test Results:")
        from IPython.display import HTML, display
        
        # Convert to HTML using the improved function
        html_table = results_to_html_table(results_df)
        display(HTML(html_table))
    
    return results_df


def create_curve(variable=None, curve_type=None, params=None):
    """
    Create curve transformation of a variable.
    
    Parameters:
    -----------
    variable : str, optional
        Variable to transform
    curve_type : str, optional
        Type of curve (e.g., 'coverage', 'atan')
    params : dict, optional
        Curve parameters
    
    Returns:
    --------
    str
        Name of the created variable
    """
    print("Function not implemented yet. Coming soon!")
    return None


from src.decomposition import decompose
def decomp(model_name=None):
    """
    Decompose model effects.
    
    Parameters:
    -----------
    model_name : str, optional
        Name of the model to decompose. If None, uses the current model.
        
    Returns:
    --------
    None
    """
    from src.decomposition import decompose
    return decompose(model_name)



def decomp_groups(model_name=None, group_name=None):
    """
    Decompose a specific group from the model into its individual variables.
    
    Parameters:
    -----------
    model_name : str, optional
        Name of the model to decompose. If None, uses the current model.
    group_name : str, optional
        Name of the group to decompose into individual variables.
        If None, prompts for input.
        
    Returns:
    --------
    None
    """
    from src.decomposition import decomp_groups as decomp_groups_impl
    return decomp_groups_impl(model_name, group_name)


# TRANSFORMING VARIABLES

def split_var(variable_name=None, start_date=None, end_date=None, identifier=None):
    """
    Split a variable by date range.
    
    Parameters:
    -----------
    variable_name : str, optional
        Name of the variable to split. If None, prompts for input.
    start_date : str, optional
        Start date for the period to keep values (YYYY-MM-DD). If None, prompts for input.
    end_date : str, optional
        End date for the period to keep values (YYYY-MM-DD). If None, prompts for input.
    identifier : str, optional
        Custom identifier for the new variable. If None, prompts for input.
    
    Returns:
    --------
    str
        Name of the new variable
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    from src.model_operations import apply_split_by_date
    
    # Get variable name if not provided
    if variable_name is None:
        # Show available variables
        print("\nAvailable variables:")
        for var in _model.model_data.columns:
            print(f"  {var}")
            
        variable_name = input("\nEnter name of variable to split: ").strip()
    
    # Validate variable exists
    if variable_name not in _model.model_data.columns:
        print(f"Error: Variable '{variable_name}' not found in the data.")
        return None
    
    # Get start date if not provided
    if start_date is None:
        start_date = input("Enter start date (YYYY-MM-DD) or leave blank for no lower bound: ").strip()
        if not start_date:
            start_date = None
    
    # Get end date if not provided
    if end_date is None:
        end_date = input("Enter end date (YYYY-MM-DD) or leave blank for no upper bound: ").strip()
        if not end_date:
            end_date = None
    
    # Get identifier if not provided
    if identifier is None:
        identifier = input("Enter identifier for the new variable (optional): ").strip()
    
    # Apply the transformation
    new_var_name = apply_split_by_date(_model, variable_name, start_date, end_date, identifier)
    
    if new_var_name:
        print(f"Created new variable: {new_var_name}")
        # Show a preview of the data
        print("\nPreview of new variable:")
        display(_model.model_data[[variable_name, new_var_name]].head())
    
    return new_var_name

def multiply_vars(var1=None, var2=None, identifier=None):
    """
    Multiply two variables together.
    
    Parameters:
    -----------
    var1 : str, optional
        Name of the first variable. If None, prompts for input.
    var2 : str, optional
        Name of the second variable. If None, prompts for input.
    identifier : str, optional
        Custom identifier for the new variable. If None, prompts for input.
    
    Returns:
    --------
    str
        Name of the new variable
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    from src.model_operations import apply_multiply_vars
    
    # Get variables if not provided
    if var1 is None or var2 is None:
        # Show available variables
        print("\nAvailable variables:")
        for var in _model.model_data.columns:
            print(f"  {var}")
    
    # Get first variable if not provided
    if var1 is None:
        var1 = input("\nEnter name of first variable: ").strip()
    
    # Validate first variable exists
    if var1 not in _model.model_data.columns:
        print(f"Error: Variable '{var1}' not found in the data.")
        return None
    
    # Get second variable if not provided
    if var2 is None:
        var2 = input("Enter name of second variable: ").strip()
    
    # Validate second variable exists
    if var2 not in _model.model_data.columns:
        print(f"Error: Variable '{var2}' not found in the data.")
        return None
    
    # Get identifier if not provided
    if identifier is None:
        identifier = input("Enter identifier for the new variable (optional): ").strip()
    
    # Apply the transformation
    new_var_name = apply_multiply_vars(_model, var1, var2, identifier)
    
    if new_var_name:
        print(f"Created new variable: {new_var_name}")
        # Show a preview of the data
        print("\nPreview of new variable:")
        display(_model.model_data[[var1, var2, new_var_name]].head())
    
    return new_var_name

def list_transformations():
    """
    List all variable transformations in the current model.
    
    Returns:
    --------
    list
        List of transformed variable names
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    if not hasattr(_model, 'var_transformations') or not _model.var_transformations:
        print("No variable transformations found in the model.")
        return []
    
    print("Variable Transformations:")
    for var_name, info in _model.var_transformations.items():
        if info['type'] == 'split_by_date':
            start_str = info['start_date'].strftime('%Y-%m-%d') if hasattr(info['start_date'], 'strftime') else str(info['start_date'])
            end_str = info['end_date'].strftime('%Y-%m-%d') if hasattr(info['end_date'], 'strftime') else str(info['end_date'])
            print(f"  {var_name}: Split of {info['original_var']} from {start_str} to {end_str}")
        elif info['type'] == 'multiply':
            print(f"  {var_name}: Multiplication of {info['var1']} and {info['var2']}")
    
    return list(_model.var_transformations.keys())


def chart_var(*args):
    """
    Chart variables from the model data.
    
    Parameters:
    -----------
    *args : str
        Variable name(s) to chart. Can be passed as separate arguments,
        as a comma-separated string, or as a list.
    
    Returns:
    --------
    None
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    # Import charting utilities
    from src.chart_utils import create_interactive_chart, get_transformed_variables
    
    # Get data to use (full dataset, not just modeling period)
    if hasattr(_model, 'data') and _model.data is not None:
        data = _model.data.copy()
    else:
        data = _model.model_data.copy()
    
    if data is None:
        print("No data available in the model.")
        return None
    
    # Process variables
    var_list = []
    
    # Check if any arguments were provided
    if len(args) == 0:
        # No arguments provided, ask for input without showing all variables
        print("\nEnter variable names to chart, separated by commas:")
        var_input = input("> ")
        var_list = [v.strip() for v in var_input.split(',') if v.strip()]
    else:
        # Process all provided arguments
        for arg in args:
            if isinstance(arg, str):
                # Check if it's a comma-separated string
                if ',' in arg:
                    var_list.extend([v.strip() for v in arg.split(',') if v.strip()])
                else:
                    var_list.append(arg.strip())
            elif isinstance(arg, list):
                # If it's a list, extend with its contents
                var_list.extend([str(v).strip() for v in arg if str(v).strip()])
    
    if not var_list:
        print("No variables specified for charting.")
        return None
    
    # Check for transformed variables
    transformed_vars = get_transformed_variables(_model)
    all_variables = list(data.columns)
    
    # Check if any variable is missing from the data
    missing_vars = [var for var in var_list if var not in all_variables]
    
    # If there are missing variables, check if they might be transformed variables
    if missing_vars:
        for var in missing_vars[:]:  # Use a copy to avoid modifying during iteration
            # Look for this variable in the transformed variables
            if var in transformed_vars:
                missing_vars.remove(var)
            elif any(tv.startswith(f"{var}|") for tv in transformed_vars):
                # Variable name might be a prefix for a transformed variable
                possible_matches = [tv for tv in transformed_vars if tv.startswith(f"{var}|")]
                print(f"Variable '{var}' not found. Did you mean one of these? {', '.join(possible_matches)}")
                missing_vars.remove(var)
    
    # If there are still missing variables, warn the user
    if missing_vars:
        print(f"Warning: The following variables were not found: {', '.join(missing_vars)}")
    
    # Filter to valid variables
    valid_vars = [var for var in var_list if var in all_variables]
    
    if not valid_vars:
        print("No valid variables to chart.")
        return None
    
    # Create the interactive chart
    create_interactive_chart(data, valid_vars, _model)
    return None


"""
Interface functions for lead and lag transformations.
"""

def create_lead(*args):
    """
    Create lead variables (future values of a variable).
    
    Parameters:
    -----------
    *args : Variable arguments
        Can be called in multiple ways:
        - No arguments: Will prompt for input
        - One string argument: Single variable name
        - One list/tuple argument: List of variable names
        - Multiple string arguments: Each is a variable name
        - Two arguments (list/str, list/int): Variable names and periods
    
    Returns:
    --------
    list
        List of new variable names created
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    from src.model_operations import apply_lead_to_model
    
    # Parse arguments
    variables = None
    periods = None
    
    if len(args) == 0:
        # No arguments, will prompt for input
        pass
    elif len(args) == 1:
        # Single argument - either a variable name or list of names
        variables = args[0]
    elif len(args) == 2:
        # Two arguments - variables and periods
        variables = args[0]
        periods = args[1]
    else:
        # Multiple arguments - treat each as a variable name
        variables = list(args)
    
    # Apply the transformation
    return apply_lead_to_model(_model, variables, periods)

def create_lag(*args):
    """
    Create lag variables (past values of a variable).
    
    Parameters:
    -----------
    *args : Variable arguments
        Can be called in multiple ways:
        - No arguments: Will prompt for input
        - One string argument: Single variable name
        - One list/tuple argument: List of variable names
        - Multiple string arguments: Each is a variable name
        - Two arguments (list/str, list/int): Variable names and periods
    
    Returns:
    --------
    list
        List of new variable names created
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    from src.model_operations import apply_lag_to_model
    
    # Parse arguments
    variables = None
    periods = None
    
    if len(args) == 0:
        # No arguments, will prompt for input
        pass
    elif len(args) == 1:
        # Single argument - either a variable name or list of names
        variables = args[0]
    elif len(args) == 2:
        # Two arguments - variables and periods
        variables = args[0]
        periods = args[1]
    else:
        # Multiple arguments - treat each as a variable name
        variables = list(args)
    
    # Apply the transformation
    return apply_lag_to_model(_model, variables, periods)

# Register the functions in the module
def register_lead_lag_functions(module_dict):
    """
    Register lead and lag functions in the module's global namespace.
    
    Parameters:
    -----------
    module_dict : dict
        The module's global dictionary (__dict__)
    """
    module_dict['create_lead'] = create_lead
    module_dict['create_lag'] = create_lag
    
    
"""
Interface functions for contribution groups.
"""

def contribution_groups():
    """
    Set variable groups for model decomposition.
    
    This function opens an interactive table where you can:
    - Assign variables to different groups (e.g., Price, Media, Competitors)
    - Set adjustment types (None/Min/Max) for each variable
    - Save your groupings for later use in decomposition
    
    Parameters:
    -----------
    None
    
    Returns:
    --------
    None
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    from src.contribution_groups import contribution_groups as cg_impl
    
    # Open the interactive group editor
    cg_impl(_model)
    
    return None

def get_groups():
    """
    Get saved variable groups for the current model.
    
    Parameters:
    -----------
    None
    
    Returns:
    --------
    dict
        Dictionary with group settings for each variable
    """
    global _model
    
    if _model is None:
        print("No model available. Please create or load a model first.")
        return None
    
    from src.contribution_groups import get_contribution_groups
    
    # Get the saved group settings
    return get_contribution_groups(_model)

# Register the functions in the module
def register_group_functions(module_dict):
    """
    Register grouping functions in the module's global namespace.
    
    Parameters:
    -----------
    module_dict : dict
        The module's global dictionary (__dict__)
    """
    module_dict['contribution_groups'] = contribution_groups
    module_dict['get_groups'] = get_groups
    
    
"""
Interface functions for curves.
"""
# Import curve functions
try:
    from src.curve_transformations import test_icp, test_adbug
    from src.curve_helpers import run_test_icp, run_test_adbug
    print("Curve transformation functions imported successfully.")
except ImportError as e:
    print(f"Warning: Could not import curve functions: {str(e)}")
    
    # Fallback definitions if imports fail
    def test_icp(model, variable_name=None):
        print("Error: Curve transformations module not found.")
        return None
    
    def test_adbug(model, variable_name=None):
        print("Error: Curve transformations module not found.")
        return None
    
    def run_test_icp(model_name=None, variable_name=None):
        print("Error: Curve helpers module not found.")
        return None
    
    def run_test_adbug(model_name=None, variable_name=None):
        print("Error: Curve helpers module not found.")
        return None
    
    
"""
Interface functions for WGTD variables.
"""    
def wgtd_var(model_name=None, sign_type=None, variables=None):
    """
    Create a weighted variable by combining multiple variables with coefficients.
    
    This function allows creating composite variables that can be used in models.
    The weighting is based on the coefficients of variables in the model.
    
    Parameters:
    -----------
    model_name : str, optional
        Name of the model to use. If None, uses the current model.
    sign_type : str, optional
        Type of coefficients to include: 'pos' (positive), 'neg' (negative), or 'mix' (both).
        If None, a dropdown will be shown for selection.
    variables : list, optional
        List of variable names to include. If None, a selection UI will be shown.
    
    Returns:
    --------
    str
        Name of the created weighted variable
    """
    # Import the function from the weighted_variables module
    try:
        from src.weighted_variables import wgtd_var as wgtd_var_impl
        
        # If model_name is specified but not a model object, try to get the model
        if model_name is not None and not hasattr(model_name, 'results'):
            try:
                from src.model_tools import get_model_by_name
                model = get_model_by_name(model_name)
            except ImportError:
                model = model_name  # Use as is if function not available
        else:
            model = model_name  # Either None or already a model object
        
        # Call the implementation function
        return wgtd_var_impl(model, sign_type, variables)
    except ImportError:
        print("Error: Weighted variables module not found. Please ensure the module is in the src directory.")
        return None