"""
Functions for model decomposition and contribution analysis.
"""

import pandas as pd
import numpy as np
import os
import json
from IPython.display import display
import ipywidgets as widgets
from pathlib import Path

def decompose(model_name=None):
    """
    Decompose model contributions by variable groups.

    Parameters:
    -----------
    model_name : str, optional
        Name of the model to decompose. If None, uses the current model.

    Returns:
    --------
    None
    """
    # Get the model
    if model_name is None:
        # Try to get current model from global namespace
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
    else:
        # Try to load the specified model
        try:
            from src.linear_models import LinearModel
            from src.model_tools import get_model_by_name
            model = get_model_by_name(model_name)

            if model is None:
                print(f"Model '{model_name}' not found.")
                return None
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return None

    # Check if model has results
    if model.results is None:
        print("Model has no results. Please fit the model first.")
        return None

    # Get variable groups
    groups = get_variable_groups(model)

    if not groups:
        print("No groups found. Please set up groups using contribution_groups() first.")
        # Create default groups
        groups = create_default_groups(model)
        print("Created default groups:")
        for var, group_info in groups.items():
            print(f"  {var}: {group_info['Group']}")

    # Calculate decomposition
    decomp_df = calculate_decomposition(model, groups)

    # Display the chart
    from src.decomposition_charts import display_decomposition_chart
    display_decomposition_chart(model, decomp_df)

    # Return None to avoid displaying the DataFrame
    return None

def get_variable_groups(model):
    """
    Get group assignments for all variables in the model.

    Parameters:
    -----------
    model : LinearModel
        The model to get groups for

    Returns:
    --------
    dict
        Dictionary with group info for each variable
    """
    # Look for saved group settings - always check the file first
    groups_dir = 'groups'
    Path(groups_dir).mkdir(parents=True, exist_ok=True)
    settings_path = os.path.join(groups_dir, f"{model.name}_groups.json")

    if os.path.exists(settings_path):
        try:
            with open(settings_path, 'r') as f:
                groups = json.load(f)

            # Verify groups have all model features
            for feature in model.features + ['const']:
                if feature not in groups:
                    groups[feature] = {'Group': 'Other', 'Adjustment': ''}

            # Store groups in model for future reference
            model.variable_groups = groups
            return groups
        except Exception as e:
            print(f"Error loading group settings: {str(e)}")

    # If we reach here, try to get groups from model
    if hasattr(model, 'variable_groups') and model.variable_groups:
        return model.variable_groups

    # If no groups found, return empty
    return {}

def create_default_groups(model):
    """
    Create default groups for model variables.

    Parameters:
    -----------
    model : LinearModel
        The model to create groups for

    Returns:
    --------
    dict
        Dictionary with default group info for each variable
    """
    groups = {}

    # Set constant to "Base" group
    groups['const'] = {'Group': 'Base', 'Adjustment': ''}

    # Group variables based on naming patterns
    for feature in model.features:
        feature_lower = feature.lower()

        # Determine group based on variable name
        if 'price' in feature_lower or 'pricing' in feature_lower:
            group = 'Price'
        elif 'promo' in feature_lower or 'promotion' in feature_lower or 'offer' in feature_lower:
            group = 'Promotions'
        elif 'tv' in feature_lower or 'radio' in feature_lower or 'online' in feature_lower or 'media' in feature_lower:
            group = 'Media'
        elif 'comp' in feature_lower or 'competitor' in feature_lower:
            group = 'Competition'
        elif 'weather' in feature_lower or 'temperature' in feature_lower or 'rain' in feature_lower:
            group = 'Weather'
        elif 'holiday' in feature_lower or 'season' in feature_lower or 'event' in feature_lower:
            group = 'Seasonality'
        else:
            group = 'Other'

        groups[feature] = {'Group': group, 'Adjustment': ''}

    # Store in model
    model.variable_groups = groups

    return groups

def calculate_decomposition(model, groups):
    """
    Calculate decomposition of model effects by group.

    Parameters:
    -----------
    model : LinearModel
        The model to decompose
    groups : dict
        Dictionary with group info for each variable

    Returns:
    --------
    pandas.DataFrame
        DataFrame with decomposed contributions
    """
    print(f"Starting decomposition calculation with {len(model.model_data)} observations")

    # Get model coefficients
    coefficients = model.results.params

    # Get model data - IMPORTANT: use model_data, not data
    data = model.model_data.copy()

    # Create DataFrame to store contributions
    contributions = pd.DataFrame(index=data.index)

    # Add actual KPI values
    contributions['Actual'] = data[model.kpi]

    # Add predicted values - IMPORTANT: recalculate predictions using current data
    try:
        import statsmodels.api as sm
        X = sm.add_constant(data[model.features])
        predictions = model.results.predict(X)
        contributions['Predicted'] = predictions
    except Exception as e:
        print(f"Error calculating predictions: {str(e)}")
        # Fallback to stored predictions if available
        contributions['Predicted'] = model.results.predict()

    # Check lengths match
    print(f"Contributions dataframe has {len(contributions)} rows")
    print(f"Model data has {len(data)} rows")

    # Track variable contributions before grouping (for adjustments)
    var_contributions = {}

    # First calculate individual variable contributions
    for var, group_info in groups.items():
        # Skip variables not in coefficients
        if var not in coefficients:
            continue

        # Get coefficient
        coef = coefficients[var]

        # Get variable values (handle 'const' specially)
        if var == 'const':
            values = pd.Series(1, index=data.index)
        else:
            # Skip if variable not in data
            if var not in data.columns:
                print(f"Warning: Variable '{var}' not found in data, skipping")
                continue
            values = data[var]

        # Calculate contribution
        var_contributions[var] = coef * values

    # Now apply adjustments and group variables
    grouped_contributions = {}
    adjustment_values = {}

    # Process weighted variables
    if hasattr(model, 'wgtd_variables'):
        for wgtd_var, wgtd_info in model.wgtd_variables.items():
            if wgtd_var in var_contributions:
                # Get the weighted variable's contribution
                wgtd_contribution = var_contributions[wgtd_var]

                # Get component variables and coefficients
                components = wgtd_info.get('components', {})

                # Calculate total weight
                total_weight = sum(abs(coef) for coef in components.values())

                if total_weight > 0:
                    # Remove weighted variable from var_contributions
                    del var_contributions[wgtd_var]

                    # Add each component's proportional contribution
                    for component, component_coef in components.items():
                        # Calculate proportional contribution
                        component_contribution = wgtd_contribution * (component_coef / total_weight)

                        # Add to var_contributions
                        if component in var_contributions:
                            var_contributions[component] += component_contribution
                        else:
                            var_contributions[component] = component_contribution

                        # Make sure component is in groups
                        if component not in groups and wgtd_var in groups:
                            groups[component] = groups[wgtd_var]

    # Group variables by their group
    for var, contribution in var_contributions.items():
        if var not in groups:
            continue

        group_name = groups[var]['Group']
        adjustment = groups[var].get('Adjustment', '')

        # Initialize group if new
        if group_name not in grouped_contributions:
            grouped_contributions[group_name] = pd.Series(0, index=data.index)

        # Apply Min adjustment if specified
        if adjustment == 'Min':
            # Calculate minimum value
            min_value = contribution.min()

            # Apply adjustment (subtract min from all values)
            adjusted_contribution = contribution - min_value

            # Track adjustment for adding to Base
            adjustment_values[var] = min_value

            # Add adjusted contribution to group
            grouped_contributions[group_name] += adjusted_contribution
        # Add this new condition for Max adjustment
        elif adjustment == 'Max':
            # Calculate maximum value
            max_value = contribution.max()

            # Apply adjustment (subtract max from all values)
            adjusted_contribution = contribution - max_value

            # Track adjustment for adding to Base
            adjustment_values[var] = max_value

            # Add adjusted contribution to group
            grouped_contributions[group_name] += adjusted_contribution
        else:
            # No adjustment
            grouped_contributions[group_name] += contribution

    # Add total adjustment to Base
    if 'Base' in grouped_contributions and adjustment_values:
        total_adjustment = sum(adjustment_values.values())
        # Add a total_adjustment value to each observation in Base
        base_contribution = grouped_contributions['Base']

        # Instead of adding min * len(data), add min to each data point
        for i in range(len(base_contribution)):
            base_contribution.iloc[i] += total_adjustment

    # Add grouped contributions to DataFrame
    for group_name, contribution in grouped_contributions.items():
        contributions[group_name] = contribution

    return contributions

### Decomposition of specific Groups ###

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
    # Get the model
    if model_name is None:
        # Try to get current model from global namespace
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
    else:
        # Try to load the specified model
        try:
            from src.linear_models import LinearModel
            from src.model_tools import get_model_by_name
            model = get_model_by_name(model_name)

            if model is None:
                print(f"Model '{model_name}' not found.")
                return None
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return None

    # Check if model has results
    if model.results is None:
        print("Model has no results. Please fit the model first.")
        return None

    # Get variable groups
    groups = get_variable_groups(model)

    if not groups:
        print("No groups found. Please set up groups using contribution_groups() first.")
        # Create default groups
        groups = create_default_groups(model)
        print("Created default groups:")
        for var, group_info in groups.items():
            print(f"  {var}: {group_info['Group']}")

    # If group_name is not provided, show available groups and prompt for selection
    if group_name is None:
        # Get unique groups
        unique_groups = set()
        for var, group_info in groups.items():
            unique_groups.add(group_info['Group'])

        print("Available groups:")
        for group in sorted(unique_groups):
            # Count variables in this group
            vars_in_group = sum(1 for var, info in groups.items() if info['Group'] == group)
            print(f"  {group} ({vars_in_group} variables)")

        # Prompt for group selection
        group_name = input("\nEnter name of group to decompose: ")

    # Validate the group exists
    group_vars = [var for var, info in groups.items() if info['Group'] == group_name]
    if not group_vars:
        print(f"No variables found in group '{group_name}'. Please check the group name.")
        return None

    print(f"Decomposing group '{group_name}' with {len(group_vars)} variables.")

    # Calculate decomposition for the specific group
    decomp_df = calculate_group_decomposition(model, groups, group_name)

    # Display the chart
    from src.decomposition_charts import display_group_decomposition_chart
    display_group_decomposition_chart(model, decomp_df, group_name)

    # Return None to avoid displaying the DataFrame
    return None

def calculate_group_decomposition(model, groups, group_name):
    """
    Calculate decomposition of a specific group's variables.

    Parameters:
    -----------
    model : LinearModel
        The model to decompose
    groups : dict
        Dictionary with group info for each variable
    group_name : str
        Name of the group to decompose

    Returns:
    --------
    pandas.DataFrame
        DataFrame with decomposed contributions for variables in the group
    """
    # Get model coefficients
    coefficients = model.results.params

    # Get model data
    data = model.model_data.copy()

    # Create DataFrame to store contributions
    contributions = pd.DataFrame(index=data.index)

    # Add actual KPI values
    contributions['Actual'] = data[model.kpi]

    # Calculate total contribution of the group
    group_total = pd.Series(0, index=data.index)

    # Filter variables that belong to the specified group
    group_variables = {}
    for var, group_info in groups.items():
        if group_info['Group'] == group_name and var in coefficients:
            # Get coefficient
            coef = coefficients[var]

            # Get variable values (handle 'const' specially)
            if var == 'const':
                values = pd.Series(1, index=data.index)
            else:
                # Skip if variable not in data
                if var not in data.columns:
                    print(f"Warning: Variable '{var}' not found in data, skipping")
                    continue
                values = data[var]

            # Calculate contribution
            contribution = coef * values

            # Apply Min adjustment if specified in the group settings
            adjustment = group_info.get('Adjustment', '')
            if adjustment == 'Min':
                # Calculate minimum value
                min_value = contribution.min()

                # Apply adjustment (subtract min from all values)
                adjusted_contribution = contribution - min_value

                # Save the contribution with applied adjustment
                group_variables[var] = adjusted_contribution

                # Add to group total (we'll add the min value back to Base later)
                group_total += adjusted_contribution
            # Add this new condition for Max adjustment
            elif adjustment == 'Max':
                # Calculate maximum value
                max_value = contribution.max()

                # Apply adjustment (subtract max from all values)
                adjusted_contribution = contribution - max_value

                # Save the contribution with applied adjustment
                group_variables[var] = adjusted_contribution

                # Add to group total (we'll add the max value back to Base later)
                group_total += adjusted_contribution
            else:
                # No adjustment
                group_variables[var] = contribution
                group_total += contribution

    # Check for weighted variables belonging to this group
    if hasattr(model, 'wgtd_variables'):
        for wgtd_var, wgtd_info in model.wgtd_variables.items():
            # Check if this weighted variable is in the model and belongs to the group
            if wgtd_var in coefficients and wgtd_var in groups and groups[wgtd_var]['Group'] == group_name:
                # Get component variables and coefficients
                components = wgtd_info.get('components', {})

                # Calculate the weighted variable's total contribution
                if wgtd_var in data.columns:
                    wgtd_values = data[wgtd_var]
                else:
                    # Skip if variable not in data
                    print(f"Warning: Weighted variable '{wgtd_var}' not found in data, skipping")
                    continue

                wgtd_coef = coefficients[wgtd_var]
                wgtd_contribution = wgtd_coef * wgtd_values

                # Get the total weight
                total_weight = sum(abs(coef) for coef in components.values())

                # Add each component's proportional contribution
                for component, component_coef in components.items():
                    # Get the component base variable name
                    if '|' in component:
                        base_component = component.split('|')[0]
                    else:
                        base_component = component

                    # Calculate the component's contribution
                    if total_weight != 0:  # Avoid division by zero
                        component_contribution = wgtd_contribution * (component_coef / total_weight)

                        # Add to individual components
                        group_variables[component] = component_contribution

    # Add each variable's contribution to the DataFrame
    for var, contribution in group_variables.items():
        contributions[var] = contribution

    # Add the total group contribution
    contributions['Total'] = group_total

    return contributions


# updates needed for decomposition.py

def expand_weighted_variable_contributions(model, contributions_df):
    """
    Expand weighted variables into their component contributions.

    This function takes a DataFrame with contribution values and expands
    any weighted variables into their component variables. The contribution
    of each component is based on its coefficient in the weighted variable.

    Parameters:
    -----------
    model : LinearModel
        The model containing weighted variables
    contributions_df : pandas.DataFrame
        DataFrame with variable contributions

    Returns:
    --------
    pandas.DataFrame
        DataFrame with expanded contributions
    """
    import pandas as pd

    # If the model has no weighted variables, return original DataFrame
    if not hasattr(model, 'wgtd_variables') or not model.wgtd_variables:
        return contributions_df

    # Create a copy to avoid modifying the original
    df = contributions_df.copy()

    # Look for weighted variables in the DataFrame
    for var_name, var_info in model.wgtd_variables.items():
        if var_name not in df.columns:
            continue

        # Get component variables and coefficients
        components = var_info.get('components', {})
        if not components:
            continue

        # Get the total contribution of the weighted variable
        wgtd_contribution = df[var_name]

        # Calculate the total weight
        total_weight = sum(abs(coef) for coef in components.values())

        # Add individual component contributions
        for component, coef in components.items():
            # Calculate the contribution of this component
            # The contribution is proportional to the coefficient's contribution to the total
            if total_weight != 0:  # Avoid division by zero
                component_contribution = wgtd_contribution * (coef / total_weight)

                # Add or combine with existing column
                if component in df.columns:
                    df[component] += component_contribution
                else:
                    df[component] = component_contribution

        # Remove the weighted variable column
        df = df.drop(var_name, axis=1)

    return df

def patch_decomposition_calculate():
    """
    Patch the calculate_decomposition function to handle weighted variables.

    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    try:
        import types
        from src.decomposition import calculate_decomposition as original_calculate_decomposition
        import src.decomposition

        def new_calculate_decomposition(model, groups):
            """
            Patched version of calculate_decomposition that handles weighted variables.
            """
            # Call the original function
            contributions = original_calculate_decomposition(model, groups)

            # Expand weighted variables
            expanded_contributions = expand_weighted_variable_contributions(model, contributions)

            return expanded_contributions

        # Replace the original function with the patched version
        src.decomposition.calculate_decomposition = new_calculate_decomposition

        return True
    except Exception as e:
        print(f"Error patching decomposition functions: {str(e)}")
        return False

def patch_calculate_group_decomposition():
    """
    Patch the calculate_group_decomposition function to handle weighted variables.

    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    try:
        import types
        from src.decomposition import calculate_group_decomposition as original_calculate_group_decomposition
        import src.decomposition

        def new_calculate_group_decomposition(model, groups, group_name):
            """
            Patched version of calculate_group_decomposition that handles weighted variables.
            """
            # Get weighted variables that belong to this group
            wgtd_vars_in_group = []
            if hasattr(model, 'wgtd_variables'):
                for var_name, var_info in model.wgtd_variables.items():
                    if var_name in model.features and var_name in groups and groups[var_name]['Group'] == group_name:
                        wgtd_vars_in_group.append(var_name)

            # Call the original function
            contributions = original_calculate_group_decomposition(model, groups, group_name)

            # If there are no weighted variables in this group, return as is
            if not wgtd_vars_in_group:
                return contributions

            # Process weighted variables in this group
            expanded_contributions = contributions.copy()

            for wgtd_var in wgtd_vars_in_group:
                if wgtd_var not in contributions.columns:
                    continue

                # Get component variables
                components = model.wgtd_variables[wgtd_var].get('components', {})
                if not components:
                    continue

                # Get the contribution of the weighted variable
                wgtd_contribution = contributions[wgtd_var]

                # Calculate total weight
                total_weight = sum(abs(coef) for coef in components.values())

                # Add component contributions
                for component, coef in components.items():
                    # Skip components that don't belong to the same group
                    if component in groups and groups.get(component, {}).get('Group') != group_name:
                        continue

                    # Calculate proportional contribution
                    if total_weight != 0:  # Avoid division by zero
                        component_contribution = wgtd_contribution * (coef / total_weight)

                        # Add or combine with existing column
                        if component in expanded_contributions.columns:
                            expanded_contributions[component] += component_contribution
                        else:
                            expanded_contributions[component] = component_contribution

                # Remove the weighted variable column
                expanded_contributions = expanded_contributions.drop(wgtd_var, axis=1)

            return expanded_contributions

        # Replace the original function with the patched version
        src.decomposition.calculate_group_decomposition = new_calculate_group_decomposition

        return True
    except Exception as e:
        print(f"Error patching group decomposition function: {str(e)}")
        return False

def apply_decomposition_patches():
    """
    Apply all decomposition patches for weighted variables.

    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    success1 = patch_decomposition_calculate()
    success2 = patch_calculate_group_decomposition()

    return success1 and success2