"""
Functions for creating weighted variables by combining multiple variables.
"""

import pandas as pd
import numpy as np
import statsmodels.api as sm
import ipywidgets as widgets
from IPython.display import display, clear_output, HTML
import json
import os
from pathlib import Path

def wgtd_var(model=None, sign_type=None, variables=None):
    """
    Create a weighted variable by combining multiple variables with coefficients.
    
    This function allows creating composite variables that can be used in models.
    The weighting is based on the coefficients of variables in the model.
    
    Parameters:
    -----------
    model : LinearModel, optional
        The model to use for testing. If None, uses the global model.
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
    # Get the model if not provided
    if model is None:
        try:
            from src.interface import _model
            model = _model
        except (ImportError, AttributeError):
            try:
                # Try to get from notebook globals
                from IPython import get_ipython
                user_ns = get_ipython().user_ns
                if '_model' in user_ns:
                    model = user_ns['_model']
                else:
                    print("No model found. Please create or load a model first.")
                    return None
            except:
                print("No model found. Please create or load a model first.")
                return None
    
    # Check if model is valid
    if model is None or model.results is None:
        print("No valid model to use. Please create or load a model first.")
        return None
    
    # If sign_type and variables provided, run in non-interactive mode
    if sign_type is not None and variables is not None:
        return create_weighted_variable(model, sign_type, variables)
    
    # Create widgets for interactive mode
    output = widgets.Output()
    
    # Create variable name input
    var_name_input = widgets.Text(
        value='',
        placeholder='e.g., Economy, Pricing',
        description='Base name:',
        style={'description_width': 'initial'},
        layout=widgets.Layout(width='300px')
    )
    
    # Create sign type dropdown
    sign_type_dropdown = widgets.Dropdown(
        options=[
            ('Positive coefficients', 'pos'),
            ('Negative coefficients', 'neg'),
            ('Mixed coefficients', 'mix')
        ],
        value='mix',
        description='Coefficient type:',
        style={'description_width': 'initial'},
        layout=widgets.Layout(width='300px')
    )
    
    # Create search input for filtering variables
    search_input = widgets.Text(
        value='',
        placeholder='Type to search variables...',
        description='Search:',
        style={'description_width': 'initial'},
        layout=widgets.Layout(width='300px')
    )
    
    # Create select all checkbox
    select_all_checkbox = widgets.Checkbox(
        value=False,
        description='Select All',
        layout=widgets.Layout(width='150px')
    )
    
    # Get available variables (excluding KPI and existing features)
    available_vars = []
    
    # Get all variables from model data
    if hasattr(model, 'model_data'):
        model_vars = list(model.model_data.columns)
        
        # Filter out KPI and existing features
        model_features = model.features if hasattr(model, 'features') else []
        available_vars = [var for var in model_vars 
                         if var != model.kpi]
    
    # Create checkboxes for variables
    var_checkboxes = {}
    for var in available_vars:
        var_checkboxes[var] = widgets.Checkbox(
            value=False, 
            description=var,
            layout=widgets.Layout(width='100%')
        )
    
    # Create a container for checkboxes
    checkbox_container = widgets.VBox(
        list(var_checkboxes.values()),
        layout=widgets.Layout(
            height='300px',
            overflow_y='auto',
            border='1px solid #ddd',
            padding='5px'
        )
    )
    
    # Track visible variables
    visible_vars = list(available_vars)
    
    # Test button
    test_button = widgets.Button(
        description='Test Variables',
        button_style='info',
        layout=widgets.Layout(width='150px')
    )
    
    # Create container for inputs
    inputs_container = widgets.VBox([
        widgets.HTML("<h3>Create Weighted Variable</h3>"),
        widgets.HBox([var_name_input, sign_type_dropdown]),
        widgets.HTML("<h4>Select Variables to Include:</h4>"),
        widgets.HBox([search_input, select_all_checkbox]),
        checkbox_container,
        test_button
    ])
    
    # Display the container and output
    display(inputs_container)
    display(output)
    
    # Functions to handle widget events
    def update_visible_checkboxes(search_term):
        """Filter checkboxes based on search term."""
        nonlocal visible_vars
        
        search_term = search_term.lower()
        visible_vars = [var for var in available_vars if search_term in var.lower()]
        visible_checkboxes = [var_checkboxes[var] for var in visible_vars]
        
        checkbox_container.children = visible_checkboxes
    
    def on_search_change(change):
        """Handle search input changes."""
        search_term = change['new']
        update_visible_checkboxes(search_term)
    
    def on_select_all_change(change):
        """Handle select all checkbox changes."""
        select_all_value = change['new']
        for var in visible_vars:
            var_checkboxes[var].value = select_all_value
    
    def on_test_button_click(b):
        """Handle test button click."""
        with output:
            clear_output()
            
            # Get the base variable name
            base_name = var_name_input.value.strip()
            if not base_name:
                print("Please enter a base name for the weighted variable.")
                return
            
            # Get the sign type
            sign_type = sign_type_dropdown.value
            
            # Get selected variables
            selected_vars = [var for var, checkbox in var_checkboxes.items() 
                           if checkbox.value]
            
            if not selected_vars:
                print("Please select at least one variable to include.")
                return
            
            # Test the variables
            display_test_results(model, base_name, sign_type, selected_vars)
    
    # Connect event handlers
    search_input.observe(on_search_change, names='value')
    select_all_checkbox.observe(on_select_all_change, names='value')
    test_button.on_click(on_test_button_click)
    
    # Initialize visible checkboxes
    update_visible_checkboxes('')
    
    return None

def display_test_results(model, base_name, sign_type, variables):
    """
    Test variables and display results with coefficient editing interface.
    
    Parameters:
    -----------
    model : LinearModel
        The model to use for testing
    base_name : str
        Base name for the weighted variable
    sign_type : str
        Type of coefficients to include: 'pos', 'neg', or 'mix'
    variables : list
        List of variable names to test
    
    Returns:
    --------
    None
    """
    from src.diagnostics import test_variables
    
    # Test the variables
    results_df = test_variables(model, variables)
    
    if results_df is None or len(results_df) == 0:
        print("No valid test results. Please try different variables.")
        return
    
    # Add a new column for model coefficients
    results_df['Model Coefficient'] = 0.0
    
    # Apply filter based on sign_type
    for i, row in results_df.iterrows():
        coef = row['Coefficient']
        t_stat = row['T-stat']
        
        # Check if it's significant (abs(t_stat) > 1.645 is roughly 90% confidence)
        is_significant = abs(t_stat) > 1.645
        
        # Set default model coefficient based on sign_type
        if is_significant:
            if sign_type == 'pos' and coef > 0:
                results_df.at[i, 'Model Coefficient'] = coef
            elif sign_type == 'neg' and coef < 0:
                results_df.at[i, 'Model Coefficient'] = coef
            elif sign_type == 'mix':
                results_df.at[i, 'Model Coefficient'] = coef
    
    # Create output for results
    output_area = widgets.Output()
    
    # Create model coefficient inputs and store them
    coef_inputs = {}
    
    # Create a container for results table and inputs
    results_container = widgets.VBox([])
    
    with output_area:
        # Display a message about the weighted variable
        print(f"Creating weighted variable: {base_name}|WGTD")
        print(f"Coefficient type: {sign_type} ({'Positive only' if sign_type == 'pos' else 'Negative only' if sign_type == 'neg' else 'Mixed'})")
        print("Adjust coefficients as needed and click 'Create Variable' to confirm.")
        
        # Create table headers
        headers_html = """
        <div style="display: flex; font-weight: bold; background-color: #444; color: white; padding: 8px 0; margin-top: 15px;">
            <div style="flex: 0 0 250px; padding: 0 10px;">Variable</div>
            <div style="flex: 0 0 100px; padding: 0 10px;">Coefficient</div>
            <div style="flex: 0 0 100px; padding: 0 10px;">T-stat</div>
            <div style="flex: 0 0 150px; padding: 0 10px;">Model Coefficient</div>
        </div>
        """
        display(HTML(headers_html))
    
    # Create rows for each variable
    rows = []
    for i, row in results_df.iterrows():
        var_name = row['Variable']
        coefficient = row['Coefficient']
        t_stat = row['T-stat']
        model_coef = row['Model Coefficient']
        
        # Create input for model coefficient
        coef_input = widgets.FloatText(
            value=model_coef,
            description='',
            layout=widgets.Layout(width='130px')
        )
        coef_inputs[var_name] = coef_input
        
        # Format coefficient and t-stat with colors
        coef_color = 'green' if coefficient > 0 else 'red'
        t_stat_color = 'green' if t_stat > 1.96 else 'orange' if t_stat > 1.645 else 'black'
        
        # Create row HTML
        var_cell = widgets.HTML(
            f'<div style="width: 230px; padding: 8px 10px;">{var_name}</div>'
        )
        coef_cell = widgets.HTML(
            f'<div style="width: 80px; padding: 8px 10px; color: {coef_color};">{coefficient:.4f}</div>'
        )
        t_stat_cell = widgets.HTML(
            f'<div style="width: 80px; padding: 8px 10px; color: {t_stat_color};">{t_stat:.4f}</div>'
        )
        
        # Create the row
        row_widget = widgets.HBox(
            [var_cell, coef_cell, t_stat_cell, coef_input],
            layout=widgets.Layout(
                border='1px solid #ddd',
                margin='0',
                background_color='#f8f8f8' if i % 2 == 1 else 'white'
            )
        )
        rows.append(row_widget)
    
    # Create button to create the variable
    create_button = widgets.Button(
        description='Create Variable',
        button_style='success',
        layout=widgets.Layout(width='150px', margin='15px 0')
    )
    
    # Create a cancel button
    cancel_button = widgets.Button(
        description='Cancel',
        button_style='danger',
        layout=widgets.Layout(width='150px', margin='15px 10px')
    )
    
    # Add rows and buttons to the container
    results_container.children = [output_area] + rows + [widgets.HBox([cancel_button, create_button])]
    
    # Display the table
    display(results_container)
    
    # Create an output area for final message
    final_output = widgets.Output()
    display(final_output)
    
    # Define button click handlers
    def on_create_button_click(b):
        with final_output:
            clear_output()
            
            # Get the coefficients from the inputs
            coefficients = {}
            for var_name, input_widget in coef_inputs.items():
                coef_value = input_widget.value
                if coef_value != 0:
                    coefficients[var_name] = coef_value
            
            if not coefficients:
                print("No variables selected (all coefficients are zero). Please set at least one non-zero coefficient.")
                return
            
            # Create the weighted variable
            var_name = create_weighted_variable_with_coefficients(model, base_name, coefficients)
            
            if var_name:
                print(f"Successfully created weighted variable: {var_name}")
                print(f"Use add_var('{var_name}') to add it to your model.")
                
                # Disable the buttons
                create_button.disabled = True
                cancel_button.disabled = True
    
    def on_cancel_button_click(b):
        with final_output:
            clear_output()
            print("Operation cancelled. No variable was created.")
            
            # Disable the buttons
            create_button.disabled = True
            cancel_button.disabled = True
    
    # Connect button handlers
    create_button.on_click(on_create_button_click)
    cancel_button.on_click(on_cancel_button_click)
    
    return None

def create_weighted_variable_with_coefficients(model, base_name, coefficients):
    """
    Create a weighted variable using specified coefficients.
    
    Parameters:
    -----------
    model : LinearModel
        The model to add the variable to
    base_name : str
        Base name for the weighted variable
    coefficients : dict
        Dictionary mapping variable names to coefficient values
    
    Returns:
    --------
    str
        Name of the created weighted variable
    """
    if not coefficients:
        print("No coefficients provided. Cannot create weighted variable.")
        return None
    
    if model.model_data is None:
        print("No model data available. Cannot create weighted variable.")
        return None
    
    # Create the new variable name
    var_name = f"{base_name}|WGTD"
    
    # Initialize the weighted variable with zeros
    model.model_data[var_name] = 0.0
    
    # Add each component with its coefficient
    for component_var, coef in coefficients.items():
        if component_var in model.model_data.columns:
            model.model_data[var_name] += coef * model.model_data[component_var]
        else:
            print(f"Warning: Variable '{component_var}' not found in model data. Skipping.")
    
    # Store the weighted variable information in the model
    if not hasattr(model, 'wgtd_variables'):
        model.wgtd_variables = {}
    
    model.wgtd_variables[var_name] = {
        'base_name': base_name,
        'components': coefficients
    }
    
    # Save the weighted variable definition to a file for persistence
    save_weighted_vars_to_file(model)
    
    return var_name

def create_weighted_variable(model, sign_type, variables):
    """
    Non-interactive version of weighted variable creation.
    
    Parameters:
    -----------
    model : LinearModel
        The model to use
    sign_type : str
        Type of coefficients: 'pos', 'neg', or 'mix'
    variables : list
        List of variables to include
    
    Returns:
    --------
    str
        Name of the created weighted variable
    """
    from src.diagnostics import test_variables
    
    # Test the variables to get coefficients
    results_df = test_variables(model, variables)
    
    if results_df is None or len(results_df) == 0:
        print("No valid test results. Please try different variables.")
        return None
    
    # Extract the first part of the first variable name as the base name
    # This is a heuristic approach - might need adjustment for specific cases
    first_var = variables[0]
    base_name = first_var.split('_')[0].split('|')[0]
    
    # Create coefficients dictionary based on sign_type
    coefficients = {}
    for i, row in results_df.iterrows():
        var = row['Variable']
        coef = row['Coefficient']
        t_stat = row['T-stat']
        
        # Check if it's significant (abs(t_stat) > 1.645 is roughly 90% confidence)
        is_significant = abs(t_stat) > 1.645
        
        # Add coefficient based on sign_type
        if is_significant:
            if sign_type == 'pos' and coef > 0:
                coefficients[var] = coef
            elif sign_type == 'neg' and coef < 0:
                coefficients[var] = coef
            elif sign_type == 'mix':
                coefficients[var] = coef
    
    if not coefficients:
        print("No significant variables with the specified sign type. Cannot create weighted variable.")
        return None
    
    # Create the weighted variable
    var_name = create_weighted_variable_with_coefficients(model, base_name, coefficients)
    
    return var_name

def save_weighted_vars_to_file(model):
    """
    Save weighted variable definitions to a file.
    
    Parameters:
    -----------
    model : LinearModel
        The model containing weighted variables
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    if not hasattr(model, 'wgtd_variables') or not model.wgtd_variables:
        return False
    
    try:
        # Create directory if it doesn't exist
        Path('weighted_vars').mkdir(parents=True, exist_ok=True)
        
        # Create filename based on model name
        filename = os.path.join('weighted_vars', f"{model.name}_wgtd_vars.json")
        
        # Save to file
        with open(filename, 'w') as f:
            json.dump(model.wgtd_variables, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error saving weighted variables: {str(e)}")
        return False

def load_weighted_vars_from_file(model):
    """
    Load weighted variable definitions from file.
    
    Parameters:
    -----------
    model : LinearModel
        The model to load weighted variables into
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    try:
        # Check if file exists
        filename = os.path.join('weighted_vars', f"{model.name}_wgtd_vars.json")
        if not os.path.exists(filename):
            return False
        
        # Load from file
        with open(filename, 'r') as f:
            wgtd_variables = json.load(f)
        
        # Store in model
        model.wgtd_variables = wgtd_variables
        
        # Apply loaded weighted variables
        for var_name, var_info in wgtd_variables.items():
            # Skip if already in model data
            if var_name in model.model_data.columns:
                continue
            
            # Get components and coefficients
            components = var_info['components']
            
            # Create the weighted variable
            model.model_data[var_name] = 0.0
            
            # Add each component with its coefficient
            for component_var, coef in components.items():
                if component_var in model.model_data.columns:
                    model.model_data[var_name] += float(coef) * model.model_data[component_var]
                else:
                    print(f"Warning: Component variable '{component_var}' not found. Weighted variable '{var_name}' may be incomplete.")
        
        return True
    except Exception as e:
        print(f"Error loading weighted variables: {str(e)}")
        return False