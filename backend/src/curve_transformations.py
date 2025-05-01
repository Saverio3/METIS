"""
Curve transformations for media variables including ICP (s-shape) and ADBUG (diminishing returns).
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import statsmodels.api as sm
from IPython.display import display, HTML, clear_output
import ipywidgets as widgets


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
    # Convert to numpy array if it's a pandas Series
    if isinstance(x, pd.Series):
        x = x.values

    # Apply the ADBUG formula: y = 1 - exp(-β * (x/γ)^α)
    x_scaled = x / gamma
    exponent = -beta * np.power(x_scaled, alpha)
    y = 1 - np.exp(exponent)

    return y

def get_switch_point(x_values, alpha):
    """
    Calculate the theoretical switch point (x*) for an ICP curve.

    Parameters:
    -----------
    x_values : numpy.ndarray or pandas.Series
        The original values (used to get the max value as a reference)
    alpha : float
        Alpha parameter from the ICP formula

    Returns:
    --------
    float
        The calculated switch point
    """
    # For ICP, the switch point (where second derivative = 0) is:
    # x* = γ * ((α-1)/(α+1))^(1/α)

    # Use 80% of max value as gamma by default
    gamma = 0.8 * np.max(x_values)

    # Only compute if alpha > 1, otherwise there's no switch point
    if alpha > 1:
        switch_factor = ((alpha - 1) / (alpha + 1)) ** (1 / alpha)
        switch_point = gamma * switch_factor
    else:
        switch_point = 0

    return switch_point

def generate_gamma_options(variable_values, n_options=10):
    """Generate gamma options that provide meaningful switch points."""
    # Get variable statistics
    max_value = variable_values.max()
    min_value = variable_values.min()
    mean_value = variable_values.mean()

    # Calculate a range that will create good curves for this variable
    min_gamma = mean_value * 0.3  # ~30% of mean value
    max_gamma = max_value * 0.6   # ~60% of max value

    # Generate gamma values - create more options
    gamma_values = []

    # Create a non-linear distribution with more values in the lower range
    for i in range(n_options):
        # Non-linear progression gives more weight to lower values
        factor = (i / (n_options - 1)) ** 1.5
        gamma = min_gamma + factor * (max_gamma - min_gamma)
        gamma_values.append(gamma)

    # Round values for better readability based on magnitude
    rounded_values = []
    for g in gamma_values:
        if g > 10000:
            rounded = round(g, -3)  # Round to thousands
        elif g > 1000:
            rounded = round(g, -2)  # Round to hundreds
        elif g > 100:
            rounded = round(g, -1)  # Round to tens
        else:
            rounded = round(g, 1)   # Round to one decimal place
        rounded_values.append(rounded)

    # Remove duplicates that might occur after rounding
    gamma_values = sorted(list(set(rounded_values)))

    return gamma_values

def plot_curve(curve_function, variable_values, alpha, beta, gamma, switch_point=None, curve_name=""):
    """
    Plot a transformation curve for visualization.

    Parameters:
    -----------
    curve_function : function
        The function to apply (apply_icp_curve or apply_adbug_curve)
    variable_values : numpy.ndarray or pandas.Series
        The values of the variable
    alpha : float
        Alpha parameter
    beta : float
        Beta parameter
    gamma : float
        Gamma parameter
    switch_point : float, optional
        The switch point to mark on the plot (for ICP curves)
    curve_name : str, optional
        Name to display in the plot title

    Returns:
    --------
    matplotlib.figure.Figure
        The created figure
    """
    # Create range of x values from 0 to slightly above max value
    max_value = variable_values.max()
    x = np.linspace(0, max_value * 1.2, 1000)

    # Apply the curve transformation
    y = curve_function(x, alpha, beta, gamma)

    # Create the plot
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(x, y, 'b-', linewidth=2)

    # Mark the switch point if provided (for ICP curves)
    if switch_point is not None and switch_point > 0:
        switch_y = curve_function(switch_point, alpha, beta, gamma)
        ax.plot(switch_point, switch_y, 'ro', markersize=8)
        ax.axvline(x=switch_point, color='r', linestyle='--', alpha=0.5)
        ax.text(switch_point + max_value * 0.02, switch_y,
                f'Switch point: x={switch_point:.2f}, y={switch_y:.2f}',
                verticalalignment='center')

    # Add grid and labels
    ax.grid(True, alpha=0.3)
    ax.set_xlabel('Original Value')
    ax.set_ylabel('Transformed Value')
    if curve_name:
        ax.set_title(f'{curve_name} Curve (α={alpha}, β={beta}, γ={gamma})')
    else:
        ax.set_title(f'Transformation Curve (α={alpha}, β={beta}, γ={gamma})')

    # Add a horizontal line at y=1 to show the asymptote
    ax.axhline(y=1, color='gray', linestyle='-', alpha=0.5)

    # Add curve formula annotation
    if curve_function == apply_icp_curve:
        formula = r"$y = \frac{(x/\gamma)^\alpha}{(x/\gamma)^\alpha + \beta}$"
    else:  # ADBUG
        formula = r"$y = 1 - e^{-\beta(x/\gamma)^\alpha}$"

    ax.text(0.02, 0.02, formula, transform=ax.transAxes, fontsize=12,
            verticalalignment='bottom', bbox=dict(boxstyle='round', facecolor='white', alpha=0.7))

    return fig

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

def test_icp(model, variable_name=None):
    """
    Test ICP curve transformations with various parameter combinations.

    Parameters:
    -----------
    model : LinearModel
        The model to test with
    variable_name : str, optional
        Name of the variable to transform. If None, prompts for selection.

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
    None
    """
    if variable_name not in model.model_data.columns:
        print(f"Error: Variable '{variable_name}' not found in the data.")
        return None

    # Define parameter combinations - keeping original values
    alphas = [3, 4]
    betas = [3, 4, 5]

    # Generate more gamma options with the improved function
    variable_values = model.model_data[variable_name]
    gamma_options = generate_gamma_options(variable_values, n_options=10)

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

        # Sort by Alpha, Beta, and Gamma
        results_df = results_df.sort_values(['Alpha', 'Beta', 'Gamma'])

        # Create interactive display of results - PASS THE MODEL HERE
        display_results_with_chart(results_df, variable_name, model, "ICP")

        # Store for future reference but don't return (to avoid duplicate output)
        import builtins
        builtins._last_curve_results = results_df
        return None
    else:
        print("No valid results to display.")
        return None

def test_adbug(model, variable_name=None):
    """
    Test ADBUG curve transformations with various parameter combinations.

    Parameters:
    -----------
    model : LinearModel
        The model to test with
    variable_name : str, optional
        Name of the variable to transform. If None, prompts for selection.

    Returns:
    --------
    None
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
            widgets.HTML("<h3>Select a variable to test ADBUG curve transformations:</h3>"),
            var_dropdown,
            analyze_button,
            output
        ]))

        # Define button click handler
        def on_analyze_clicked(b):
            with output:
                clear_output()
                test_adbug_internal(model, var_dropdown.value)

        # Connect the button click event
        analyze_button.on_click(on_analyze_clicked)

        # Return immediately to keep widgets interactive
        return

    # If variable_name is provided, proceed with testing
    return test_adbug_internal(model, variable_name)

def test_adbug_internal(model, variable_name):
    """
    Internal function to test ADBUG curve transformations after variable selection.

    Parameters:
    -----------
    model : LinearModel
        The model to test with
    variable_name : str
        Name of the variable to transform

    Returns:
    --------
    None
    """
    if variable_name not in model.model_data.columns:
        print(f"Error: Variable '{variable_name}' not found in the data.")
        return None

    # Define parameter combinations - keeping original values
    alphas = [0.8, 0.9, 1.0]
    betas = [2, 3, 4]

    # Generate more gamma options with improved function
    variable_values = model.model_data[variable_name]
    gamma_options = generate_gamma_options(variable_values, n_options=10)

    # Create all combinations
    results = []
    for alpha in alphas:
        for beta in betas:
            for gamma in gamma_options:
                # Test the curve
                result = test_curve_transform_model(
                    model, variable_name, apply_adbug_curve,
                    alpha, beta, gamma, "ADBUG"
                )
                if result:
                    results.append(result)

    # Create results DataFrame
    if results:
        results_df = pd.DataFrame(results)

        # Reorder and select columns
        display_columns = ['Variable', 'Coefficient', 'T-stat', 'R² Increase',
                         'Alpha', 'Beta', 'Gamma']
        results_df = results_df[display_columns]

        # Sort by Alpha, Beta, Gamma (like ICP) instead of T-stat
        results_df = results_df.sort_values(['Alpha', 'Beta', 'Gamma'])

        # Create interactive display of results - PASS THE MODEL HERE
        display_results_with_chart(results_df, variable_name, model, "ADBUG")

        # Store for future reference but don't return (changed to store in global var and return None)
        import builtins
        builtins._last_curve_results = results_df
        return None
    else:
        print("No valid results to display.")
        return None

def display_results_with_chart(results_df, variable_name, model, curve_type="ICP"):
    """
    Display table of results with interactive chart functionality.

    Parameters:
    -----------
    results_df : pandas.DataFrame
        DataFrame with test results
    variable_name : str
        Name of the original variable
    model : LinearModel
        Model being used for testing
    curve_type : str
        Type of curve ("ICP" or "ADBUG")
    """
    import pandas as pd
    import numpy as np
    import ipywidgets as widgets
    from IPython.display import display, HTML, clear_output
    import matplotlib.pyplot as plt
    from src.curve_transformations import apply_icp_curve, apply_adbug_curve

    # Store the model reference and variable name globally for button actions
    import builtins
    builtins._temp_curve_model = model
    builtins._temp_curve_varname = variable_name
    builtins._temp_curve_results = results_df
    builtins._temp_curve_type = curve_type

    # Create a unique ID for the table
    table_id = f"curve-results-{abs(hash(variable_name)) % 10000}"

    # Create output area for the chart
    output_area = widgets.Output()

    # Function to plot selected curves
    def plot_selected_curves(selected_rows):
        with output_area:
            clear_output(wait=True)

            if not selected_rows:
                print("No curves selected. Please select at least one curve.")
                return

            print(f"Generating chart for {variable_name} with rows: {selected_rows}")

            # Get original variable data
            original_values = model.model_data[variable_name]
            max_value = original_values.max()

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
                        y = apply_icp_curve(x, alpha, beta, gamma)
                        # Mark switch point if available
                        if 'Switch Point' in row and pd.notnull(row['Switch Point']):
                            switch_point = row['Switch Point']
                            if switch_point > 0:
                                switch_y = apply_icp_curve(switch_point, alpha, beta, gamma)
                                plt.plot(switch_point, switch_y, 'o', markersize=6)
                                plt.axvline(x=switch_point, linestyle='--', alpha=0.3)
                    else:  # ADBUG
                        y = apply_adbug_curve(x, alpha, beta, gamma)

                    # Plot the curve with label
                    short_label = f"α={alpha}, β={beta}, γ={gamma}"
                    plt.plot(x, y, label=short_label, linewidth=2)

                except Exception as e:
                    print(f"Error plotting curve at index {row_idx}: {str(e)}")

            # Removed: Original data distribution scatter plot

            # Add grid and labels
            plt.grid(True, alpha=0.3)
            plt.xlabel(f'Original {variable_name} Value')
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

    # Function to add curves to model
    def add_curves_to_model(selected_rows):
        with output_area:
            clear_output(wait=True)

            if not selected_rows:
                print("No curves selected. Please select at least one curve.")
                return

            print(f"Adding curves for {variable_name} with rows: {selected_rows}")

            # Add selected transformed variables to model data
            added_vars = []
            for row_idx in selected_rows:
                try:
                    row = results_df.iloc[row_idx]
                    curve_var_name = row['Variable']
                    alpha = row['Alpha']
                    beta = row['Beta']
                    gamma = row['Gamma']

                    # Apply transformation to original data
                    original_values = model.model_data[variable_name]

                    if curve_type == "ICP":
                        transformed_values = apply_icp_curve(original_values, alpha, beta, gamma)
                    else:  # ADBUG
                        transformed_values = apply_adbug_curve(original_values, alpha, beta, gamma)

                    # Add to model data
                    model.model_data[curve_var_name] = transformed_values
                    added_vars.append(curve_var_name)

                    print(f"Added {curve_var_name} to model data.")
                except Exception as e:
                    print(f"Error adding curve at index {row_idx}: {str(e)}")

            if added_vars:
                print("\nUse add_var() to add these transformations to your model.")
            else:
                print("No curves were added to the model.")

    # First part of HTML - table styling
    html = f"""
    <style>
    #{table_id}-container {{
        max-width: 100%;
        overflow-x: auto;
        position: relative;
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
        cursor: pointer;
    }}

    #{table_id} th::after {{
        content: '\\A0\\A0\\A0'; /* Add some space for the sort indicator */
    }}

    #{table_id} th.sorted-asc::after {{
        content: ' ▲';
    }}

    #{table_id} th.sorted-desc::after {{
        content: ' ▼';
    }}

    #{table_id} th.checkbox-col {{
        width: 30px;
        text-align: center;
        cursor: default;
    }}

    #{table_id} td.checkbox-col {{
        text-align: center;
    }}

    #{table_id} th.row-idx-col {{
        width: 40px;
        text-align: center;
        cursor: default;
    }}

    #{table_id} td.row-idx-col {{
        text-align: center;
        font-weight: bold;
        color: #444;
    }}

    #{table_id} th.variable-col {{
        text-align: left;
        background-color: #444;
        color: white;
        z-index: 15;
    }}

    #{table_id} td.variable-col {{
        text-align: left;
        background-color: #444;
        color: white;
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
        font-weight: bold;
    }}

    #{table_id} .significant-negative {{
        background-color: #f8d7da;
        color: #721c24;
        font-weight: bold;
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
    </style>

    <div id="{table_id}-container">
    <h3>{curve_type} Curve Results for {variable_name}</h3>

    <div style="max-height: 600px; overflow-y: auto; margin-bottom: 10px; border: 1px solid #ddd;">
    <table id="{table_id}">
    <thead>
        <tr>
            <th class="checkbox-col"><input type="checkbox" id="{table_id}-check-all"></th>
            <th class="row-idx-col">#</th>
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
        html += f"<th>Switch Point</th>"

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

        html += f'<tr data-row-index="{i}" style="background-color: {bg_color};">\n'

        # Checkbox column
        html += f'<td class="checkbox-col"><input type="checkbox" class="{table_id}-curve-checkbox" data-row="{i}" id="checkbox-{i}"></td>\n'

        # Row index column
        html += f'<td class="row-idx-col">{i}</td>\n'

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

    html += """
    </tbody>
    </table>
    </div>
    </div>
    """

    # Add sorting functionality and checkbox functionality JavaScript
    html += f"""
    <script>
    (function() {{
        // Function to initialize the table
        function initTable() {{
            // Get the table elements
            var table = document.getElementById('{table_id}');
            if (!table) return; // Exit if table not found

            var headers = table.querySelectorAll('th:not(.checkbox-col):not(.row-idx-col)');
            var tbody = table.querySelector('tbody');
            var rows = Array.from(tbody.querySelectorAll('tr'));
            var masterCheckbox = document.getElementById('{table_id}-check-all');
            var checkboxes = document.querySelectorAll('.{table_id}-curve-checkbox');

            // Add click event for sorting to each header
            headers.forEach(function(header) {{
                header.addEventListener('click', function() {{
                    // Get column index for sorting
                    var columnIndex = Array.from(header.parentNode.children).indexOf(header);

                    // Determine sort direction
                    var sortDirection = header.getAttribute('data-sort-direction') === 'asc' ? 'desc' : 'asc';

                    // Reset all headers
                    headers.forEach(function(h) {{
                        h.classList.remove('sorted-asc', 'sorted-desc');
                        h.removeAttribute('data-sort-direction');
                    }});

                    // Set current header as sorted
                    header.setAttribute('data-sort-direction', sortDirection);
                    header.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');

                    // Sort the rows
                    rows.sort(function(rowA, rowB) {{
                        var cellA = rowA.cells[columnIndex].textContent.trim();
                        var cellB = rowB.cells[columnIndex].textContent.trim();

                        // Try to convert to numbers if possible
                        var numA = parseFloat(cellA);
                        var numB = parseFloat(cellB);

                        if (!isNaN(numA) && !isNaN(numB)) {{
                            return sortDirection === 'asc' ? numA - numB : numB - numA;
                        }} else {{
                            return sortDirection === 'asc' ?
                                cellA.localeCompare(cellB) :
                                cellB.localeCompare(cellA);
                        }}
                    }});

                    // Reappend rows in new order
                    rows.forEach(function(row) {{
                        tbody.appendChild(row);
                    }});
                }});
            }});

            // Set up the master checkbox functionality
            if (masterCheckbox) {{
                masterCheckbox.addEventListener('change', function() {{
                    var isChecked = masterCheckbox.checked;
                    checkboxes.forEach(function(checkbox) {{
                        checkbox.checked = isChecked;
                    }});
                }});

                // Update master checkbox when individual checkboxes change
                checkboxes.forEach(function(checkbox) {{
                    checkbox.addEventListener('change', function() {{
                        var allChecked = Array.from(checkboxes).every(function(cb) {{ return cb.checked; }});
                        var noneChecked = Array.from(checkboxes).every(function(cb) {{ return !cb.checked; }});

                        if (allChecked) {{
                            masterCheckbox.checked = true;
                            masterCheckbox.indeterminate = false;
                        }} else if (noneChecked) {{
                            masterCheckbox.checked = false;
                            masterCheckbox.indeterminate = false;
                        }} else {{
                            masterCheckbox.indeterminate = true;
                        }}
                    }});
                }});
            }}
        }}

        // Run initialization when DOM is fully loaded
        if (document.readyState === "loading") {{
            document.addEventListener('DOMContentLoaded', initTable);
        }} else {{
            // DOM already loaded, run initialization
            setTimeout(initTable, 100); // Small delay to ensure table is rendered
        }}
    }})();
    </script>
    """

    # Display the HTML table
    display(HTML(html))

    # Create buttons with ipywidgets
    select_all_btn = widgets.Button(
        description='Select All',
        button_style='info',
        layout=widgets.Layout(width='100px')
    )

    select_none_btn = widgets.Button(
        description='Select None',
        button_style='info',
        layout=widgets.Layout(width='100px')
    )

    show_chart_btn = widgets.Button(
        description='Show Chart',
        button_style='primary',
        layout=widgets.Layout(width='100px')
    )

    add_model_btn = widgets.Button(
        description='Add to Model',
        button_style='success',
        layout=widgets.Layout(width='100px')
    )

    # JavaScript function to get selected rows from the table
    js_get_selected = """
    function() {
        var checkboxes = document.querySelectorAll('input.%s-curve-checkbox');
        var selected = [];
        checkboxes.forEach(function(checkbox) {
            if (checkbox.checked) {
                selected.push(parseInt(checkbox.getAttribute('data-row')));
            }
        });
        return selected;
    }
    """ % table_id

    # JavaScript function to select all checkboxes
    js_select_all = """
    function() {
        var checkboxes = document.querySelectorAll('input.%s-curve-checkbox');
        var masterCheckbox = document.getElementById('%s-check-all');
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = true;
        });
        if (masterCheckbox) {
            masterCheckbox.checked = true;
            masterCheckbox.indeterminate = false;
        }
    }
    """ % (table_id, table_id)

    # JavaScript function to deselect all checkboxes
    js_select_none = """
    function() {
        var checkboxes = document.querySelectorAll('input.%s-curve-checkbox');
        var masterCheckbox = document.getElementById('%s-check-all');
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = false;
        });
        if (masterCheckbox) {
            masterCheckbox.checked = false;
            masterCheckbox.indeterminate = false;
        }
    }
    """ % (table_id, table_id)

    # Button click handlers
    def on_select_all_clicked(b):
        from IPython.display import Javascript
        display(Javascript(js_select_all))

    def on_select_none_clicked(b):
        from IPython.display import Javascript
        display(Javascript(js_select_none))

    def on_show_chart_clicked(b):
        from IPython.display import Javascript
        js = """
        (function() {
            var selected = %s();
            if (selected.length === 0) {
                alert('Please select at least one curve to display.');
                return;
            }
            IPython.notebook.kernel.execute('_temp_selected_rows = ' + JSON.stringify(selected));
            IPython.notebook.kernel.execute('_show_chart_callback(_temp_selected_rows)');
        })();
        """ % js_get_selected
        display(Javascript(js))

    def on_add_model_clicked(b):
        from IPython.display import Javascript
        js = """
        (function() {
            var selected = %s();
            if (selected.length === 0) {
                alert('Please select at least one curve to add to model.');
                return;
            }
            IPython.notebook.kernel.execute('_temp_selected_rows = ' + JSON.stringify(selected));
            IPython.notebook.kernel.execute('_add_model_callback(_temp_selected_rows)');
        })();
        """ % js_get_selected
        display(Javascript(js))

    # Connect button click handlers
    select_all_btn.on_click(on_select_all_clicked)
    select_none_btn.on_click(on_select_none_clicked)
    show_chart_btn.on_click(on_show_chart_clicked)
    add_model_btn.on_click(on_add_model_clicked)

    # Define callback functions
    def _show_chart_callback(selected_rows):
        plot_selected_curves(selected_rows)

    def _add_model_callback(selected_rows):
        add_curves_to_model(selected_rows)

    # Register callback functions in the IPython kernel
    import IPython
    IPython.get_ipython().user_ns['_show_chart_callback'] = _show_chart_callback
    IPython.get_ipython().user_ns['_add_model_callback'] = _add_model_callback

    # Display buttons and output area
    button_box = widgets.HBox([select_all_btn, select_none_btn, show_chart_btn, add_model_btn])
    display(button_box)
    display(output_area)





def style_curves_table(df):
    """
    Apply styling to the curves results table.

    Parameters:
    -----------
    df : pandas.DataFrame
        DataFrame with curve test results

    Returns:
    --------
    pandas.io.formats.style.Styler
        Styled DataFrame
    """
    # Define styling function
    def style_row(row):
        styles = [''] * len(row)

        # Get indices for columns
        coef_idx = row.index.get_loc('Coefficient') if 'Coefficient' in row else None
        tstat_idx = row.index.get_loc('T-stat') if 'T-stat' in row else None

        # Style coefficient
        if coef_idx is not None and pd.notnull(row.iloc[coef_idx]):
            if row.iloc[coef_idx] > 0:
                styles[coef_idx] = 'color: #28a745; font-weight: bold;'
            else:
                styles[coef_idx] = 'color: #dc3545; font-weight: bold;'

        # Style T-statistic
        if tstat_idx is not None and pd.notnull(row.iloc[tstat_idx]):
            tstat = row.iloc[tstat_idx]
            if abs(tstat) > 1.96:  # Significant at 95%
                if tstat > 0:
                    styles[tstat_idx] = 'background-color: #d4edda; color: #155724; font-weight: bold;'
                else:
                    styles[tstat_idx] = 'background-color: #f8d7da; color: #721c24; font-weight: bold;'
            elif abs(tstat) > 1.645:  # Significant at 90%
                if tstat > 0:
                    styles[tstat_idx] = 'background-color: #d4edda; color: #155724;'
                else:
                    styles[tstat_idx] = 'background-color: #f8d7da; color: #721c24;'

        return styles

    # Apply styling
    styled_df = df.style.apply(style_row, axis=1).format({
        'Coefficient': '{:.4f}',
        'T-stat': '{:.4f}',
        'R² Increase': '{:.6f}',
        'Alpha': '{:.2f}',
        'Beta': '{:.2f}',
        'Gamma': '{:.2f}',
        'Switch Point': '{:.2f}'
    })

    # Add header styling
    styled_df = styled_df.set_table_styles([
        {'selector': 'thead th',
         'props': [('background-color', '#444'),
                  ('color', 'white'),
                  ('font-weight', 'bold'),
                  ('text-align', 'center')]},
        {'selector': 'tbody tr:nth-of-type(odd)',
         'props': [('background-color', '#f9f9f9')]},
        {'selector': 'tbody tr:hover',
         'props': [('background-color', '#e6f2ff')]},
        {'selector': 'table',
         'props': [('border-collapse', 'collapse'),
                  ('width', '100%')]},
        {'selector': 'th, td',
         'props': [('padding', '8px'),
                  ('border-bottom', '1px solid #ddd'),
                  ('text-align', 'right')]},
        {'selector': 'th:first-child, td:first-child',
         'props': [('text-align', 'left')]}
    ])