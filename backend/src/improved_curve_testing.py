"""
Improved curve testing functions with consistent styling and better model handling.
"""

def test_icp(model, variable_name=None):
    """
    Test ICP curve transformations with various parameter combinations.

    Parameters:
    -----------
    model : LinearModel
        The model to test with
    variable_name : str, optional
        Name of the variable to test. If None, prompts for selection.

    Returns:
    --------
    pandas.DataFrame
        Results of all tests
    """
    if model is None or model.results is None:
        print("No valid model to test with.")
        return None

    # Get available variables
    available_vars = model.model_data.columns.tolist()

    # Remove KPI and existing features from options
    for feature in model.features:
        if feature in available_vars:
            available_vars.remove(feature)
    if model.kpi in available_vars:
        available_vars.remove(model.kpi)

    # If variable_name is not provided, show selection widget
    if variable_name is None:
        # Create dropdown for variable selection
        var_dropdown = widgets.Dropdown(
            options=available_vars,
            description='Variable:',
            style={'description_width': 'initial'},
            layout=widgets.Layout(width='50%')
        )

        # Create button to start analysis
        analyze_button = widgets.Button(
            description='Analyze Variable',
            button_style='primary',
            layout=widgets.Layout(width='200px')
        )

        output = widgets.Output()

        # Display widgets
        display(widgets.VBox([
            widgets.HTML("<h3>Select a variable to test ICP curve transformations:</h3>"),
            var_dropdown,
            analyze_button,
            output
        ]))

        # Define button click handler
        def on_analyze_clicked(b):
            with output:
                clear_output()
                test_icp_internal(model, var_dropdown.value)

        # Connect the button click event
        analyze_button.on_click(on_analyze_clicked)

        # Return immediately to keep widgets interactive
        return

    # If variable_name is provided, proceed with testing
    return test_icp_internal(model, variable_name)

def test_icp_internal(model, variable_name):
    """
    Internal function to test ICP curve transformations after variable selection.

    Parameters:
    -----------
    model : LinearModel
        The model to test with
    variable_name : str
        Name of the variable to transform

    Returns:
    --------
    pandas.DataFrame
        Results of all tests
    """
    import pandas as pd
    import numpy as np
    from IPython.display import display, HTML, clear_output
    import ipywidgets as widgets
    from src.table_styles import get_results_table_html

    if variable_name not in model.model_data.columns:
        print(f"Error: Variable '{variable_name}' not found in the data.")
        return None

    # Define parameter combinations
    alphas = [3, 4]
    betas = [3, 4, 5]

    # Generate gamma options (switch point locations)
    variable_values = model.model_data[variable_name]
    gamma_options = generate_gamma_options(variable_values)

    # Create all combinations
    results = []
    for alpha in alphas:
        for beta in betas:
            for gamma in gamma_options:
                # Test the curve
                result = test_curve_transform_model(
                    model, variable_name, apply_icp_curve,
                    alpha, beta, gamma, "ICP"
                )
                if result:
                    results.append(result)

    # Create results DataFrame
    if results:
        results_df = pd.DataFrame(results)

        # Reorder and select columns
        display_columns = ['Variable', 'Coefficient', 'T-stat', 'R² Increase',
                         'Alpha', 'Beta', 'Gamma', 'Switch Point']
        results_df = results_df[display_columns]

        # Sort by absolute t-statistic
        results_df = results_df.sort_values('T-stat', key=abs, ascending=False)

        # Create interactive display of results
        display_improved_curve_results(results_df, variable_name, model, "ICP")

        return results_df
    else:
        print("No valid results to display.")
        return None

def display_improved_curve_results(results_df, variable_name, model, curve_type):
    """
    Display table of results with improved styling and interactive chart functionality.

    Parameters:
    -----------
    results_df : pandas.DataFrame
        DataFrame with test results
    variable_name : str
        Name of the original variable
    model : LinearModel
        The model used for testing
    curve_type : str
        Type of curve ("ICP" or "ADBUG")
    """
    import pandas as pd
    import numpy as np
    from IPython.display import display, HTML, clear_output
    import ipywidgets as widgets

    # Create output area for the entire display
    main_output = widgets.Output()

    with main_output:
        # Apply styling to the DataFrame
        html_content = get_curve_results_html(results_df, variable_name, model, curve_type)

        # Display the styled HTML table
        display(HTML(html_content))

    # Display the main output
    display(main_output)

def get_curve_results_html(results_df, variable_name, model, curve_type):
    """
    Generate HTML for curve results with interactive functionality

    Parameters:
    -----------
    results_df : pandas.DataFrame
        DataFrame with test results
    variable_name : str
        Name of the original variable
    model : LinearModel
        The model used for testing
    curve_type : str
        Type of curve ("ICP" or "ADBUG")

    Returns:
    --------
    str
        HTML string with table and interactive controls
    """
    import pandas as pd

    # Create a unique ID for this table
    table_id = f"curve-results-table-{curve_type.lower()}"

    # Start HTML content
    html = f"""
    <style>
    #{table_id}-container {{
        max-width: 100%;
        overflow-x: auto;
        position: relative;
    }}

    #{table_id}-wrapper {{
        max-height: 600px;
        overflow-y: auto;
        margin-bottom: 10px;
    }}

    #{table_id} {{
        border-collapse: collapse;
        width: 100%;
        font-family: Arial, sans-serif;
    }}

    #{table_id} th, #{table_id} td {{
        padding: 8px 12px;
        text-align: right;
        border-bottom: 1px solid #ddd;
    }}

    #{table_id} th {{
        background-color: #444;
        color: white;
        font-weight: bold;
        position: sticky;
        top: 0;
        z-index: 10;
    }}

    #{table_id} th.select-col {{
        width: 30px;
        text-align: center;
    }}

    #{table_id} td.select-col {{
        text-align: center;
    }}

    #{table_id} th.variable-col {{
        text-align: left;
        position: sticky;
        left: 30px;
        background-color: #444;
        color: white;
        z-index: 15;
    }}

    #{table_id} td.variable-col {{
        text-align: left;
        position: sticky;
        left: 30px;
        background-color: inherit;
        z-index: 5;
    }}

    #{table_id} tr:nth-child(even) {{
        background-color: #f8f8f8;
    }}

    #{table_id} .positive-coef {{
        color: #28a745;
    }}

    #{table_id} .negative-coef {{
        color: #dc3545;
    }}

    #{table_id} .significant-positive {{
        background-color: #d4edda;
        color: #155724;
    }}

    #{table_id} .significant-negative {{
        background-color: #f8d7da;
        color: #721c24;
    }}

    .curve-button {{
        margin: 10px 5px;
        padding: 8px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }}

    .show-chart-btn {{
        background-color: #007bff;
        color: white;
    }}

    .show-chart-btn:hover {{
        background-color: #0069d9;
    }}

    .add-model-btn {{
        background-color: #28a745;
        color: white;
    }}

    .add-model-btn:hover {{
        background-color: #218838;
    }}

    .select-all-btn, .select-none-btn {{
        background-color: #6c757d;
        color: white;
        padding: 4px 10px;
        font-size: 12px;
    }}

    .action-container {{
        display: flex;
        justify-content: flex-start;
        align-items: center;
        margin: 10px 0;
    }}
    </style>

    <div id="{table_id}-container">
    <h3>{curve_type} Curve Results for {variable_name}</h3>

    <div class="action-container">
        <button id="{table_id}-select-all" class="curve-button select-all-btn">Select All</button>
        <button id="{table_id}-select-none" class="curve-button select-none-btn">Select None</button>
        <button id="{table_id}-show-chart" class="curve-button show-chart-btn">Show Chart</button>
        <button id="{table_id}-add-model" class="curve-button add-model-btn">Add to Model</button>
    </div>

    <div id="{table_id}-wrapper">
    <table id="{table_id}">
    <thead>
        <tr>
            <th class="select-col"><input type="checkbox" id="{table_id}-check-all"></th>
            <th class="variable-col">Variable</th>
            <th>Coefficient</th>
            <th>T-stat</th>
            <th>R² Increase</th>
            <th>Alpha</th>
            <th>Beta</th>
            <th>Gamma</th>
    """

    # Add Switch Point column for ICP curves
    if curve_type == "ICP":
        html += "<th>Switch Point</th>"

    html += """
        </tr>
    </thead>
    <tbody>
    """

    # Add rows to the table
    for i, row in results_df.iterrows():
        # Row background color
        if i % 2 == 0:
            bg_color = "white"
        else:
            bg_color = "#f8f8f8"

        html += f'<tr style="background-color: {bg_color};">\n'

        # Checkbox column
        html += f'<td class="select-col"><input type="checkbox" class="{table_id}-curve-checkbox" data-row="{i}"></td>\n'

        # Variable column
        html += f'<td class="variable-col">{row["Variable"]}</td>\n'

        # Coefficient column
        coef_class = "positive-coef" if row["Coefficient"] > 0 else "negative-coef"
        html += f'<td class="{coef_class}">{row["Coefficient"]:.4f}</td>\n'

        # T-stat column
        t_stat = row["T-stat"]
        if abs(t_stat) > 1.96:  # Significant at 95%
            if row["Coefficient"] > 0:
                t_class = "significant-positive"
            else:
                t_class = "significant-negative"
        else:
            t_class = ""
        html += f'<td class="{t_class}">{t_stat:.4f}</td>\n'

        # R² Increase column
        html += f'<td>{row["R² Increase"]:.6f}</td>\n'

        # Alpha, Beta, Gamma columns
        html += f'<td>{row["Alpha"]}</td>\n'
        html += f'<td>{row["Beta"]}</td>\n'
        html += f'<td>{row["Gamma"]:.1f}</td>\n'

        # Switch Point column for ICP
        if curve_type == "ICP" and "Switch Point" in row:
            html += f'<td>{row["Switch Point"]:.2f}</td>\n'

        html += '</tr>\n'

    # Close the table
    html += """
    </tbody>
    </table>
    </div>

    <div id="{table_id}-chart-container" style="margin-top: 20px;"></div>

    <script>
    (function() {
        // Get the table elements
        const tableId = '{table_id}';
        const table = document.getElementById(tableId);
        const selectAllBtn = document.getElementById(`${tableId}-select-all`);
        const selectNoneBtn = document.getElementById(`${tableId}-select-none`);
        const showChartBtn = document.getElementById(`${tableId}-show-chart`);
        const addModelBtn = document.getElementById(`${tableId}-add-model`);
        const checkboxes = document.querySelectorAll(`.${tableId}-curve-checkbox`);
        const masterCheckbox = document.getElementById(`${tableId}-check-all`);

        // Select all/none functionality
        selectAllBtn.addEventListener('click', function() {
            checkboxes.forEach(box => box.checked = true);
            masterCheckbox.checked = true;
        });

        selectNoneBtn.addEventListener('click', function() {
            checkboxes.forEach(box => box.checked = false);
            masterCheckbox.checked = false;
        });

        // Master checkbox functionality
        masterCheckbox.addEventListener('change', function() {
            checkboxes.forEach(box => box.checked = this.checked);
        });

        // Show Chart button
        showChartBtn.addEventListener('click', function() {
            const selectedRows = [];
            checkboxes.forEach(box => {
                if (box.checked) {
                    selectedRows.push(parseInt(box.getAttribute('data-row')));
                }
            });

            if (selectedRows.length === 0) {
                alert('Please select at least one curve to display.');
                return;
            }

            // Execute Python code to show chart with selectedRows
            const selectedRowsStr = selectedRows.join(',');
            const cmd = `show_curve_chart('${variable_name}', [${selectedRowsStr}], model=None, curve_type='${curve_type}')`;
            IPython.notebook.kernel.execute(cmd);
        });

        // Add to Model button
        addModelBtn.addEventListener('click', function() {
            const selectedRows = [];
            checkboxes.forEach(box => {
                if (box.checked) {
                    selectedRows.push(parseInt(box.getAttribute('data-row')));
                }
            });

            if (selectedRows.length === 0) {
                alert('Please select at least one curve to add to model.');
                return;
            }

            // Execute Python code to add selected curves to model
            const selectedRowsStr = selectedRows.join(',');
            const cmd = `add_curves_to_model('${variable_name}', [${selectedRowsStr}], model=None, curve_type='${curve_type}')`;
            IPython.notebook.kernel.execute(cmd);
        });
    })();
    </script>
    """.format(table_id=table_id, variable_name=variable_name, curve_type=curve_type)

    return html

# Functions to handle button actions
def show_curve_chart(variable_name, selected_rows, model=None, curve_type="ICP"):
    """
    Show chart for selected curves.

    Parameters:
    -----------
    variable_name : str
        Name of the original variable
    selected_rows : list
        Indices of selected rows in the results DataFrame
    model : LinearModel, optional
        Model to use for data
    curve_type : str
        Type of curve ("ICP" or "ADBUG")
    """
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd
    from IPython.display import display, clear_output

    # Attempt to get the model if not provided
    if model is None:
        try:
            # Try to get global model from interface
            from src.interface import _model
            model = _model
        except:
            try:
                # Try to get from IPython user namespace
                from IPython import get_ipython
                ipython = get_ipython()
                model = ipython.user_ns.get('_model')
                if model is None:
                    model = ipython.user_ns.get('model')
            except:
                print("Error: Could not access model. Please provide a model explicitly.")
                return

    # Get the results DataFrame from the user namespace
    try:
        from IPython import get_ipython
        ipython = get_ipython()
        results_df = None
        for var_name, var_value in ipython.user_ns.items():
            if isinstance(var_value, pd.DataFrame) and 'Variable' in var_value.columns and 'Alpha' in var_value.columns:
                if all(col in var_value.columns for col in ['Coefficient', 'T-stat', 'R² Increase', 'Alpha', 'Beta', 'Gamma']):
                    results_df = var_value
                    break

        if results_df is None:
            print("Error: Could not find results DataFrame.")
            return
    except:
        print("Error: Could not access results DataFrame.")
        return

    # Get original variable data
    try:
        original_values = model.model_data[variable_name]
        max_value = original_values.max()
    except:
        print(f"Error: Could not access variable '{variable_name}' in model data.")
        return

    # Create range of x values
    x = np.linspace(0, max_value * 1.2, 1000)

    # Create the plot
    plt.figure(figsize=(12, 8))

    # Plot each selected curve
    for row_idx in selected_rows:
        try:
            row = results_df.iloc[row_idx]
            alpha = row['Alpha']
            beta = row['Beta']
            gamma = row['Gamma']

            # Apply curve transformation
            if curve_type == "ICP":
                from src.curve_transformations import apply_icp_curve
                y = apply_icp_curve(x, alpha, beta, gamma)
                # Mark switch point if available
                if 'Switch Point' in row and pd.notnull(row['Switch Point']):
                    switch_point = row['Switch Point']
                    if switch_point > 0:
                        switch_y = apply_icp_curve(switch_point, alpha, beta, gamma)
                        plt.plot(switch_point, switch_y, 'o', markersize=6)
                        plt.axvline(x=switch_point, linestyle='--', alpha=0.3)
            else:  # ADBUG
                from src.curve_transformations import apply_adbug_curve
                y = apply_adbug_curve(x, alpha, beta, gamma)

            # Plot the curve with label
            short_label = f"α={alpha}, β={beta}, γ={gamma}"
            plt.plot(x, y, label=short_label, linewidth=2)

        except Exception as e:
            print(f"Error plotting curve at index {row_idx}: {str(e)}")

    # Add original data points as scatter plot
    plt.scatter(original_values, np.zeros_like(original_values) - 0.05,
               color='grey', alpha=0.5, s=20, marker='|',
               label='Original data distribution')

    # Add grid and labels
    plt.grid(True, alpha=0.3)
    plt.xlabel('Original Value')
    plt.ylabel('Transformed Value')
    plt.title(f'{curve_type} Curves for {variable_name}')

    # Add a horizontal line at y=1 to show the asymptote
    plt.axhline(y=1, color='gray', linestyle='-', alpha=0.5)

    # Add legend
    plt.legend(loc='best')

    # Add curve formula annotation
    if curve_type == "ICP":
        formula = r"$y = \frac{(x/\gamma)^\alpha}{(x/\gamma)^\alpha + \beta}$"
    else:  # ADBUG
        formula = r"$y = 1 - e^{-\beta(x/\gamma)^\alpha}$"

    plt.text(0.02, 0.02, formula, transform=plt.gca().transAxes, fontsize=12,
            verticalalignment='bottom', bbox=dict(boxstyle='round', facecolor='white', alpha=0.7))

    plt.show()

def add_curves_to_model(variable_name, selected_rows, model=None, curve_type="ICP"):
    """
    Add selected curves to the model.

    Parameters:
    -----------
    variable_name : str
        Name of the original variable
    selected_rows : list
        Indices of selected rows in the results DataFrame
    model : LinearModel, optional
        Model to use for data
    curve_type : str
        Type of curve ("ICP" or "ADBUG")
    """
    import pandas as pd
    from IPython.display import display, clear_output

    # Attempt to get the model if not provided
    if model is None:
        try:
            # Try to get global model from interface
            from src.interface import _model
            model = _model
        except:
            try:
                # Try to get from IPython user namespace
                from IPython import get_ipython
                ipython = get_ipython()
                model = ipython.user_ns.get('_model')
                if model is None:
                    model = ipython.user_ns.get('model')
            except:
                print("Error: Could not access model. Please provide a model explicitly.")
                return

    if model is None:
        print("Error: No model found. Please provide a model.")
        return

    # Get the results DataFrame from the user namespace
    try:
        from IPython import get_ipython
        ipython = get_ipython()
        results_df = None
        for var_name, var_value in ipython.user_ns.items():
            if isinstance(var_value, pd.DataFrame) and 'Variable' in var_value.columns and 'Alpha' in var_value.columns:
                if all(col in var_value.columns for col in ['Coefficient', 'T-stat', 'R² Increase', 'Alpha', 'Beta', 'Gamma']):
                    results_df = var_value
                    break

        if results_df is None:
            print("Error: Could not find results DataFrame.")
            return
    except:
        print("Error: Could not access results DataFrame.")
        return

    # Get original variable data
    try:
        original_values = model.model_data[variable_name]
    except:
        print(f"Error: Could not access variable '{variable_name}' in model data.")
        return

    # Add selected transformed variables to model data
    added_vars = []
    for row_idx in selected_rows:
        try:
            row = results_df.iloc[row_idx]
            var_name = row['Variable']
            alpha = row['Alpha']
            beta = row['Beta']
            gamma = row['Gamma']

            # Apply transformation to original data
            if curve_type == "ICP":
                from src.curve_transformations import apply_icp_curve
                transformed_values = apply_icp_curve(original_values, alpha, beta, gamma)
            else:  # ADBUG
                from src.curve_transformations import apply_adbug_curve
                transformed_values = apply_adbug_curve(original_values, alpha, beta, gamma)

            # Add to model data
            model.model_data[var_name] = transformed_values
            added_vars.append(var_name)

            print(f"Added {var_name} to model data.")
        except Exception as e:
            print(f"Error adding curve at index {row_idx}: {str(e)}")

    if added_vars:
        print("\nUse add_var() to add these transformations to your model.")
    else:
        print("No curves were added to the model.")

def run_test_icp(model_name=None, variable_name=None):
    """
    Run ICP curve tests on a model by name.

    Parameters:
    -----------
    model_name : str, optional
        Name of the model to test, or None to use the current model
    variable_name : str, optional
        Name of the variable to test, or None for interactive selection

    Returns:
    --------
    pandas.DataFrame
        Results of the test
    """
    # Import the test_icp function
    try:
        from src.curve_transformations import test_icp
    except ImportError:
        print("Error: Curve transformations module not found.")
        return None

    # Get the model object
    model_obj = get_model_object(model_name)
    if model_obj is None:
        return None

    # Run the test
    return test_icp(model_obj, variable_name)

def get_model_object(model_name=None):
    """
    Get a model object by name.

    Parameters:
    -----------
    model_name : str, optional
        Name of the model to get, or None to use the current model

    Returns:
    --------
    LinearModel or None
        The model object
    """
    # If no model name is provided, try to get the current model
    if model_name is None:
        # Try to access the global _model from interface
        try:
            import sys
            if '..' not in sys.path:
                sys.path.append('..')
            from src.interface import _model
            if _model is not None:
                return _model
        except (ImportError, AttributeError):
            pass

        # Try to access the global model from notebook
        try:
            # Get the notebook globals
            from IPython import get_ipython
            if get_ipython() is not None:
                user_ns = get_ipython().user_ns
                if '_model' in user_ns and user_ns['_model'] is not None:
                    return user_ns['_model']
                elif 'model' in user_ns and user_ns['model'] is not None:
                    return user_ns['model']
        except:
            pass

        print("No current model found. Please create or load a model first.")
        return None

    # If a model name is provided as a string, try to find or load it
    if isinstance(model_name, str):
        # First check if the current model has this name
        try:
            from src.interface import _model
            if _model is not None and _model.name == model_name:
                return _model
        except:
            pass

        # Check if it's a saved model
        try:
            import os
            from src.linear_models import LinearModel

            # Look in models directory
            models_dir = os.path.join('..', 'models')
            if not os.path.exists(models_dir):
                models_dir = 'models'  # Try without the parent directory

            if os.path.exists(models_dir):
                model_file = os.path.join(models_dir, f"{model_name}.pkl")
                if os.path.exists(model_file):
                    loaded_model = LinearModel.load_model(model_file)
                    print(f"Loaded model '{model_name}'")

                    # Update the global model variable
                    try:
                        from src.interface import set_globals
                        set_globals(model=loaded_model)
                        print("Global model updated.")
                    except:
                        pass

                    return loaded_model
        except Exception as e:
            print(f"Error loading model: {str(e)}")

        print(f"Model '{model_name}' not found.")
        return None

    # If model_name is already a model object, return it
    if hasattr(model_name, 'results') and hasattr(model_name, 'features'):
        return model_name

    print("Invalid model. Please provide a valid model name or object.")
    return None

# Helper function to generate gamma options that you need from previous code
def generate_gamma_options(variable_values, n_options=10):
    """
    Generate a range of reasonable gamma values based on variable statistics.

    Parameters:
    -----------
    variable_values : numpy.ndarray or pandas.Series
        The values of the variable
    n_options : int, optional
        Number of gamma options to generate

    Returns:
    --------
    list
        List of gamma values
    """
    import numpy as np

    # Get variable statistics
    max_value = variable_values.max()
    mean_value = variable_values.mean()

    # Generate a range from 40% to 130% of max value
    min_gamma = 0.4 * max_value
    max_gamma = 1.3 * max_value

    # Add options around the mean too
    gamma_values = np.linspace(min_gamma, max_gamma, n_options)

    # Round values for better readability
    gamma_values = [round(g, -1) if g > 100 else round(g, 1) for g in gamma_values]

    return gamma_values

# Curve application functions
def apply_icp_curve(x, alpha, beta, gamma):
    """
    Apply the ICP (Incremental Coverage Potential) curve transformation to a variable.
    This creates an S-shaped curve with increasing returns followed by decreasing returns.

    Parameters:
    -----------
    x : numpy.ndarray or pandas.Series
        The original values to transform
    alpha : float
        Controls the steepness of the curve around the switch point
    beta : float
        Controls how quickly the curve approaches its asymptote
    gamma : float
        The switch point where the curve changes from increasing to decreasing returns

    Returns:
    --------
    numpy.ndarray
        The transformed values
    """
    import numpy as np
    import pandas as pd

    # Convert to numpy array if it's a pandas Series
    if isinstance(x, pd.Series):
        x = x.values

    # Apply the ICP formula: y = (x/γ)^α / ((x/γ)^α + β)
    x_scaled = x / gamma
    numerator = np.power(x_scaled, alpha)
    denominator = numerator + beta
    y = numerator / denominator

    return y

def apply_adbug_curve(x, alpha, beta, gamma):
    """
    Apply the ADBUG (Adstock Budget) curve transformation to a variable.
    This creates a curve with diminishing returns.

    Parameters:
    -----------
    x : numpy.ndarray or pandas.Series
        The original values to transform
    alpha : float
        Controls the concavity of the curve (0 < alpha < 1)
    beta : float
        Controls how quickly diminishing returns take effect
    gamma : float
        Scale parameter to adjust the input values

    Returns:
    --------
    numpy.ndarray
        The transformed values
    """
    import numpy as np
    import pandas as pd

    # Convert to numpy array if it's a pandas Series
    if isinstance(x, pd.Series):
        x = x.values

    # Apply the ADBUG formula: y = 1 - exp(-β * (x/γ)^α)
    x_scaled = x / gamma
    exponent = -beta * np.power(x_scaled, alpha)
    y = 1 - np.exp(exponent)

    return y

# We also need the test_curve_transform_model function from your existing code
def test_curve_transform_model(model, variable_name, curve_function, alpha, beta, gamma, curve_type="ICP"):
    """
    Test how a curve-transformed variable would perform in the model.

    Parameters:
    -----------
    model : LinearModel
        The model to test with
    variable_name : str
        Name of the variable to transform
    curve_function : function
        The function to apply (apply_icp_curve or apply_adbug_curve)
    alpha : float
        Alpha parameter
    beta : float
        Beta parameter
    gamma : float
        Gamma parameter
    curve_type : str, optional
        Type of curve ('ICP' or 'ADBUG')

    Returns:
    --------
    dict
        Results of the test including coefficient, t-stat, etc.
    """
    import statsmodels.api as sm
    import pandas as pd
    import numpy as np

    if model is None or model.results is None:
        print("No valid model to test with.")
        return None

    if variable_name not in model.model_data.columns:
        print(f"Error: Variable '{variable_name}' not found in the data.")
        return None

    # Create the transformed variable name
    if curve_type == "ICP":
        transform_type = "ICP"
    else:
        transform_type = "ADBUG"

    # Format alpha, beta, gamma values for the name
    # Format depends on magnitude for better readability
    alpha_str = f"{alpha:.1f}".rstrip('0').rstrip('.') if alpha < 10 else str(int(alpha))
    beta_str = f"{beta:.1f}".rstrip('0').rstrip('.') if beta < 10 else str(int(beta))
    gamma_str = f"{gamma:.1f}".rstrip('0').rstrip('.') if gamma < 100 else str(int(gamma))

    transform_name = f"{variable_name}|{transform_type} a{alpha_str}_b{beta_str}_g{gamma_str}"

    try:
        # Get the original variable values
        original_values = model.model_data[variable_name]

        # Apply the transformation
        transformed_values = curve_function(original_values, alpha, beta, gamma)

        # Add the transformed variable to a copy of the model data
        model_data_copy = model.model_data.copy()
        model_data_copy[transform_name] = transformed_values

        # Get current model variables and add the new transformed variable
        current_vars = model.features.copy()
        vars_with_transform = current_vars + [transform_name]

        # Get the KPI values
        y = model_data_copy[model.kpi]

        # Prepare X data for both models
        X_current = sm.add_constant(model_data_copy[current_vars])
        X_with_transform = sm.add_constant(model_data_copy[vars_with_transform])

        # Fit both models
        current_model = sm.OLS(y, X_current).fit()
        transform_model = sm.OLS(y, X_with_transform).fit()

        # Get statistics for the transformed variable
        coef = transform_model.params[transform_name]
        t_stat = transform_model.tvalues[transform_name]
        p_value = transform_model.pvalues[transform_name]

        # Calculate R-squared increase
        rsquared_increase = transform_model.rsquared - current_model.rsquared

        # Calculate switch point if it's an ICP curve
        switch_point = None
        if curve_type == "ICP" and alpha > 1:
            switch_point = gamma * ((alpha - 1) / (alpha + 1)) ** (1 / alpha)

        # Store results
        results = {
            'Variable': transform_name,
            'Coefficient': coef,
            'T-stat': t_stat,
            'P-value': p_value,
            'R² Increase': rsquared_increase,
            'Alpha': alpha,
            'Beta': beta,
            'Gamma': gamma,
            'Curve Type': curve_type,
            'Switch Point': switch_point
        }

        return results

    except Exception as e:
        print(f"Error testing curve transformation: {str(e)}")
        return None