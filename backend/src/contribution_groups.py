"""
Contribution groups with direct data entry and no JavaScript dependencies.
"""

import pandas as pd
import os
import json
from IPython.display import display
from pathlib import Path
import ipywidgets as widgets

def contribution_groups(model=None):
    """
    Interactive table for managing variable groupings for decomposition.
    
    Parameters:
    -----------
    model : LinearModel, optional
        Linear model containing variables to group
        
    Returns:
    --------
    None
    """
    # Get global model if not provided
    if model is None:
        try:
            from __main__ import _model
            model = _model
        except:
            print("No model available. Please create or load a model first.")
            return None
    
    # Check if model has results
    if model.results is None:
        print("Model has no results. Please fit the model first.")
        return None
    
    # Create groups directory if it doesn't exist
    groups_dir = 'groups'
    Path(groups_dir).mkdir(parents=True, exist_ok=True)
    
    # Path for saving group settings
    settings_path = os.path.join(groups_dir, f"{model.name}_groups.json")
    
    # Create DataFrame with variable info
    var_data = []
    
    # Add constant term if present
    if 'const' in model.results.params:
        var_data.append({
            'Variable': 'const',
            'Coefficient': float(model.results.params['const']),
            'Transformation': 'None',
            'Group': 'Other',
            'Adjustment': ''
        })
    
    # Add features
    for feature in model.features:
        if feature in model.results.params:
            var_data.append({
                'Variable': feature,
                'Coefficient': float(model.results.params[feature]),
                'Transformation': model.feature_transformations.get(feature, 'None'),
                'Group': 'Other',  # Default group
                'Adjustment': ''   # Default no adjustment
            })
    
    # Create DataFrame
    df = pd.DataFrame(var_data)
    
    # Try to load existing settings
    if os.path.exists(settings_path):
        try:
            with open(settings_path, 'r') as f:
                settings = json.load(f)
                
            # Update group and adjustment fields if variables match
            for i, row in df.iterrows():
                var_name = row['Variable']
                if var_name in settings:
                    df.at[i, 'Group'] = settings[var_name].get('Group', 'Other')
                    df.at[i, 'Adjustment'] = settings[var_name].get('Adjustment', '')
                    
            print(f"Loaded existing group settings for model '{model.name}'")
        except Exception as e:
            print(f"Error loading group settings: {str(e)}")
    
    # Create input widgets for each row
    group_inputs = []
    adjustment_selects = []
    
    for i, row in df.iterrows():
        # Group input
        group_input = widgets.Text(
            value=row['Group'],
            description='',
            layout=widgets.Layout(width='150px')
        )
        group_inputs.append(group_input)
        
        # Adjustment select
        adjustment_select = widgets.Dropdown(
            options=[('None', ''), ('Min', 'Min'), ('Max', 'Max')],
            value=row['Adjustment'],
            description='',
            layout=widgets.Layout(width='100px')
        )
        adjustment_selects.append(adjustment_select)
    
    # Create a table using ipywidgets to maintain styling
    table_rows = []
    
    # Header row
    header = widgets.HTML(
        '''
        <div style="display: flex; width: 100%; background-color: #444; color: white; font-weight: bold; padding: 8px 0;">
            <div style="flex: 0 0 200px; padding: 0 10px;">Variable</div>
            <div style="flex: 0 0 100px; padding: 0 10px;">Coefficient</div>
            <div style="flex: 0 0 150px; padding: 0 10px;">Transformation</div>
            <div style="flex: 0 0 150px; padding: 0 10px;">Group</div>
            <div style="flex: 0 0 100px; padding: 0 10px;">Adjustment</div>
        </div>
        '''
    )
    table_rows.append(header)
    
    # Data rows
    for i, row in df.iterrows():
        # Variable name (first column)
        var_name = widgets.HTML(
            f'<div style="background-color: #444; color: white; font-weight: bold; padding: 8px 10px; width: 180px;">{row["Variable"]}</div>'
        )
        
        # Coefficient (second column)
        coef_color = '#28a745' if row['Coefficient'] > 0 else '#dc3545'
        coefficient = widgets.HTML(
            f'<div style="color: {coef_color}; padding: 8px 10px; width: 80px;">{row["Coefficient"]:.4f}</div>'
        )
        
        # Transformation (third column)
        transformation = widgets.HTML(
            f'<div style="padding: 8px 10px; width: 130px;">{row["Transformation"]}</div>'
        )
        
        # Create row with proper styling
        row_bg = '#f9f9f9' if i % 2 == 1 else 'white'
        row_widget = widgets.HBox(
            [var_name, coefficient, transformation, group_inputs[i], adjustment_selects[i]],
            layout=widgets.Layout(
                border='1px solid #ddd',
                width='100%',
                background_color=row_bg
            )
        )
        table_rows.append(row_widget)
    
    # Create buttons
    cancel_button = widgets.Button(
        description='Cancel',
        button_style='',
        layout=widgets.Layout(width='100px')
    )
    
    confirm_button = widgets.Button(
        description='Confirm',
        button_style='primary',
        layout=widgets.Layout(width='100px')
    )
    
    button_container = widgets.HBox(
        [widgets.Label(''), cancel_button, confirm_button],
        layout=widgets.Layout(
            justify_content='flex-end',
            margin='10px 0'
        )
    )
    
    # Output area for messages
    output = widgets.Output()
    
    # Button handlers
    def on_cancel_clicked(b):
        with output:
            print("Changes discarded.")
        cancel_button.disabled = True
        confirm_button.disabled = True
    
    def on_confirm_clicked(b):
        with output:
            print("Saving changes...")
            
            # Disable buttons
            cancel_button.disabled = True
            confirm_button.disabled = True
            
            # Collect settings
            settings = {}
            for i, row in df.iterrows():
                var_name = row['Variable']
                group_value = group_inputs[i].value
                adjustment_value = adjustment_selects[i].value
                
                settings[var_name] = {
                    'Group': group_value,
                    'Adjustment': adjustment_value
                }
            
            # Save to file
            try:
                with open(settings_path, 'w') as f:
                    json.dump(settings, f, indent=2)
                print(f"Group settings saved to {settings_path}")
            except Exception as e:
                print(f"Error saving group settings: {str(e)}")
    
    # Connect handlers
    cancel_button.on_click(on_cancel_clicked)
    confirm_button.on_click(on_confirm_clicked)
    
    # Create main container
    container = widgets.VBox(
        table_rows + [button_container, output],
        layout=widgets.Layout(width='100%')
    )
    
    # Display the widget
    display(container)
    
    # Show guidance message
    with output:
        print("Editing variable groups. Click 'Confirm' to save or 'Cancel' to discard changes.")
    
    return None

def get_contribution_groups(model):
    """
    Get saved contribution groups for a model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to get groups for
        
    Returns:
    --------
    dict
        Dictionary with group settings for each variable
    """
    if model is None:
        print("No model provided.")
        return None
        
    # Path for group settings
    settings_path = os.path.join('groups', f"{model.name}_groups.json")
    
    # Check if settings exist
    if not os.path.exists(settings_path):
        print(f"No group settings found for model '{model.name}'.")
        return None
    
    # Load the settings
    try:
        with open(settings_path, 'r') as f:
            settings = json.load(f)
        
        # Expand weighted variables
        if hasattr(model, 'wgtd_variables'):
            expanded_settings = settings.copy()
            
            for var_name, var_info in model.wgtd_variables.items():
                if var_name in settings:
                    # Get the group and adjustment for the weighted variable
                    group = settings[var_name].get('Group', 'Other')
                    adjustment = settings[var_name].get('Adjustment', '')
                    
                    # Get component variables
                    components = var_info.get('components', {})
                    
                    # Add each component with the same group
                    for component, _ in components.items():
                        if component not in expanded_settings:
                            expanded_settings[component] = {
                                'Group': group,
                                'Adjustment': adjustment
                            }
            
            return expanded_settings
        else:
            return settings
    except Exception as e:
        print(f"Error loading group settings: {str(e)}")
        return None