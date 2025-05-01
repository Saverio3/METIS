"""
Helper functions for creating interactive widgets.
"""

import ipywidgets as widgets
from IPython.display import display

def create_variable_selector(variables, title="Select variables"):
    """
    Create an interactive variable selector with checkboxes and search functionality.
    
    Parameters:
    -----------
    variables : list
        List of variable names to display
    title : str, optional
        Title to display above the selector
    
    Returns:
    --------
    tuple
        (output_widget, get_selected_function)
        - output_widget: Widget to display
        - get_selected_function: Function to call to get selected variables
    """
    # Initialize widgets
    search_input = widgets.Text(
        value='',
        placeholder='Type to search...',
        description='Search:',
        disabled=False
    )
    
    select_all_checkbox = widgets.Checkbox(
        value=False,
        description='Select All',
        disabled=False
    )
    
    # Create a checkbox for each variable
    var_checkboxes = {var: widgets.Checkbox(value=False, description=var, layout=widgets.Layout(width='100%')) 
                     for var in variables}
    
    # Create widget containers
    header = widgets.HBox([search_input, select_all_checkbox])
    checkbox_container = widgets.VBox(list(var_checkboxes.values()))
    
    # Container for current visible checkboxes
    visible_vars = list(variables)
    
    # Main output container
    output = widgets.Output()
    
    # Update visible checkboxes based on search
    def update_visible_checkboxes(search_term):
        nonlocal visible_vars
        visible_vars = [var for var in variables if search_term.lower() in var.lower()]
        visible_widgets = [var_checkboxes[var] for var in visible_vars]
        checkbox_container.children = visible_widgets
    
    # Handle search input changes
    def on_search_change(change):
        search_term = change['new']
        update_visible_checkboxes(search_term)
    
    # Handle select all checkbox changes
    def on_select_all_change(change):
        select_all_value = change['new']
        for var in visible_vars:
            var_checkboxes[var].value = select_all_value
    
    # Function to get selected variables
    def get_selected_variables():
        return [var for var, checkbox in var_checkboxes.items() if checkbox.value]
    
    # Register callbacks
    search_input.observe(on_search_change, names='value')
    select_all_checkbox.observe(on_select_all_change, names='value')
    
    # Create main widget
    main_widget = widgets.VBox([
        widgets.HTML(f"<h3>{title}</h3>"),
        header,
        widgets.Box([checkbox_container], layout=widgets.Layout(
            border='1px solid #ddd',
            max_height='300px',
            overflow_y='auto'
        )),
        output
    ])
    
    return main_widget, get_selected_variables