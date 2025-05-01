from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import json
import traceback
import statsmodels.api as sm

# Import our modeling modules
from src.data_loader import DataLoader
from src.linear_models import LinearModel
from src.model_operations import apply_adstock, display_model_summary
from src.diagnostics import test_variables
from src.model_export import import_model_from_excel
import numpy as np  # Required for np.linspace in curve visualization
from src.curve_transformations import apply_icp_curve, apply_adbug_curve, test_curve_transform_model, generate_gamma_options

# Optional but useful imports
from src.curve_helpers import get_model_object  # If you need to fetch models by name
from src.model_tools import get_model_by_name  # Alternative model fetching
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Also add a global option handler to handle all OPTIONS requests
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Store temporary data in memory (in production you'd use a proper database)
data_store = {
    'loader': None,
    'models': {},
    'active_model': None
}

# Print all registered routes on startup
def print_all_routes():
    """Print all registered routes in the Flask app."""
    print("\n=== REGISTERED ROUTES ===")
    for rule in app.url_map.iter_rules():
        print(f"Route: {rule}, Methods: {rule.methods}")
    print("=========================\n")

# Simple test route to verify the application is working
@app.route('/test', methods=['GET'])
def test_route():
    """Simple test route to verify Flask is working."""
    return jsonify({"message": "Test route works!"}), 200

# Debug route to check data_store contents
@app.route('/debug/data-store', methods=['GET'])
def debug_data_store():
    """Debug endpoint to check the contents of data_store."""
    result = {
        "loader_exists": data_store['loader'] is not None
    }

    if data_store['loader'] is not None:
        loader = data_store['loader']
        result["variable_count"] = len(loader.get_variable_names())
        result["variables"] = loader.get_variable_names()

        # Check if get_data() works
        try:
            data = loader.get_data()
            result["data_exists"] = data is not None
            if data is not None:
                result["data_columns"] = list(data.columns)
                result["data_rows"] = len(data)
        except Exception as e:
            result["data_error"] = str(e)

    return jsonify(result), 200

@app.route('/api/data/upload', methods=['POST'])
def upload_data():
    try:
        file = request.files['file']
        if not file:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        # Save the file temporarily
        temp_file_path = f"temp_{file.filename}"
        file.save(temp_file_path)

        print(f"File received: {file.filename}")
        print(f"Saved temporarily to: {temp_file_path}")

        # Use our DataLoader to load the file
        loader = DataLoader()
        success = loader.load_data(temp_file_path)

        if not success:
            print(f"Failed to load data from {temp_file_path}")
            return jsonify({'success': False, 'error': 'Failed to load data'}), 400

        # Store the loader in our data store
        data_store['loader'] = loader

        # Get data preview and stats
        data = loader.get_data()
        preview = data.head(10).to_dict(orient='records')

        # Extract dates if the data is indexed by date
        dates = None
        if hasattr(data.index, 'strftime'):  # Check if it's a datetime index
            dates = data.index.strftime('%Y-%m-%d').tolist()[:10]  # Get first 10 dates

        # Get summary info
        summary = loader.get_summary()

        # Check for regions column and count unique values
        region_count = 1  # Default to 1 if no regions column
        for column in data.columns:
            if 'region' in column.lower():
                region_count = len(data[column].unique())
                break

        # Add region count to the response
        summary['region_count'] = region_count

        # Clean up the temp file
        os.remove(temp_file_path)

        print(f"Data loaded successfully. Found {len(data.columns)} columns and {len(data)} rows.")
        print(f"Loader stored in data_store: {data_store['loader'] is not None}")
        print(f"Data has {len(loader.get_variable_names())} variables.")

        return jsonify({
            'success': True,
            'preview': preview,
            'variables': loader.get_variable_names(),
            'summary': summary,
            'dates': dates,
            'transformations': loader.get_transformations()
        }), 200

    except Exception as e:
        print(f"ERROR in upload_data: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/variables', methods=['GET'])
def get_variables():
    try:
        print(f"Accessing variables. data_store['loader'] is: {data_store['loader'] is not None}")

        if data_store['loader'] is None:
            print("No data loader available")
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        loader = data_store['loader']
        print(f"Number of variables in loader: {len(loader.get_variable_names())}")

        data = loader.get_data()

        if data is None or len(data.columns) == 0:
            print("Data is empty or has no columns")
            return jsonify({'success': False, 'error': 'Data is empty'}), 400

        print(f"Data has {len(data.columns)} columns")

        # Get variable information
        variables = []
        for col in data.columns:
            var_type = 'NUMERIC'
            if pd.api.types.is_categorical_dtype(data[col]):
                var_type = 'CATEGORICAL'
            elif pd.api.types.is_datetime64_any_dtype(data[col]):
                var_type = 'DATE'

            # Check if it's a transformed variable
            is_transformed = '|' in col or '_adstock_' in col
            base_variable = None
            if '|' in col:
                base_variable = col.split('|')[0]
            elif '_adstock_' in col:
                base_variable = col.split('_adstock_')[0]

            # Get transformation
            transformation = loader.get_transformation(col) or 'NONE'

            # Get contribution group if available
            group = 'Other'
            if hasattr(loader, 'get_group'):
                group = loader.get_group(col) or 'Other'

            variables.append({
                'name': col,
                'type': var_type,
                'transformation': transformation,
                'group': group,
                'isTransformed': is_transformed,
                'baseVariable': base_variable
            })

        print(f"Returning {len(variables)} variables")
        return jsonify({'success': True, 'variables': variables}), 200
    except Exception as e:
        print(f"ERROR in get_variables: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/import', methods=['POST'])
def import_model():
    print("=== import_model called ===")

    try:
        file = request.files.get('file')
        if not file:
            print("No file provided")
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        print(f"Received file: {file.filename}, size: {file.content_length} bytes")

        # Check if we have a loader with data
        if data_store['loader'] is None:
            # Initialize a basic loader if not exists
            from src.data_loader import DataLoader
            data_store['loader'] = DataLoader()
            # If there's still no data, we'll need to warn the user to upload data first
            if not hasattr(data_store['loader'], 'data') or data_store['loader'].data is None:
                if hasattr(data_store['loader'], 'get_data') and callable(data_store['loader'].get_data):
                    data = data_store['loader'].get_data()
                    if data is None:
                        print("No data available to import model. Please upload data first.")
                        return jsonify({'success': False, 'error': 'Please upload data first'}), 400
                else:
                    print("No data loader available or missing get_data method")
                    return jsonify({'success': False, 'error': 'Please upload data first'}), 400

        # Save the file temporarily
        temp_file_path = f"temp_model_{file.filename}"
        file.save(temp_file_path)
        print(f"Saved to temp file: {temp_file_path}")

        try:
            # Import the model from Excel
            filtered_data = None  # We would use this if we had filtered data
            print("Calling import_model_from_excel...")
            model = import_model_from_excel(data_store['loader'], filtered_data, temp_file_path)

            if model is None:
                print("Failed to import model, model is None")
                return jsonify({'success': False, 'error': 'Failed to import model'}), 400

            # Store the model
            model_name = model.name
            print(f"Imported model: {model_name}")
            data_store['models'][model_name] = model
            data_store['active_model'] = model_name

            # Get model stats
            if model.results:
                print(f"Model has results with {len(model.features)} features")
                # Convert to Python native types for JSON serialization
                coefficients = {
                    var: float(model.results.params[var])
                    for var in model.features + ['const']
                    if var in model.results.params
                }

                t_stats = {
                    var: float(model.results.tvalues[var])
                    for var in model.features + ['const']
                    if var in model.results.tvalues
                }

                model_summary = {
                    'name': model.name,
                    'kpi': model.kpi,
                    'features': model.features,
                    'coefficients': coefficients,
                    't_stats': t_stats,
                    'rsquared': float(model.results.rsquared) if model.results else None,
                    'adjrsquared': float(model.results.rsquared_adj) if model.results else None,
                    'fvalue': float(model.results.fvalue) if model.results else None,
                    'obs': int(model.results.nobs) if model.results else None
                }
            else:
                print("Model has no results")
                model_summary = {
                    'name': model.name,
                    'kpi': model.kpi,
                    'features': model.features,
                }

            return jsonify({
                'success': True,
                'model': model_summary
            }), 200

        except Exception as import_error:
            print(f"Error in import_model_from_excel: {str(import_error)}")
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(import_error)}), 500

        finally:
            # Clean up the temp file in a try-except block
            try:
                # Wait a moment to ensure file handles are released
                import time
                time.sleep(1)

                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                    print(f"Temp file {temp_file_path} removed")
                else:
                    print(f"Temp file {temp_file_path} not found for cleanup")
            except Exception as cleanup_error:
                # Just log the error but don't fail the whole operation
                print(f"Warning: Could not remove temp file: {str(cleanup_error)}")

    except Exception as e:
        print(f"ERROR in import_model: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/filter', methods=['POST'])
def filter_data():
    try:
        data = request.json
        start_date = data.get('startDate')
        end_date = data.get('endDate')

        if not data_store['loader']:
            return jsonify({'success': False, 'error': 'No data loaded yet'}), 400

        # Filter the data
        filtered_data = data_store['loader'].filter_date_range(start_date, end_date)

        if filtered_data is None:
            return jsonify({'success': False, 'error': 'Failed to filter data'}), 400

        # Return preview of filtered data
        preview = filtered_data.head(10).to_dict(orient='records')

        return jsonify({
            'success': True,
            'preview': preview,
            'rowCount': len(filtered_data)
        }), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/update-transformation', methods=['POST'])
def update_transformation():
    try:
        data = request.json
        variable_name = data.get('variable')
        transformation = data.get('transformation')

        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        loader = data_store['loader']
        loader.set_transformation(variable_name, transformation)

        return jsonify({'success': True}), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/update-group', methods=['POST'])
def update_group():
    try:
        data = request.json
        variable_name = data.get('variable')
        group = data.get('group')

        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        # If loader doesn't have group functionality, add it
        if not hasattr(data_store['loader'], 'set_group'):
            data_store['loader'].variable_groups = {}
            data_store['loader'].set_group = lambda var, grp: data_store['loader'].variable_groups.update({var: grp})
            data_store['loader'].get_group = lambda var: data_store['loader'].variable_groups.get(var, 'Other')

        loader = data_store['loader']
        loader.set_group(variable_name, group)

        return jsonify({'success': True}), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/split-variable', methods=['POST'])
def split_variable():
    try:
        data = request.json
        variable = data.get('variable')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        identifier = data.get('identifier')

        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        loader = data_store['loader']
        data_df = loader.get_data()

        # Convert dates
        if start_date:
            start_date = pd.to_datetime(start_date)
        if end_date:
            end_date = pd.to_datetime(end_date)

        # Apply split
        from src.variable_transformations import split_by_date
        data_df, new_var_name = split_by_date(data_df, variable, start_date, end_date, identifier, inplace=True)

        # Update the loader data
        loader._data = data_df

        return jsonify({
            'success': True,
            'newVariable': new_var_name
        }), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/multiply-variables', methods=['POST'])
def multiply_variables():
    try:
        data = request.json
        var1 = data.get('var1')
        var2 = data.get('var2')
        identifier = data.get('identifier')

        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        loader = data_store['loader']
        data_df = loader.get_data()

        # Apply multiplication
        from src.variable_transformations import multiply_variables
        data_df, new_var_name = multiply_variables(data_df, var1, var2, identifier, inplace=True)

        # Update the loader data
        loader._data = data_df

        return jsonify({
            'success': True,
            'newVariable': new_var_name
        }), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/create-lead-lag', methods=['POST'])
def create_lead_lag():
    try:
        data = request.json
        variable = data.get('variable')
        periods = data.get('periods')
        type_name = data.get('type')

        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        loader = data_store['loader']
        data_df = loader.get_data()

        # Apply lead/lag
        from src.variable_transformations import create_lead, create_lag

        if type_name.upper() == 'LEAD':
            data_df, new_var_names = create_lead(data_df, variable, periods, inplace=True)
        else:
            data_df, new_var_names = create_lag(data_df, variable, periods, inplace=True)

        # Update the loader data
        loader._data = data_df

        return jsonify({
            'success': True,
            'newVariable': new_var_names[0] if new_var_names else None
        }), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/create-weighted-variable', methods=['POST', 'OPTIONS'])
def create_weighted_variable():
    """Create a weighted variable by combining multiple variables with coefficients."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')
        base_name = data.get('baseName')
        coefficients = data.get('coefficients')

        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        if not base_name:
            return jsonify({'success': False, 'error': 'Base name is required'}), 400

        if not coefficients:
            return jsonify({'success': False, 'error': 'Coefficients are required'}), 400

        # Get the model
        if model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{model_name}' not found"}), 404

        model = data_store['models'][model_name]

        # Create the weighted variable name
        var_name = f"{base_name}|WGTD"

        # Initialize the weighted variable with zeros
        model.model_data[var_name] = 0.0

        # Add each component with its coefficient
        for component_var, coef in coefficients.items():
            if component_var in model.model_data.columns:
                model.model_data[var_name] += float(coef) * model.model_data[component_var]
            else:
                print(f"Warning: Variable '{component_var}' not found in model data. Skipping.")

        # Store the weighted variable information in the model
        if not hasattr(model, 'wgtd_variables'):
            model.wgtd_variables = {}

        model.wgtd_variables[var_name] = {
            'base_name': base_name,
            'components': coefficients
        }

        # CRITICAL: Also update the data in the data loader
        if data_store['loader'] is not None:
            # Add the variable to the main data frame in the loader
            data_store['loader']._data = data_store['loader'].get_data()
            data_store['loader']._data[var_name] = model.model_data[var_name]

            # If the loader has a "data" attribute, update that too (some loaders use this)
            if hasattr(data_store['loader'], 'data'):
                data_store['loader'].data[var_name] = model.model_data[var_name]

        # Try to save the weighted variable definition to a file for persistence
        try:
            from src.weighted_variables import save_weighted_vars_to_file
            save_weighted_vars_to_file(model)
        except ImportError:
            print("Warning: Could not save weighted variable definition to file.")

        return jsonify({
            'success': True,
            'newVariable': var_name,
            'message': f"Created weighted variable '{var_name}'"
        }), 200

    except Exception as e:
        print(f"ERROR in create_weighted_variable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/get-weighted-variable', methods=['POST', 'OPTIONS'])
def get_weighted_variable():
    """Get the components of a weighted variable."""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')
        variable_name = data.get('variableName')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not variable_name:
            return jsonify({'success': False, 'error': 'Variable name is required'}), 400

        model = data_store['models'][model_name]

        # Check if the model has weighted variables
        if not hasattr(model, 'wgtd_variables') or variable_name not in model.wgtd_variables:
            return jsonify({
                'success': False,
                'error': f'No weighted variable found with name: {variable_name}'
            }), 404

        # Get the weighted variable info
        wgtd_info = model.wgtd_variables[variable_name]

        return jsonify({
            'success': True,
            'components': wgtd_info.get('components', {}),
            'baseName': wgtd_info.get('base_name', '')
        }), 200

    except Exception as e:
        print(f"ERROR in get_weighted_variable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/update-weighted-variable', methods=['POST', 'OPTIONS'])
def update_weighted_variable():
    """Update a weighted variable with new coefficients."""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')
        variable_name = data.get('variableName')
        coefficients = data.get('coefficients')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not variable_name:
            return jsonify({'success': False, 'error': 'Variable name is required'}), 400

        if not coefficients:
            return jsonify({'success': False, 'error': 'Coefficients are required'}), 400

        model = data_store['models'][model_name]

        # Check if the model has weighted variables
        if not hasattr(model, 'wgtd_variables') or variable_name not in model.wgtd_variables:
            return jsonify({
                'success': False,
                'error': f'No weighted variable found with name: {variable_name}'
            }), 404

        # Get the weighted variable info
        wgtd_info = model.wgtd_variables[variable_name]
        base_name = wgtd_info.get('base_name', '')

        # Update with new coefficients
        # First, reset the variable to zero
        model.model_data[variable_name] = 0.0

        # Add each component with its new coefficient
        for component_var, coef in coefficients.items():
            if component_var in model.model_data.columns:
                model.model_data[variable_name] += float(coef) * model.model_data[component_var]
            else:
                print(f"Warning: Variable '{component_var}' not found in model data. Skipping.")

        # Update the weighted variable information
        model.wgtd_variables[variable_name] = {
            'base_name': base_name,
            'components': coefficients
        }

        # Update the data in the data loader
        if data_store['loader'] is not None:
            # Update the variable in the main data frame
            data_store['loader']._data = data_store['loader'].get_data()
            data_store['loader']._data[variable_name] = model.model_data[variable_name]

            # If the loader has a "data" attribute, update that too
            if hasattr(data_store['loader'], 'data'):
                data_store['loader'].data[variable_name] = model.model_data[variable_name]

        # Try to save the weighted variable definition to a file
        try:
            from src.weighted_variables import save_weighted_vars_to_file
            save_weighted_vars_to_file(model)
        except ImportError:
            print("Warning: Could not save weighted variable definition to file.")

        return jsonify({
            'success': True,
            'message': f"Updated weighted variable '{variable_name}'"
        }), 200

    except Exception as e:
        print(f"ERROR in update_weighted_variable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/create', methods=['POST'])
def create_model():
    try:
        data = request.json
        model_name = data.get('modelName', '').strip()  # Add strip()
        kpi = data.get('kpi', '').strip()  # Add strip()

        # Add validation for empty strings after strip()
        if not model_name:
            return jsonify({'success': False, 'error': 'Model name cannot be empty'}), 400

        if not kpi:
            return jsonify({'success': False, 'error': 'KPI cannot be empty'}), 400

        if not data_store['loader']:
            return jsonify({'success': False, 'error': 'No data loaded yet'}), 400

        # Check if model already exists
        if model_name in data_store['models']:
            return jsonify({'success': False, 'error': f'Model "{model_name}" already exists'}), 400

        # Create a new model
        model = LinearModel(name=model_name, loader=data_store['loader'])

        # Get the data (filtered if available)
        loader_data = data_store['loader'].get_data()

        # Set the data
        model.set_data(loader_data)

        # Set the KPI
        model.set_kpi(kpi)

        # Initialize the model (fit with just the constant)
        model.initialize_model()

        # Store the model
        data_store['models'][model_name] = model
        data_store['active_model'] = model_name

        # Get model summary stats
        summary = {
            'name': model.name,
            'kpi': model.kpi,
            'features': model.features,
            'rsquared': float(model.results.rsquared) if model.results else None,
            'adjrsquared': float(model.results.rsquared_adj) if model.results else None,
            'obs': int(model.results.nobs) if model.results else None
        }

        return jsonify({
            'success': True,
            'model': summary
        }), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/add-var', methods=['POST'])
def add_variable():
    try:
        data = request.json
        model_name = data.get('modelName', data_store['active_model'])
        variables = data.get('variables', [])
        adstock_rates = data.get('adstockRates', [0] * len(variables))

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]

        # Add each variable
        for i, var in enumerate(variables):
            adstock = adstock_rates[i] if i < len(adstock_rates) else 0

            # Apply adstock if needed
            if adstock > 0:
                adstock_var = f"{var}_adstock_{int(adstock*100)}"
                model.model_data[adstock_var] = apply_adstock(model.model_data[var], adstock)
                model.features.append(adstock_var)
            else:
                model.features.append(var)

        # REPLACE THIS SECTION - The issue might be here
        # Instead of calling model.fit(), use the same pattern as in remove_variable
        try:
            # Prepare data for fitting
            y = model.model_data[model.kpi]

            # Add the features and constant
            X = sm.add_constant(model.model_data[model.features])

            # Fit the model
            model.model = sm.OLS(y, X)
            model.results = model.model.fit()

            # Return success response with updated model info
            coefficients = {
                var: float(model.results.params[var])
                for var in model.features + ['const']
                if var in model.results.params
            }

            return jsonify({
                'success': True,
                'model': {
                    'name': model.name,
                    'kpi': model.kpi,
                    'features': model.features,
                    'coefficients': coefficients,
                    'rsquared': float(model.results.rsquared) if model.results else None
                }
            }), 200
        except Exception as e:
            print(f"Error fitting model: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Error fitting model: {str(e)}'}), 500

    except Exception as e:
        print(f"ERROR in add_variable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/remove-var', methods=['POST'])
def remove_variable():
    try:
        data = request.json
        model_name = data.get('modelName')
        variables = data.get('variables', [])

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]

        # Check if any variables don't exist in the model
        invalid_vars = [var for var in variables if var not in model.features]
        if invalid_vars:
            return jsonify({'success': False, 'error': f'Variables not in model: {", ".join(invalid_vars)}'}), 400

        # Remove variables
        for var in variables:
            if var in model.features:
                model.features.remove(var)

        # Prepare data for fitting
        y = model.model_data[model.kpi]

        # If no features left, just fit with constant
        X = sm.add_constant(pd.DataFrame(index=y.index))  # Just the constant term

        # Fit the model
        model.model = sm.OLS(y, X)
        model.results = model.model.fit()

        # Prepare response
        response_data = {
            'name': model.name,
            'features': model.features,
            'rsquared': float(model.results.rsquared) if model.results else None
        }

        # Add coefficients if available
        if model.results:
            response_data['coefficients'] = {
                'const': float(model.results.params['const'])
            }
            response_data['t_stats'] = {
                'const': float(model.results.tvalues['const'])
            }

        return jsonify({
            'success': True,
            'model': response_data
        }), 200

    except Exception as e:
        print(f"ERROR in remove_variable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Add or enhance the test_model_variables function in app.py:

@app.route('/api/models/test-vars', methods=['POST'])
def test_model_variables():
    try:
        data = request.json
        model_name = data.get('modelName', data_store['active_model'])
        variables = data.get('variables', [])
        adstock_rates = data.get('adstockRates', [0] * len(variables))

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]

        # Initialize the results array
        test_results = []

        # Calculate baseline statistics for the current model
        baseline_rsquared = model.results.rsquared

        # Get the residuals for correlations
        residuals = model.results.resid

        # Process each variable to test
        for i, var_name in enumerate(variables):
            adstock_rate = adstock_rates[i] if i < len(adstock_rates) else 0

            # Check if we need to apply adstock
            test_var_name = var_name
            if adstock_rate > 0:
                # Use the existing adstock variable if it exists
                adstock_var = f"{var_name}_adstock_{int(adstock_rate*100)}"
                if adstock_var in model.model_data.columns:
                    test_var_name = adstock_var
                else:
                    # Apply adstock and create a temporary variable
                    from src.model_operations import apply_adstock
                    model.model_data[adstock_var] = apply_adstock(model.model_data[var_name], adstock_rate)
                    test_var_name = adstock_var

            # Check for multicollinearity with existing features
            vif = 1.0  # Default value (no multicollinearity)
            try:
                from statsmodels.stats.outliers_influence import variance_inflation_factor
                import pandas as pd
                import numpy as np

                # Create a dataframe with existing features plus the test variable
                features_with_var = model.features + [test_var_name]
                X = model.model_data[features_with_var].copy()

                # Add the constant manually
                X['const'] = 1.0

                # Calculate VIF
                vif = variance_inflation_factor(X.values, len(features_with_var))
            except Exception as e:
                print(f"VIF calculation error: {str(e)}")

            # Test the variable by adding it to a copy of the model
            import statsmodels.api as sm
            import pandas as pd

            y = model.model_data[model.kpi]

            # Create a DataFrame with existing features
            X = pd.DataFrame()
            for feature in model.features:
                X[feature] = model.model_data[feature]

            # Add constant and new variable
            X = sm.add_constant(X)
            X[test_var_name] = model.model_data[test_var_name]

            # Fit the extended model
            try:
                extended_model = sm.OLS(y, X)
                extended_results = extended_model.fit()

                # Calculate correlation with residuals
                corr_with_resid = 0
                if len(residuals) > 0:
                    # Make sure the indexes match
                    common_idx = residuals.index.intersection(model.model_data.index)
                    if len(common_idx) > 0:
                        resid_series = pd.Series(residuals).loc[common_idx]
                        var_series = model.model_data[test_var_name].loc[common_idx]
                        corr_with_resid = float(resid_series.corr(var_series))

                # Get coefficient and t-stat
                coefficient = extended_results.params[test_var_name]
                t_stat = extended_results.tvalues[test_var_name]
                p_value = extended_results.pvalues[test_var_name]

                # Calculate R-squared increase
                rsquared_increase = extended_results.rsquared - baseline_rsquared

                # Store results for this variable
                test_results.append({
                    'Variable': var_name,
                    'Coefficient': float(coefficient),
                    'T-stat': float(t_stat),
                    'P-value': float(p_value),
                    'VIF': float(vif),
                    'Rsquared_Increase': float(rsquared_increase),
                    'Correlation_with_Residuals': float(corr_with_resid)
                })

            except Exception as e:
                print(f"Error testing variable {var_name}: {str(e)}")
                import traceback
                traceback.print_exc()

                # Add an entry with error information
                test_results.append({
                    'Variable': var_name,
                    'Coefficient': 0,
                    'T-stat': 0,
                    'P-value': 1,
                    'VIF': 1,
                    'Rsquared_Increase': 0,
                    'Correlation_with_Residuals': 0,
                    'Error': str(e)
                })

        return jsonify({
            'success': True,
            'results': test_results
        }), 200

    except Exception as e:
        print(f"ERROR in test_model_variables: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/chart-vars', methods=['POST'])
def chart_variables():
    try:
        data = request.json
        print(f"Received data: {data}")
        model_name = data.get('modelName')
        variables = data.get('variables', [])

        if not variables:
            return jsonify({'success': False, 'error': 'No variables specified'}), 400

        # Check if we have a loader with data
        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        # Get data from the loader
        df = data_store['loader'].get_data()
        if df is None or len(df) == 0:
            return jsonify({'success': False, 'error': 'No data available'}), 400

        # Debug data
        print(f"Data shape: {df.shape}")
        print(f"Data index type: {type(df.index).__name__}")
        print(f"First 3 rows: {df.head(3)}")

        # Check if variables exist in the dataframe
        missing_vars = [var for var in variables if var not in df.columns]
        if missing_vars:
            return jsonify({'success': False, 'error': f'Variables not found: {", ".join(missing_vars)}'}), 400

        # Prepare chart data
        chart_data = []

        for var in variables:
            series_data = []

            # Make sure the dataframe is sorted by index
            sorted_df = df.sort_index()

            for idx, value in zip(sorted_df.index, sorted_df[var]):
                # Handle date conversion
                if hasattr(idx, 'isoformat'):
                    x_value = idx.isoformat()
                else:
                    x_value = str(idx)

                # Handle NaN values
                if pd.isnull(value):
                    y_value = 0
                else:
                    try:
                        y_value = float(value)
                    except:
                        y_value = 0

                series_data.append({
                    'x': x_value,
                    'y': y_value
                })

            # Debug
            print(f"Series {var} has {len(series_data)} data points")
            if series_data:
                print(f"First data point: {series_data[0]}")

            chart_data.append({
                'name': var,
                'data': series_data
            })

        # Final check to ensure we have data
        if not chart_data or not any(series['data'] for series in chart_data):
            return jsonify({'success': False, 'error': 'No data points available for the selected variables'}), 400

        response_data = {
            'success': True,
            'chartData': chart_data
        }

        print(f"Returning chart data for {len(chart_data)} series")

        return jsonify(response_data), 200

    except Exception as e:
        print(f"ERROR in chart_variables: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/list', methods=['GET'])
def list_models():
    try:
        models = []
        for name, model in data_store['models'].items():
            models.append({
                'name': model.name,
                'kpi': model.kpi,
                'variables': len(model.features),
                'rsquared': float(model.results.rsquared) if model.results else None,
                'created': 'Today' # In a real app, you'd store and return an actual timestamp
            })

        return jsonify({
            'success': True,
            'models': models,
            'activeModel': data_store['active_model']
        }), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500



# Add these routes to your app.py file

@app.route('/api/models/get-variables', methods=['POST', 'OPTIONS'])
def get_model_variables():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    print("=== get_model_variables called ===")
    print(f"Request JSON: {request.json}")

    try:
        data = request.json
        model_name = data.get('modelName')

        print(f"Requested model_name: {model_name}")
        print(f"Available models: {list(data_store['models'].keys())}")

        if not model_name or model_name not in data_store['models']:
            print(f"Model not found: {model_name}")
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]
        print(f"Model retrieved: {model.name}")

        # Get variable information
        variables = []

        if hasattr(model, 'results') and model.results is not None:
            print(f"Model has results with params: {len(model.results.params)}")

            # Add constant term
            if 'const' in model.results.params:
                print(f"Adding const term with coef: {float(model.results.params['const'])}")
                variables.append({
                    'name': 'const',
                    'coefficient': float(model.results.params['const']),
                    'tStat': float(model.results.tvalues['const']),
                    'type': 'CONSTANT',
                    'transformation': 'None',
                    'group': 'Base'
                })

            # Get loader transformation info if available
            transformations = {}
            if data_store['loader'] is not None:
                transformations = data_store['loader'].get_transformations() or {}

            # Add model features
            for feature in model.features:
                if feature in model.results.params:
                    print(f"Adding feature: {feature}")

                    # Determine transformation
                    transformation = 'None'

                    # 1. Check feature_transformations in model
                    if hasattr(model, 'feature_transformations') and feature in model.feature_transformations:
                        transformation = model.feature_transformations[feature]

                    # 2. Check loader transformations
                    elif feature in transformations:
                        transformation = transformations[feature]

                    # 3. Check if it's a base variable
                    base_var = feature
                    if '|' in feature:
                        base_var = feature.split('|')[0]
                    elif '_adstock_' in feature:
                        base_var = feature.split('_adstock_')[0]

                    if base_var != feature and base_var in transformations:
                        transformation = transformations[base_var]

                    # Determine variable type
                    var_type = 'NUMERIC'
                    if feature in model.model_data.columns:
                        if pd.api.types.is_categorical_dtype(model.model_data[feature]):
                            var_type = 'CATEGORICAL'

                    # Determine variable group (if available)
                    group = 'Other'
                    if hasattr(model, 'variable_groups') and feature in model.variable_groups:
                        group = model.variable_groups[feature].get('Group', 'Other')

                    variables.append({
                        'name': feature,
                        'coefficient': float(model.results.params[feature]),
                        'tStat': float(model.results.tvalues[feature]),
                        'type': var_type,
                        'transformation': transformation,
                        'group': group
                    })
        else:
            print("Model has no results")

        print(f"Returning {len(variables)} variables")
        return jsonify({
            'success': True,
            'variables': variables
        }), 200

    except Exception as e:
        print(f"ERROR in get_model_variables: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/preview-add-var', methods=['POST', 'OPTIONS'])
def preview_add_variables():

    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    print("=== preview_add_variables called ===")
    print(f"Request JSON: {request.json}")

    try:
        import traceback
        data = request.json
        model_name = data.get('modelName')
        variables = data.get('variables', [])
        adstock_rates = data.get('adstockRates', [0] * len(variables))

        print(f"model_name: {model_name}")
        print(f"variables: {variables}")
        print(f"adstock_rates: {adstock_rates}")

        if not model_name or model_name not in data_store['models']:
            print(f"Invalid model name: {model_name}")
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]
        print(f"Model retrieved: {model.name}")

        # Create a copy of the model for preview
        import copy
        preview_model = copy.deepcopy(model)

        # Store original coefficients and t-stats
        original_coeffs = {}
        original_tstats = {}
        if preview_model.results is not None:
            for var in preview_model.results.params.index:
                original_coeffs[var] = float(preview_model.results.params[var])
                original_tstats[var] = float(preview_model.results.tvalues[var])

        print(f"Original coefficients count: {len(original_coeffs)}")

        # Add new variables with adstock if needed
        for i, var in enumerate(variables):
            print(f"Processing variable: {var}")
            adstock_rate = adstock_rates[i] if i < len(adstock_rates) else 0

            # Check if variable exists in data
            if var not in preview_model.model_data.columns:
                print(f"Variable not found in model data: {var}")
                return jsonify({
                    'success': False,
                    'error': f'Variable not found: {var}'
                }), 400

            # Handle adstock
            if adstock_rate > 0:
                from src.model_operations import apply_adstock
                adstock_var = f"{var}_adstock_{int(adstock_rate*100)}"
                print(f"Creating adstock variable: {adstock_var}")
                preview_model.model_data[adstock_var] = apply_adstock(
                    preview_model.model_data[var], adstock_rate
                )
                preview_model.features.append(adstock_var)
            else:
                print(f"Adding variable without adstock: {var}")
                preview_model.features.append(var)

        # Prepare data for the new model
        import statsmodels.api as sm
        import pandas as pd
        import numpy as np
        y = preview_model.model_data[preview_model.kpi]
        print(f"KPI: {preview_model.kpi} with {len(y)} observations")

        print(f"Features: {preview_model.features}")
        X = sm.add_constant(preview_model.model_data[preview_model.features])
        print(f"Design matrix X shape: {X.shape}")

        # Check for nulls in X or y
        if X.isnull().any().any():
            print("WARNING: Nulls in design matrix X")
            null_counts = X.isnull().sum()
            print(f"Null counts by column: {null_counts[null_counts > 0]}")

            # Fill nulls with zeros
            X = X.fillna(0)
            print("Filled nulls with zeros")

        if y.isnull().any():
            print("WARNING: Nulls in target variable y")
            print(f"Null count in y: {y.isnull().sum()}")

            # Fill nulls with mean or 0
            y = y.fillna(y.mean() if not pd.isna(y.mean()) else 0)
            print("Filled nulls in target variable")

        # Fit the preview model
        try:
            print("Fitting model...")
            preview_results = sm.OLS(y, X).fit()
            print(f"Model fit successful, R-squared: {preview_results.rsquared}")

            # Prepare comparison data
            comparison = []

            # Add existing variables
            for var in original_coeffs:
                if var in preview_results.params:
                    new_coef = float(preview_results.params[var])
                    new_tstat = float(preview_results.tvalues[var])

                    # Calculate percentage changes
                    if original_coeffs[var] != 0:
                        coef_pct_change = (new_coef / original_coeffs[var] - 1) * 100
                    else:
                        coef_pct_change = 0

                    if original_tstats[var] != 0:
                        tstat_pct_change = (new_tstat / original_tstats[var] - 1) * 100
                    else:
                        tstat_pct_change = 0

                    comparison.append({
                        'variable': var,
                        'coefficient': original_coeffs[var],
                        'newCoefficient': new_coef,
                        'coefficientPctChange': coef_pct_change,
                        'tStat': original_tstats[var],
                        'newTStat': new_tstat,
                        'tStatPctChange': tstat_pct_change
                    })

            # Add new variables
            for i, var in enumerate(variables):
                var_name = var
                if adstock_rates[i] > 0:
                    var_name = f"{var}_adstock_{int(adstock_rates[i]*100)}"

                if var_name in preview_results.params and var_name not in original_coeffs:
                    comparison.append({
                        'variable': var_name,
                        'coefficient': 0,
                        'newCoefficient': float(preview_results.params[var_name]),
                        'coefficientPctChange': 100,  # New, so 100% increase
                        'tStat': 0,
                        'newTStat': float(preview_results.tvalues[var_name]),
                        'tStatPctChange': 100  # New, so 100% increase
                    })

            print(f"Returning comparison with {len(comparison)} variables")
            return jsonify({
                'success': True,
                'comparison': comparison,
                'rsquared': float(preview_results.rsquared),
                'rsquared_adj': float(preview_results.rsquared_adj)
            }), 200

        except Exception as e:
            print(f"Error fitting preview model: {str(e)}")
            traceback.print_exc()
            return jsonify({'success': False, 'error': f'Error fitting model: {str(e)}'}), 500

    except Exception as e:
        import traceback
        print(f"ERROR in preview_add_variables: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/preview-remove-var', methods=['POST', 'OPTIONS'])
def preview_remove_variables():
    # Add OPTIONS method handler for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        model_name = data.get('modelName')
        variables = data.get('variables', [])

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]

        # Create a copy of the model for preview
        import copy
        preview_model = copy.deepcopy(model)

        # Store original coefficients and t-stats
        original_coeffs = {}
        original_tstats = {}
        if preview_model.results is not None:
            for var in preview_model.results.params.index:
                original_coeffs[var] = float(preview_model.results.params[var])
                original_tstats[var] = float(preview_model.results.tvalues[var])

        # Remove variables
        for var in variables:
            if var in preview_model.features:
                preview_model.features.remove(var)

        # Check if removing all variables - special case
        if not preview_model.features:
            # Fit model with just constant
            y = preview_model.model_data[preview_model.kpi]
            X = sm.add_constant(pd.DataFrame(index=y.index))
            preview_model.model = sm.OLS(y, X)
            preview_results = preview_model.model.fit()

            # Prepare comparison data
            comparison = []

            # Add constant term comparison
            if 'const' in original_coeffs and 'const' in preview_results.params:
                const_orig = original_coeffs['const']
                const_new = float(preview_results.params['const'])

                # Calculate percentage changes
                if const_orig != 0:
                    coef_pct_change = ((const_new - const_orig) / abs(const_orig)) * 100
                else:
                    coef_pct_change = 0

                tstat_orig = original_tstats['const']
                tstat_new = float(preview_results.tvalues['const'])

                if tstat_orig != 0:
                    tstat_pct_change = ((tstat_new - tstat_orig) / abs(tstat_orig)) * 100
                else:
                    tstat_pct_change = 0

                comparison.append({
                    'variable': 'const',
                    'coefficient': const_orig,
                    'newCoefficient': const_new,
                    'coefficientPctChange': float(coef_pct_change),
                    'tStat': tstat_orig,
                    'newTStat': tstat_new,
                    'tStatPctChange': float(tstat_pct_change)
                })

            # Add each removed variable
            for var in variables:
                if var in original_coeffs:
                    comparison.append({
                        'variable': var,
                        'coefficient': original_coeffs[var],
                        'newCoefficient': 0,
                        'coefficientPctChange': -100,  # Removed, so -100% decrease
                        'tStat': original_tstats[var],
                        'newTStat': 0,
                        'tStatPctChange': -100  # Removed, so -100% decrease
                    })

            return jsonify({
                'success': True,
                'comparison': comparison,
                'rsquared': float(preview_results.rsquared),
                'rsquared_adj': float(preview_results.rsquared_adj)
            }), 200

        # Normal case: If still have features, continue with original logic
        # Prepare data for the new model
        import statsmodels.api as sm
        y = preview_model.model_data[preview_model.kpi]
        X = sm.add_constant(preview_model.model_data[preview_model.features])

        # Fit the preview model
        try:
            preview_results = sm.OLS(y, X).fit()

            # Prepare comparison data
            comparison = []

            # Add constant term if it exists in both models
            if 'const' in original_coeffs and 'const' in preview_results.params:
                const_orig = original_coeffs['const']
                const_new = float(preview_results.params['const'])

                # Calculate percentage changes
                if const_orig != 0:
                    coef_pct_change = ((const_new - const_orig) / abs(const_orig)) * 100
                else:
                    coef_pct_change = 0

                tstat_orig = original_tstats['const']
                tstat_new = float(preview_results.tvalues['const'])

                if tstat_orig != 0:
                    tstat_pct_change = ((tstat_new - tstat_orig) / abs(tstat_orig)) * 100
                else:
                    tstat_pct_change = 0

                comparison.append({
                    'variable': 'const',
                    'coefficient': const_orig,
                    'newCoefficient': const_new,
                    'coefficientPctChange': float(coef_pct_change),
                    'tStat': tstat_orig,
                    'newTStat': tstat_new,
                    'tStatPctChange': float(tstat_pct_change)
                })

            # Add remaining variables
            for var in preview_model.features:
                if var in original_coeffs and var in preview_results.params:
                    new_coef = float(preview_results.params[var])
                    new_tstat = float(preview_results.tvalues[var])

                    # Calculate percentage changes
                    if original_coeffs[var] != 0:
                        coef_pct_change = ((new_coef - original_coeffs[var]) / abs(original_coeffs[var])) * 100
                    else:
                        coef_pct_change = 0

                    if original_tstats[var] != 0:
                        tstat_pct_change = ((new_tstat - original_tstats[var]) / abs(original_tstats[var])) * 100
                    else:
                        tstat_pct_change = 0

                    comparison.append({
                        'variable': var,
                        'coefficient': original_coeffs[var],
                        'newCoefficient': new_coef,
                        'coefficientPctChange': float(coef_pct_change),
                        'tStat': original_tstats[var],
                        'newTStat': new_tstat,
                        'tStatPctChange': float(tstat_pct_change)
                    })

            # Add removed variables (showing as removed)
            for var in variables:
                if var in original_coeffs:
                    comparison.append({
                        'variable': var,
                        'coefficient': original_coeffs[var],
                        'newCoefficient': 0,
                        'coefficientPctChange': -100,  # Removed, so -100% decrease
                        'tStat': original_tstats[var],
                        'newTStat': 0,
                        'tStatPctChange': -100  # Removed, so -100% decrease
                    })

            return jsonify({
                'success': True,
                'comparison': comparison,
                'rsquared': float(preview_results.rsquared),
                'rsquared_adj': float(preview_results.rsquared_adj)
            }), 200

        except Exception as e:
            print(f"Error fitting preview model: {str(e)}")
            return jsonify({'success': False, 'error': f'Error fitting model: {str(e)}'}), 500

    except Exception as e:
        print(f"ERROR in preview_remove_variables: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/clone', methods=['POST'])
def clone_model():
    try:
        data = request.json
        model_name = data.get('modelName')
        new_model_name = data.get('newModelName')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not new_model_name:
            return jsonify({'success': False, 'error': 'New model name is required'}), 400

        if new_model_name in data_store['models']:
            return jsonify({'success': False, 'error': 'A model with this name already exists'}), 400

        # Get the original model
        original_model = data_store['models'][model_name]

        # Create a deep copy of the model
        import copy
        new_model = copy.deepcopy(original_model)
        new_model.name = new_model_name

        # Store the new model
        data_store['models'][new_model_name] = new_model
        data_store['active_model'] = new_model_name

        return jsonify({
            'success': True,
            'message': f'Model "{model_name}" cloned as "{new_model_name}"'
        }), 200

    except Exception as e:
        print(f"ERROR in clone_model: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/filter', methods=['POST'])
def filter_model():
    try:
        data = request.json
        model_name = data.get('modelName')
        start_date = data.get('startDate')
        end_date = data.get('endDate')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not start_date or not end_date:
            return jsonify({'success': False, 'error': 'Start and end dates are required'}), 400

        # Get the model
        model = data_store['models'][model_name]

        # Convert dates
        import pandas as pd
        start_date = pd.to_datetime(start_date)
        end_date = pd.to_datetime(end_date)

        # Apply date filter
        model.set_date_range(start_date, end_date)

        return jsonify({
            'success': True,
            'message': f'Model filtered to date range: {start_date} to {end_date}'
        }), 200

    except Exception as e:
        print(f"ERROR in filter_model: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/test-curves', methods=['POST'])
def test_model_curves():
    try:
        data = request.json
        model_name = data.get('modelName')
        variable_name = data.get('variableName')
        curve_type = data.get('curveType', 'ICP')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not variable_name:
            return jsonify({'success': False, 'error': 'Variable name is required'}), 400

        model = data_store['models'][model_name]

        # Define parameter combinations based on curve type
        if curve_type == 'ICP':
            alphas = [3, 4]
            betas = [3, 4, 5]
            # Generate gamma options using your function
            variable_values = model.model_data[variable_name]
            gamma_options = generate_gamma_options(variable_values, n_options=10)
            curve_function = apply_icp_curve
        else:  # ADBUG
            alphas = [0.8, 0.9, 1.0]
            betas = [2, 3, 4]
            # Generate gamma options using your function
            variable_values = model.model_data[variable_name]
            gamma_options = generate_gamma_options(variable_values, n_options=10)
            curve_function = apply_adbug_curve

        # Create all combinations and test them
        results = []
        for alpha in alphas:
            for beta in betas:
                for gamma in gamma_options:
                    # Test the curve
                    result = test_curve_transform_model(
                        model, variable_name, curve_function,
                        alpha, beta, gamma, curve_type
                    )
                    if result:
                        # Format for the frontend
                        formatted_result = {
                            'curveName': result['Variable'],
                            'alpha': float(result['Alpha']),
                            'beta': float(result['Beta']),
                            'gamma': float(result['Gamma']),
                            'coefficient': float(result['Coefficient']),
                            'tStat': float(result['T-stat']),
                            'pValue': float(result['P-value']),
                            'rSquaredIncrease': float(result['R² Increase']),
                        }

                        # Add switch point for ICP curves
                        if curve_type == 'ICP' and 'Switch Point' in result:
                            formatted_result['switchPoint'] = float(result['Switch Point'])

                        results.append(formatted_result)

        # Sort results by t-stat magnitude (absolute value)
        results.sort(key=lambda x: abs(x['tStat']), reverse=True)

        return jsonify({
            'success': True,
            'results': results
        }), 200

    except Exception as e:
        print(f"ERROR in test_model_curves: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/curve-data', methods=['POST'])
def get_curve_data():
    try:
        data = request.json
        model_name = data.get('modelName')
        variable_name = data.get('variableName')
        curve_type = data.get('curveType', 'ICP')
        curves = data.get('curves', [])

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not variable_name:
            return jsonify({'success': False, 'error': 'Variable name is required'}), 400

        if not curves:
            return jsonify({'success': False, 'error': 'No curves selected'}), 400

        model = data_store['models'][model_name]

        # Import curve functions
        from src.curve_transformations import apply_icp_curve, apply_adbug_curve

        # Get the original variable data
        original_values = model.model_data[variable_name]
        max_value = original_values.max()

        # Create range of x values from 0 to slightly above max value
        x_values = list(np.linspace(0, max_value * 1.2, 100))

        # Choose appropriate curve function
        curve_function = apply_icp_curve if curve_type == 'ICP' else apply_adbug_curve

        # Prepare chart data
        chart_data = []

        for curve in curves:
            alpha = curve['alpha']
            beta = curve['beta']
            gamma = curve['gamma']

            # Create curve data
            y_values = []
            for x in x_values:
                # Apply the curve function
                try:
                    y = float(curve_function(x, alpha, beta, gamma))
                    y_values.append(y)
                except:
                    y_values.append(None)

            # Format for charting
            curve_data = {
                'name': f"α={alpha:.2f}, β={beta:.2f}, γ={gamma:.2f}",
                'data': [{'x': x, 'y': y} for x, y in zip(x_values, y_values) if y is not None]
            }

            # Add switch point for ICP curves
            if curve_type == 'ICP' and alpha > 1:
                switch_point = gamma * ((alpha - 1) / (alpha + 1)) ** (1 / alpha)
                if 0 < switch_point < max_value * 1.2:
                    switch_y = float(curve_function(switch_point, alpha, beta, gamma))
                    curve_data['switchPoint'] = {
                        'x': float(switch_point),
                        'y': float(switch_y)
                    }

            chart_data.append(curve_data)

        return jsonify({
            'success': True,
            'chartData': chart_data
        }), 200

    except Exception as e:
        print(f"ERROR in get_curve_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/add-curves', methods=['POST'])
def add_curves_to_model():
    try:
        data = request.json
        model_name = data.get('modelName')
        variable_name = data.get('variableName')
        curve_type = data.get('curveType', 'ICP')
        curves = data.get('curves', [])

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not variable_name:
            return jsonify({'success': False, 'error': 'Variable name is required'}), 400

        if not curves:
            return jsonify({'success': False, 'error': 'No curves selected'}), 400

        model = data_store['models'][model_name]

        # Import curve functions
        from src.curve_transformations import apply_icp_curve, apply_adbug_curve

        # Choose appropriate curve function
        curve_function = apply_icp_curve if curve_type == 'ICP' else apply_adbug_curve

        # Get the original variable data
        original_values = model.model_data[variable_name]

        added_curves = []

        # Apply each curve transformation and add to model data
        for curve in curves:
            alpha = curve['alpha']
            beta = curve['beta']
            gamma = curve['gamma']
            curve_name = curve['curveName']

            # Apply the transformation
            transformed_values = curve_function(original_values, alpha, beta, gamma)

            # Store in model data
            model.model_data[curve_name] = transformed_values

            # Track added curves
            added_curves.append(curve_name)

        return jsonify({
            'success': True,
            'addedCurves': added_curves,
            'message': f'Added {len(added_curves)} curve variables to the model'
        }), 200

    except Exception as e:
        print(f"ERROR in add_curves_to_model: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/create-curve-variables', methods=['POST'])
def create_curve_variables():
    try:
        data = request.json
        model_name = data.get('modelName')
        variable_name = data.get('variableName')
        curve_type = data.get('curveType', 'ICP')
        curves = data.get('curves', [])

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not variable_name:
            return jsonify({'success': False, 'error': 'Variable name is required'}), 400

        if not curves:
            return jsonify({'success': False, 'error': 'No curves selected'}), 400

        model = data_store['models'][model_name]

        # Import curve functions
        from src.curve_transformations import apply_icp_curve, apply_adbug_curve

        # Choose appropriate curve function
        curve_function = apply_icp_curve if curve_type == 'ICP' else apply_adbug_curve

        # Get the original variable data
        data_df = None
        if data_store['loader'] is not None:
            data_df = data_store['loader'].get_data()
        elif model.model_data is not None:
            data_df = model.model_data

        if data_df is None:
            return jsonify({'success': False, 'error': 'No data available'}), 400

        original_values = data_df[variable_name]

        created_variables = []

        # Apply each curve transformation and store as new variables
        for curve in curves:
            alpha = curve['alpha']
            beta = curve['beta']
            gamma = curve['gamma']
            curve_name = curve['curveName']

            # Apply the transformation
            transformed_values = curve_function(original_values, alpha, beta, gamma)

            # Store the transformed values in the data
            data_df[curve_name] = transformed_values

            # Register the transformation for export
            if hasattr(data_store['loader'], 'register_transformation'):
                transformation_info = {
                    'type': curve_type,
                    'params': {
                        'alpha': alpha,
                        'beta': beta,
                        'gamma': gamma
                    },
                    'baseVariable': variable_name
                }
                data_store['loader'].register_transformation(curve_name, transformation_info)

            # Track created variables
            created_variables.append(curve_name)

        # Update the loader data if it exists
        if data_store['loader'] is not None:
            data_store['loader']._data = data_df

        return jsonify({
            'success': True,
            'createdVariables': created_variables,
            'message': f'Created {len(created_variables)} curve variables'
        }), 200

    except Exception as e:
        print(f"ERROR in create_curve_variables: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/data/create-variable-curve', methods=['POST'])
def create_variable_curve():
    try:
        data = request.json
        variable_name = data.get('variableName')
        curve_type = data.get('curveType', 'ICP')
        alpha = data.get('alpha', 3.0)
        beta = data.get('beta', 4.0)
        gamma = data.get('gamma', 100.0)
        adstock_rate = data.get('adstockRate', 0.0)
        identifier = data.get('identifier', '')

        if data_store['loader'] is None:
            return jsonify({'success': False, 'error': 'No data loaded'}), 400

        loader = data_store['loader']
        data_df = loader.get_data()

        if variable_name not in data_df.columns:
            return jsonify({'success': False, 'error': f'Variable {variable_name} not found'}), 400

        # Import required functions
        from src.curve_transformations import apply_icp_curve, apply_adbug_curve
        from src.model_operations import apply_adstock

        # Get original values
        original_values = data_df[variable_name].copy()

        # Create full identifier if not provided
        if not identifier:
            identifier = f"{curve_type}_a{alpha}_b{beta}_g{gamma}"
            if adstock_rate > 0:
                identifier += f"_ads{int(adstock_rate*100)}"

        # First apply adstock if needed
        adstocked_values = None
        if adstock_rate > 0:
            adstocked_values = apply_adstock(original_values, adstock_rate)

            # Create adstock variable name
            adstock_var_name = f"{variable_name}_adstock_{int(adstock_rate*100)}"

            # Store adstocked values in dataframe
            data_df[adstock_var_name] = adstocked_values

            # Register adstock transformation if possible
            if hasattr(loader, 'register_transformation'):
                loader.register_transformation(adstock_var_name, {
                    'type': 'adstock',
                    'rate': adstock_rate,
                    'baseVariable': variable_name
                })

            # Use this as input for curve
            input_values = adstocked_values
            input_var_name = adstock_var_name
        else:
            # Use original values as input for curve
            input_values = original_values
            input_var_name = variable_name

        # Apply the curve transformation
        if curve_type == 'ICP':
            curve_function = apply_icp_curve
        else:  # ADBUG
            curve_function = apply_adbug_curve

        transformed_values = curve_function(input_values, alpha, beta, gamma)

        # Create curve variable name
        curve_var_name = f"{input_var_name}|{curve_type} {identifier}"

        # Store transformed values in dataframe
        data_df[curve_var_name] = transformed_values

        # Register curve transformation if possible
        if hasattr(loader, 'register_transformation'):
            loader.register_transformation(curve_var_name, {
                'type': curve_type,
                'params': {
                    'alpha': alpha,
                    'beta': beta,
                    'gamma': gamma
                },
                'baseVariable': input_var_name
            })

        # Update the loader data
        loader._data = data_df

        return jsonify({
            'success': True,
            'newVariable': curve_var_name
        }), 200

    except Exception as e:
        print(f"ERROR in create_variable_curve: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

### DIAGNOSTICS ###
@app.route('/api/models/run-diagnostics', methods=['POST'])
def run_model_diagnostics():
    """Run diagnostic tests on a model."""
    try:
        data = request.json
        model_name = data.get('modelName')
        tests = data.get('tests', [])

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not tests:
            return jsonify({'success': False, 'error': 'No tests specified'}), 400

        # Get the model
        model = data_store['models'][model_name]

        # Check if model has results
        if not hasattr(model, 'results') or model.results is None:
            return jsonify({'success': False, 'error': 'Model has no results. Please fit the model first.'}), 400

        # Prepare results dictionary
        results = {}

        # Run selected tests
        for test_id in tests:
            try:
                # Special handling for multicollinearity
                if test_id == 'multicollinearity':
                    print("Starting multicollinearity test specifically")
                    multi_result = run_multicollinearity_tests(model)
                    print("Multicollinearity test result type:", type(multi_result))
                    print("Multicollinearity test result:", multi_result)
                    results[test_id] = multi_result
                    continue

                # Residual normality tests
                if test_id == 'residual_normality':
                    results[test_id] = run_normality_tests(model)

                # Autocorrelation tests
                elif test_id == 'autocorrelation':
                    results[test_id] = run_autocorrelation_tests(model)

                # Heteroscedasticity tests
                elif test_id == 'heteroscedasticity':
                    results[test_id] = run_heteroscedasticity_tests(model)

                # Influential points analysis
                elif test_id == 'influential_points':
                    results[test_id] = run_influential_points_analysis(model)

                # Residual plots
                elif test_id == 'residual_plots':
                    results[test_id] = generate_residual_plots(model)

                # Actual vs Predicted plot
                elif test_id == 'actual_vs_predicted':
                    results[test_id] = generate_actual_vs_predicted(model)
            except Exception as test_error:
                # If a specific test fails, include error in results but continue with other tests
                print(f"Error in {test_id} test: {str(test_error)}")
                import traceback
                traceback.print_exc()
                results[test_id] = {'error': str(test_error)}

        # Check if multicollinearity test was requested but failed
        if 'multicollinearity' in tests and 'multicollinearity' not in results:
            print("Multicollinearity test was requested but not in results")
            results['multicollinearity'] = {'error': 'Test failed to return data', 'vif_values': {}}

        # Log the full results
        print("Full diagnostic results being returned:")
        for test, result in results.items():
            print(f"- {test}: {type(result)}")

        response_data = {
            'success': True,
            'results': results
        }

        print("Final response data:", response_data)
        return jsonify(response_data), 200

    except Exception as e:
        print(f"ERROR in run_model_diagnostics: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Helper functions for diagnostic tests

def run_normality_tests(model):
    """Run tests for normality of residuals with better error handling."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        residuals = model.results.resid
        if residuals is None or len(residuals) == 0:
            return {
                'error': 'Model has no residuals'
            }

        try:
            import numpy as np
            import scipy.stats as stats
        except ImportError:
            return {
                'error': 'Required packages (scipy, numpy) not installed. Please install them with pip: pip install scipy numpy'
            }

        # Jarque-Bera test for normality
        try:
            jb_stat, jb_pvalue = stats.jarque_bera(residuals)
            jb_result = {
                'statistic': float(jb_stat),
                'pvalue': float(jb_pvalue)
            }
        except Exception as e:
            print(f"Error in Jarque-Bera test: {str(e)}")
            jb_result = {'error': str(e)}

        # Shapiro-Wilk test
        try:
            sw_stat, sw_pvalue = stats.shapiro(residuals)
            sw_result = {
                'statistic': float(sw_stat),
                'pvalue': float(sw_pvalue)
            }
        except Exception as e:
            print(f"Error in Shapiro-Wilk test: {str(e)}")
            sw_result = {'error': str(e)}

        # D'Agostino-Pearson test
        try:
            dp_stat, dp_pvalue = stats.normaltest(residuals)
            dp_result = {
                'statistic': float(dp_stat),
                'pvalue': float(dp_pvalue)
            }
        except Exception as e:
            print(f"Error in D'Agostino-Pearson test: {str(e)}")
            dp_result = {'error': str(e)}

        # Get skewness and kurtosis
        try:
            skewness = float(stats.skew(residuals))
            kurtosis = float(stats.kurtosis(residuals) + 3)  # Adding 3 to match the conventional definition
        except Exception as e:
            print(f"Error calculating skewness/kurtosis: {str(e)}")
            skewness = None
            kurtosis = None

        # Generate QQ plot data
        try:
            theoretical_quantiles = np.sort(stats.norm.ppf(np.linspace(0.01, 0.99, len(residuals))))
            sample_quantiles = np.sort(residuals)
            qq_plot_data = [{'theoretical': float(tq), 'sample': float(sq)} for tq, sq in zip(theoretical_quantiles, sample_quantiles)]

            # Generate reference line for QQ plot
            min_val = float(min(min(theoretical_quantiles), min(sample_quantiles)))
            max_val = float(max(max(theoretical_quantiles), max(sample_quantiles)))
            qq_plot_line = [{'x': min_val, 'y': min_val}, {'x': max_val, 'y': max_val}]
        except Exception as e:
            print(f"Error generating QQ plot data: {str(e)}")
            qq_plot_data = None
            qq_plot_line = None

        # Generate histogram data
        try:
            hist, bin_edges = np.histogram(residuals, bins='auto', density=True)
            bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
            histogram_data = [{'bin': float(bin_center), 'frequency': float(freq)} for bin_center, freq in zip(bin_centers, hist)]
        except Exception as e:
            print(f"Error generating histogram data: {str(e)}")
            histogram_data = None

        return {
            'jarque_bera': jb_result,
            'shapiro': sw_result,
            'dagostino': dp_result,
            'skewness': skewness,
            'kurtosis': kurtosis,
            'qq_plot_data': qq_plot_data,
            'qq_plot_line': qq_plot_line,
            'histogram_data': histogram_data
        }
    except Exception as e:
        print(f"Error in run_normality_tests: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

def run_autocorrelation_tests(model):
    """Run autocorrelation tests on residuals with better error handling."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        residuals = model.results.resid
        if residuals is None or len(residuals) == 0:
            return {
                'error': 'Model has no residuals'
            }

        try:
            import numpy as np
            import statsmodels.stats.stattools as stattools
            import statsmodels.stats.diagnostic as diagnostic
            from statsmodels.tsa.stattools import acf
        except ImportError:
            return {
                'error': 'Required packages (statsmodels, numpy) not installed. Please install them with pip: pip install statsmodels numpy'
            }

        # Durbin-Watson test
        try:
            dw_stat = float(stattools.durbin_watson(residuals))
            dw_result = {
                'statistic': dw_stat,
                # DW test doesn't provide p-value directly
            }
        except Exception as e:
            print(f"Error in Durbin-Watson test: {str(e)}")
            dw_result = {'error': str(e)}

        # Breusch-Godfrey test
        try:
            bg_result_raw = diagnostic.acorr_breusch_godfrey(model.results)
            bg_stat = float(bg_result_raw[0])
            bg_pvalue = float(bg_result_raw[1])
            bg_result = {
                'statistic': bg_stat,
                'pvalue': bg_pvalue
            }
        except Exception as e:
            print(f"Error in Breusch-Godfrey test: {str(e)}")
            bg_result = {'error': str(e)}

        # Ljung-Box test
        try:
            lb_stat, lb_pvalue = diagnostic.acorr_ljungbox(residuals, lags=[10], return_df=False)
            lb_stat = float(lb_stat[0])
            lb_pvalue = float(lb_pvalue[0])
            lb_result = {
                'statistic': lb_stat,
                'pvalue': lb_pvalue
            }
        except Exception as e:
            print(f"Error in Ljung-Box test: {str(e)}")
            lb_result = {'error': str(e)}

        # Calculate ACF
        try:
            acf_values = acf(residuals, nlags=20)
            acf_plot_data = [{'lag': int(i), 'acf': float(val)} for i, val in enumerate(acf_values)]

            # Calculate confidence bounds (approximately 2/sqrt(n))
            n = len(residuals)
            conf_bound = 2 / np.sqrt(n)
            upper_bound = [{'lag': i, 'value': float(conf_bound)} for i in range(len(acf_values))]
            lower_bound = [{'lag': i, 'value': float(-conf_bound)} for i in range(len(acf_values))]
            confidence_bounds = {
                'upper': upper_bound,
                'lower': lower_bound
            }
        except Exception as e:
            print(f"Error calculating ACF: {str(e)}")
            acf_plot_data = None
            confidence_bounds = None

        # Generate residuals over time
        try:
            residual_time_series = [{'index': int(i), 'residual': float(res)} for i, res in enumerate(residuals)]
        except Exception as e:
            print(f"Error generating residual time series: {str(e)}")
            residual_time_series = None

        return {
            'durbin_watson': dw_result,
            'breusch_godfrey': bg_result,
            'ljung_box': lb_result,
            'acf_plot_data': acf_plot_data,
            'confidence_bounds': confidence_bounds,
            'residual_time_series': residual_time_series
        }
    except Exception as e:
        print(f"Error in run_autocorrelation_tests: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

def run_heteroscedasticity_tests(model):
    """Run tests for heteroscedasticity."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        import statsmodels.stats.diagnostic as diagnostic
        import numpy as np

        # Breusch-Pagan test
        bp_result = diagnostic.het_breuschpagan(model.results.resid, model.results.model.exog)
        bp_stat = bp_result[0]
        bp_pvalue = bp_result[1]

        # White test
        try:
            white_result = diagnostic.het_white(model.results.resid, model.results.model.exog)
            white_stat = white_result[0]
            white_pvalue = white_result[1]
        except Exception as e:
            # White test can fail with singular matrix
            print(f"White test failed: {str(e)}")
            white_stat = None
            white_pvalue = None

        # Goldfeld-Quandt test
        try:
            gq_result = diagnostic.het_goldfeldquandt(model.results.resid, model.results.model.exog)
            gq_stat = gq_result[0]
            gq_pvalue = gq_result[1]
        except Exception as e:
            # GQ test can fail on certain data
            print(f"Goldfeld-Quandt test failed: {str(e)}")
            gq_stat = None
            gq_pvalue = None

        # Generate residuals vs fitted values plot
        fitted_values = model.results.fittedvalues
        residual_vs_fitted = [{'fitted': float(fitted), 'residual': float(resid)}
                            for fitted, resid in zip(fitted_values, model.results.resid)]

        # Generate scale-location plot
        std_resid = model.results.get_influence().resid_studentized_internal
        sqrt_abs_resid = np.sqrt(np.abs(std_resid))
        scale_location_plot = [{'fitted': float(fitted), 'sqrt_abs_resid': float(sqr)}
                            for fitted, sqr in zip(fitted_values, sqrt_abs_resid)]

        return {
            'breusch_pagan': {
                'statistic': float(bp_stat),
                'pvalue': float(bp_pvalue)
            },
            'white_test': {
                'statistic': float(white_stat) if white_stat is not None else None,
                'pvalue': float(white_pvalue) if white_pvalue is not None else None
            },
            'goldfeld_quandt': {
                'statistic': float(gq_stat) if gq_stat is not None else None,
                'pvalue': float(gq_pvalue) if gq_pvalue is not None else None
            },
            'residual_vs_fitted': residual_vs_fitted,
            'scale_location_plot': scale_location_plot
        }
    except Exception as e:
        print(f"Error in run_heteroscedasticity_tests: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

def run_influential_points_analysis(model):
    """Analyze influential points and outliers."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        import numpy as np

        # Get influence measures
        influence = model.results.get_influence()
        std_resid = influence.resid_studentized_internal
        hat_diag = influence.hat_matrix_diag
        cook_d = influence.cooks_distance[0]

        # Calculate thresholds
        n = len(hat_diag)
        k = len(model.results.params)
        hat_threshold = 2 * (k + 1) / n
        cook_threshold = 4 / n

        # Identify outliers (|standardized residual| > 3)
        outlier_indices = np.where(np.abs(std_resid) > 3)[0]

        # Identify high leverage points (hat diagonal > threshold)
        leverage_indices = np.where(hat_diag > hat_threshold)[0]

        # Identify influential points (Cook's distance > threshold)
        influence_indices = np.where(cook_d > cook_threshold)[0]

        # Prepare data for all identified observations
        all_indices = np.unique(np.concatenate([outlier_indices, leverage_indices, influence_indices]))
        influential_observations = []

        for idx in all_indices:
            obs_type = []
            if idx in outlier_indices:
                obs_type.append('Outlier')
            if idx in leverage_indices:
                obs_type.append('High Leverage')
            if idx in influence_indices:
                obs_type.append('Influential')

            influential_observations.append({
                'observation': int(idx),
                'std_residual': float(std_resid[idx]),
                'hat_value': float(hat_diag[idx]),
                'cooks_distance': float(cook_d[idx]),
                'hat_threshold': float(hat_threshold),
                'cook_threshold': float(cook_threshold),
                'type': ' & '.join(obs_type)
            })

        # Sort by Cook's distance
        influential_observations.sort(key=lambda x: x['cooks_distance'], reverse=True)

        # Generate Cook's distance plot
        cook_distance_plot = [{'index': int(i), 'cook_d': float(d)} for i, d in enumerate(cook_d)]

        # Generate leverage vs residual plot
        leverage_plot = [{'leverage': float(h), 'std_resid': float(r)}
                      for h, r in zip(hat_diag, std_resid)]

        # Generate Cook's distance contours for leverage plot (simplified)
        cook_contours = []

        return {
            'outliers': {
                'count': len(outlier_indices),
                'indices': outlier_indices.tolist()
            },
            'high_leverage': {
                'count': len(leverage_indices),
                'indices': leverage_indices.tolist(),
                'threshold': float(hat_threshold)
                },
            'cook_distance': {
                'count': len(influence_indices),
                'indices': influence_indices.tolist(),
                'threshold': float(cook_threshold)
            },
            'influential_observations': influential_observations,
            'cook_distance_plot': cook_distance_plot,
            'leverage_plot': leverage_plot,
            'cook_contours': cook_contours
        }
    except Exception as e:
        print(f"Error in run_influential_points_analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

def run_multicollinearity_tests(model):
    """Test for multicollinearity using VIF with improved error handling."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        print("Starting multicollinearity test...")

        # If there's only one explanatory variable, VIF is not applicable
        if len(model.features) <= 1:
            print("Not enough features for VIF calculation")
            return {
                'message': 'VIF not applicable with only one explanatory variable',
                'vif_values': {}
            }

        import pandas as pd
        import numpy as np
        from statsmodels.stats.outliers_influence import variance_inflation_factor

        # Get the feature data
        print("Getting feature data...")
        X = model.model_data[model.features].copy()

        # Check for nulls
        null_counts = X.isnull().sum()
        if null_counts.any():
            print(f"Nulls in data: {null_counts[null_counts > 0]}")
            # Drop rows with any null values
            X = X.dropna()
            if X.empty:
                return {
                    'error': 'No complete rows after removing nulls'
                }

        # Add constant manually if not already in the data
        print("Adding constant if needed...")
        has_const = False
        for col in X.columns:
            if (X[col] == 1).all():
                has_const = True
                break

        if not has_const:
            X['const'] = 1.0

        print(f"Data shape for VIF calculation: {X.shape}")
        print(f"Columns: {list(X.columns)}")

        # Calculate VIF for each feature
        vif_data = {}
        max_vif = 0

        # Ensure the data is numeric
        X = X.astype(float)

        print("Calculating VIF values...")
        # Calculate VIF for each feature
        for i, feature in enumerate(X.columns):
            if feature == 'const':
                continue  # Skip constant term

            try:
                print(f"Calculating VIF for {feature}...")
                # Check for perfect collinearity
                if X[feature].std() == 0:
                    print(f"Feature {feature} has zero standard deviation")
                    vif_data[feature] = float('inf')
                    continue

                # Calculate VIF
                vif = variance_inflation_factor(X.values, i)

                # Handle infinite or extreme values
                if np.isnan(vif) or np.isinf(vif) or vif > 1e10:
                    print(f"Very high VIF for {feature}: {vif}")
                    vif = 1000.0  # Cap at a high but finite value

                vif_data[feature] = float(vif)
                max_vif = max(max_vif, vif) if not np.isnan(vif) and not np.isinf(vif) else max_vif

            except Exception as vif_error:
                print(f"Error calculating VIF for {feature}: {str(vif_error)}")
                vif_data[feature] = None

        # Calculate correlation matrix
        print("Calculating correlation matrix...")
        try:
            X_for_corr = X.drop('const', axis=1, errors='ignore')
            corr_matrix = X_for_corr.corr().round(2)
            corr_variables = corr_matrix.columns.tolist()
            corr_values = corr_matrix.values.tolist()
        except Exception as corr_error:
            print(f"Error calculating correlation matrix: {str(corr_error)}")
            corr_variables = []
            corr_values = []

        # Calculate condition indices if possible
        try:
            print("Calculating condition indices...")
            X_no_const = X.drop('const', axis=1) if 'const' in X.columns else X
            # Use SVD which is more stable than eigenvalues
            from numpy.linalg import svd
            s = svd(X_no_const, compute_uv=False)
            condition_indices = [float(s[0] / s_i) if s_i > 1e-10 else float('inf') for s_i in s]
        except Exception as e:
            print(f"Error calculating condition indices: {str(e)}")
            condition_indices = []

        result = {
            'vif_values': vif_data,
            'max_vif': float(max_vif) if not np.isnan(max_vif) and not np.isinf(max_vif) else 1000.0,
            'correlation_matrix': {
                'variables': corr_variables,
                'values': corr_values
            },
            'condition_index': condition_indices
        }

        print("Multicollinearity test completed successfully")
        print("Returning result:", result)  # Add this to see what's being returned
        return result
    except Exception as e:
        import traceback
        print(f"ERROR in run_multicollinearity_tests: {str(e)}")
        print(traceback.format_exc())
        return {'error': str(e), 'vif_values': {}}

def generate_residual_plots(model):
    """Generate various residual plots."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        import numpy as np

        # Residuals vs. fitted values
        fitted_values = model.results.fittedvalues
        residuals = model.results.resid
        residual_vs_fitted = [{'fitted': float(fitted), 'residual': float(resid)}
                            for fitted, resid in zip(fitted_values, residuals)]

        # Residuals over time
        residual_time_series = [{'index': int(i), 'residual': float(res)} for i, res in enumerate(residuals)]

        # Residual histogram
        hist, bin_edges = np.histogram(residuals, bins='auto', density=True)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        histogram_data = [{'bin': float(bin_center), 'frequency': float(freq)} for bin_center, freq in zip(bin_centers, hist)]

        # Standardized residuals
        try:
            std_resid = model.results.get_influence().resid_studentized_internal
            standardized_residuals = [{'index': int(i), 'std_resid': float(res)} for i, res in enumerate(std_resid)]
        except:
            standardized_residuals = []

        return {
            'residual_vs_fitted': residual_vs_fitted,
            'residual_time_series': residual_time_series,
            'histogram_data': histogram_data,
            'standardized_residuals': standardized_residuals
        }
    except Exception as e:
        print(f"Error in generate_residual_plots: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

def generate_actual_vs_predicted(model):
    """Generate actual vs. predicted plot and statistics."""
    try:
        if not model.results:
            return {
                'error': 'Model has no results'
            }

        import numpy as np

        # Get actual and predicted values
        actual_values = model.model_data[model.kpi]
        predicted_values = model.results.fittedvalues

        # Create scatter plot data
        actual_vs_predicted = [{'actual': float(actual), 'predicted': float(predicted)}
                             for actual, predicted in zip(actual_values, predicted_values)]

        # Create time series plot
        prediction_time_series = [{'index': int(i), 'actual': float(actual), 'predicted': float(predicted)}
                                for i, (actual, predicted) in enumerate(zip(actual_values, predicted_values))]

        # Calculate prediction statistics
        errors = actual_values - predicted_values
        mae = np.abs(errors).mean()
        rmse = np.sqrt((errors ** 2).mean())
        r_squared = model.results.rsquared

        return {
            'actual_vs_predicted': actual_vs_predicted,
            'prediction_time_series': prediction_time_series,
            'prediction_stats': {
                'mae': float(mae),
                'rmse': float(rmse),
                'r_squared': float(r_squared)
            }
        }
    except Exception as e:
        print(f"Error in generate_actual_vs_predicted: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

### Download Reports for the Model Diagnostics ###
@app.route('/api/models/download-diagnostics-report', methods=['POST', 'OPTIONS'])
def download_diagnostics_report():
    """Generate and download a diagnostics report."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')
        test_id = data.get('testId')
        test_name = data.get('testName')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        if not test_id:
            return jsonify({'success': False, 'error': 'Test ID is required'}), 400

        # Get the model
        model = data_store['models'][model_name]

        # Run the specific diagnostic test
        test_result = None
        if test_id == 'residual_normality':
            test_result = run_normality_tests(model)
        elif test_id == 'autocorrelation':
            test_result = run_autocorrelation_tests(model)
        elif test_id == 'heteroscedasticity':
            test_result = run_heteroscedasticity_tests(model)
        elif test_id == 'influential_points':
            test_result = run_influential_points_analysis(model)
        elif test_id == 'multicollinearity':
            test_result = run_multicollinearity_tests(model)
        elif test_id == 'residual_plots':
            test_result = generate_residual_plots(model)
        elif test_id == 'actual_vs_predicted':
            test_result = generate_actual_vs_predicted(model)

        if not test_result or 'error' in test_result:
            error_msg = test_result.get('error', 'Unknown error') if test_result else 'Failed to run test'
            return jsonify({'success': False, 'error': error_msg}), 500

        # Generate report filename
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{model_name}_{test_id}_{timestamp}.pdf"

        # Create download directory if it doesn't exist
        from pathlib import Path
        download_dir = Path('downloads')
        download_dir.mkdir(exist_ok=True)

        file_path = download_dir / filename

        # Generate the PDF report
        generate_pdf_report(file_path, model, test_id, test_name, test_result)

        # Return file path for download
        return jsonify({
            'success': True,
            'filename': filename,
            'message': f"Report generated: {filename}"
        }), 200

    except Exception as e:
        print(f"ERROR in download_diagnostics_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# Add this function to generate PDF reports
def generate_pdf_report(file_path, model, test_id, test_name, test_result):
    """
    Generate a PDF report for a diagnostic test.

    Parameters:
    -----------
    file_path : str or Path
        Path where the PDF file will be saved
    model : LinearModel
        The model object
    test_id : str
        ID of the test
    test_name : str
        Name of the test
    test_result : dict
        Test results

    Returns:
    --------
    None
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    import datetime

    # Convert file_path to string if it's a Path object
    file_path = str(file_path)

    # Create the PDF document
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    styles = getSampleStyleSheet()

    # Create custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=12
    )
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=10
    )
    subheading_style = ParagraphStyle(
        'Subheading',
        parent=styles['Heading3'],
        fontSize=12,
        spaceAfter=8
    )
    body_style = styles['Normal']

    # Start building the document
    story = []

    # Add title
    story.append(Paragraph(f"Diagnostic Report: {test_name}", title_style))
    story.append(Spacer(1, 12))

    # Add report metadata
    story.append(Paragraph(f"Model: {model.name}", body_style))
    story.append(Paragraph(f"KPI: {model.kpi}", body_style))
    story.append(Paragraph(f"Report Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style))
    story.append(Spacer(1, 12))

    # Add model summary
    story.append(Paragraph("Model Summary", heading_style))

    if hasattr(model, 'results') and model.results is not None:
        # Create a table for model summary
        summary_data = [
            ["Statistic", "Value"],
            ["R-squared", f"{model.results.rsquared:.4f}"],
            ["Adjusted R-squared", f"{model.results.rsquared_adj:.4f}"],
            ["F-statistic", f"{model.results.fvalue:.4f}"],
            ["Number of Observations", f"{int(model.results.nobs)}"],
            ["Number of Variables", f"{len(model.features)}"]
        ]

        summary_table = Table(summary_data, colWidths=[150, 100])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (1, 0), 12),
            ('BACKGROUND', (0, 1), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT')
        ]))

        story.append(summary_table)
    else:
        story.append(Paragraph("No model results available.", body_style))

    story.append(Spacer(1, 12))

    # Add test results section
    story.append(Paragraph(f"{test_name} Results", heading_style))

    # Handle different test types
    if test_id == 'residual_normality':
        # Normality tests
        story.append(Paragraph("Normality Tests", subheading_style))

        if 'jarque_bera' in test_result:
            jb = test_result['jarque_bera']
            story.append(Paragraph(f"Jarque-Bera Test: Statistic = {jb.get('statistic', 'N/A'):.4f}, p-value = {jb.get('pvalue', 'N/A'):.4f}", body_style))

        if 'shapiro' in test_result:
            sw = test_result['shapiro']
            story.append(Paragraph(f"Shapiro-Wilk Test: Statistic = {sw.get('statistic', 'N/A'):.4f}, p-value = {sw.get('pvalue', 'N/A'):.4f}", body_style))

        if 'skewness' in test_result and test_result['skewness'] is not None:
            story.append(Paragraph(f"Skewness: {test_result['skewness']:.4f}", body_style))

        if 'kurtosis' in test_result and test_result['kurtosis'] is not None:
            story.append(Paragraph(f"Kurtosis: {test_result['kurtosis']:.4f}", body_style))

        story.append(Paragraph("Interpretation:", subheading_style))
        if 'jarque_bera' in test_result and 'pvalue' in test_result['jarque_bera']:
            jb_pval = test_result['jarque_bera']['pvalue']
            if jb_pval < 0.05:
                story.append(Paragraph("The residuals may not be normally distributed (p < 0.05). This could affect the validity of hypothesis tests based on the assumption of normality.", body_style))
            else:
                story.append(Paragraph("The residuals appear to be normally distributed (p >= 0.05). This supports the validity of hypothesis tests based on the assumption of normality.", body_style))

    elif test_id == 'autocorrelation':
        # Autocorrelation tests
        story.append(Paragraph("Autocorrelation Tests", subheading_style))

        if 'durbin_watson' in test_result:
            dw = test_result['durbin_watson']
            story.append(Paragraph(f"Durbin-Watson Test: Statistic = {dw.get('statistic', 'N/A'):.4f}", body_style))

        if 'breusch_godfrey' in test_result:
            bg = test_result['breusch_godfrey']
            story.append(Paragraph(f"Breusch-Godfrey Test: Statistic = {bg.get('statistic', 'N/A'):.4f}, p-value = {bg.get('pvalue', 'N/A'):.4f}", body_style))

        story.append(Paragraph("Interpretation:", subheading_style))
        if 'durbin_watson' in test_result and 'statistic' in test_result['durbin_watson']:
            dw_stat = test_result['durbin_watson']['statistic']
            if dw_stat < 1.5:
                story.append(Paragraph("Positive autocorrelation detected (DW < 1.5). Consider adding lagged variables or using a different model specification.", body_style))
            elif dw_stat > 2.5:
                story.append(Paragraph("Negative autocorrelation detected (DW > 2.5). This is unusual and may indicate model misspecification.", body_style))
            else:
                story.append(Paragraph("No significant autocorrelation detected (DW near 2). This supports the independence assumption of the model.", body_style))

    elif test_id == 'heteroscedasticity':
        # Heteroscedasticity tests
        story.append(Paragraph("Heteroscedasticity Tests", subheading_style))

        if 'breusch_pagan' in test_result:
            bp = test_result['breusch_pagan']
            story.append(Paragraph(f"Breusch-Pagan Test: Statistic = {bp.get('statistic', 'N/A'):.4f}, p-value = {bp.get('pvalue', 'N/A'):.4f}", body_style))

        if 'white_test' in test_result and test_result['white_test'].get('statistic') is not None:
            white = test_result['white_test']
            story.append(Paragraph(f"White Test: Statistic = {white.get('statistic', 'N/A'):.4f}, p-value = {white.get('pvalue', 'N/A'):.4f}", body_style))

        story.append(Paragraph("Interpretation:", subheading_style))
        if 'breusch_pagan' in test_result and 'pvalue' in test_result['breusch_pagan']:
            bp_pval = test_result['breusch_pagan']['pvalue']
            if bp_pval < 0.05:
                story.append(Paragraph("Heteroscedasticity detected (p < 0.05). Consider using robust standard errors or transforming the dependent variable.", body_style))
            else:
                story.append(Paragraph("No significant heteroscedasticity detected (p >= 0.05). This supports the homoscedasticity assumption of the model.", body_style))

    elif test_id == 'influential_points':
        # Influential points analysis
        story.append(Paragraph("Influential Points Summary", subheading_style))

        if 'outliers' in test_result:
            story.append(Paragraph(f"Outliers Count: {test_result['outliers'].get('count', 0)}", body_style))

        if 'high_leverage' in test_result:
            story.append(Paragraph(f"High Leverage Points: {test_result['high_leverage'].get('count', 0)}", body_style))

        if 'cook_distance' in test_result:
            story.append(Paragraph(f"Influential Points (Cook's D): {test_result['cook_distance'].get('count', 0)}", body_style))

        if 'influential_observations' in test_result and test_result['influential_observations']:
            story.append(Paragraph("Top Influential Observations:", subheading_style))

            # Create table for influential observations
            infl_data = [["Observation", "Std. Residual", "Hat Value", "Cook's D", "Type"]]

            # Add top 10 influential observations
            for obs in test_result['influential_observations'][:10]:
                infl_data.append([
                    str(obs.get('observation', '')),
                    f"{obs.get('std_residual', 0):.4f}",
                    f"{obs.get('hat_value', 0):.4f}",
                    f"{obs.get('cooks_distance', 0):.4f}",
                    obs.get('type', '')
                ])

            infl_table = Table(infl_data, colWidths=[60, 80, 80, 80, 100])
            infl_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (1, 1), (3, -1), 'RIGHT')
            ]))

            story.append(infl_table)

        story.append(Paragraph("Interpretation:", subheading_style))
        if 'outliers' in test_result and 'high_leverage' in test_result:
            outliers = test_result['outliers'].get('count', 0)
            leverage = test_result['high_leverage'].get('count', 0)

            if outliers > 0 or leverage > 0:
                story.append(Paragraph(f"The analysis identified {outliers} outliers and {leverage} high leverage points. These observations may disproportionately influence model results and should be examined further.", body_style))
            else:
                story.append(Paragraph("No significant outliers or high leverage points were detected. The model does not appear to be unduly influenced by specific observations.", body_style))

    elif test_id == 'multicollinearity':
        # Multicollinearity tests
        story.append(Paragraph("Multicollinearity Analysis", subheading_style))

        if 'max_vif' in test_result:
            story.append(Paragraph(f"Maximum VIF: {test_result.get('max_vif', 'N/A'):.4f}", body_style))

        if 'vif_values' in test_result and test_result['vif_values']:
            story.append(Paragraph("VIF Values by Variable:", subheading_style))

            # Create table for VIF values
            vif_data = [["Variable", "VIF", "Tolerance (1/VIF)", "Interpretation"]]

            # Add VIF values for each variable
            for var, vif in test_result['vif_values'].items():
                if vif is not None:
                    tolerance = 1/vif if vif > 0 else 0

                    if vif > 10:
                        interpretation = "Severe"
                    elif vif > 5:
                        interpretation = "Moderate"
                    else:
                        interpretation = "Low"

                    vif_data.append([
                        var,
                        f"{vif:.4f}",
                        f"{tolerance:.4f}",
                        interpretation
                    ])

            vif_table = Table(vif_data, colWidths=[150, 80, 100, 80])
            vif_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (1, 1), (2, -1), 'RIGHT')
            ]))

            story.append(vif_table)

        story.append(Paragraph("Interpretation:", subheading_style))
        if 'max_vif' in test_result:
            max_vif = test_result.get('max_vif')
            if max_vif > 10:
                story.append(Paragraph("Severe multicollinearity detected (max VIF > 10). Consider removing some variables or using regularization techniques.", body_style))
            elif max_vif > 5:
                story.append(Paragraph("Moderate multicollinearity detected (max VIF > 5). Monitor these variables and consider their impact on the model.", body_style))
            else:
                story.append(Paragraph("No significant multicollinearity detected (all VIF < 5). The model does not appear to suffer from excessive correlation among predictors.", body_style))

    elif test_id == 'actual_vs_predicted':
        # Actual vs Predicted analysis
        story.append(Paragraph("Model Fit Statistics", subheading_style))

        if 'prediction_stats' in test_result:
            stats = test_result['prediction_stats']

            # Create table for prediction statistics
            pred_data = [["Statistic", "Value"]]

            if 'r_squared' in stats:
                pred_data.append(["R-squared", f"{stats['r_squared']:.4f}"])

            if 'rmse' in stats:
                pred_data.append(["RMSE", f"{stats['rmse']:.4f}"])

            if 'mae' in stats:
                pred_data.append(["MAE", f"{stats['mae']:.4f}"])

            pred_table = Table(pred_data, colWidths=[150, 100])
            pred_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (1, 0), 'CENTER'),
                ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (1, 0), 12),
                ('BACKGROUND', (0, 1), (1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (1, 1), (1, -1), 'RIGHT')
            ]))

            story.append(pred_table)

        story.append(Paragraph("Interpretation:", subheading_style))
        if 'prediction_stats' in test_result and 'r_squared' in test_result['prediction_stats']:
            r2 = test_result['prediction_stats']['r_squared']

            if r2 > 0.8:
                story.append(Paragraph(f"The model explains a large portion of the variance in the data (R² = {r2:.4f}). This indicates a good fit to the data.", body_style))
            elif r2 > 0.5:
                story.append(Paragraph(f"The model explains a moderate portion of the variance in the data (R² = {r2:.4f}). This indicates a reasonable fit, but there may be room for improvement.", body_style))
            else:
                story.append(Paragraph(f"The model explains a relatively small portion of the variance in the data (R² = {r2:.4f}). Consider adding more variables or exploring different model specifications.", body_style))

    # Build the PDF
    doc.build(story)

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Serve a file for download."""
    try:
        # Create the downloads directory if it doesn't exist
        from pathlib import Path
        Path('downloads').mkdir(parents=True, exist_ok=True)

        # Get the absolute path to the downloads directory
        import os
        downloads_dir = os.path.abspath('downloads')

        # Log the request and path for debugging
        print(f"Download requested for: {filename}")
        print(f"Looking in directory: {downloads_dir}")

        # Check if file exists
        file_path = os.path.join(downloads_dir, filename)
        if not os.path.exists(file_path):
            print(f"ERROR: File not found at {file_path}")
            return jsonify({'error': 'File not found'}), 404

        print(f"File found at {file_path}, serving for download")

        # Use Flask's send_from_directory function to serve the file
        from flask import send_from_directory
        return send_from_directory(downloads_dir, filename, as_attachment=True)
    except Exception as e:
        print(f"ERROR in download_file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/debug/multicollinearity-test', methods=['POST'])
def debug_multicollinearity():
    """Debug endpoint for multicollinearity tests."""
    try:
        data = request.json
        model_name = data.get('modelName')

        if not model_name or model_name not in data_store['models']:
            return jsonify({'success': False, 'error': 'Invalid model name'}), 400

        model = data_store['models'][model_name]
        result = run_multicollinearity_tests(model)

        return jsonify({
            'success': True,
            'result': result
        }), 200

    except Exception as e:
        print(f"ERROR in debug_multicollinearity: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

### DECOMPOSITION ###
@app.route('/api/models/decomposition', methods=['POST', 'OPTIONS'])
def run_model_decomposition():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    """Run decomposition for a model and return contribution data."""
    print("=== run_model_decomposition called ===")
    try:
        data = request.json
        model_name = data.get('modelName')

        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        print(f"Running decomposition for model: {model_name}")
        print(f"Available models: {list(data_store['models'].keys())}")
        print(f"Active model: {data_store['active_model']}")

        # Get the model directly from data_store
        if model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{model_name}' not found. Available models: {list(data_store['models'].keys())}"}), 404

        model_obj = data_store['models'][model_name]

        # Check if the model has results
        if not hasattr(model_obj, 'results') or model_obj.results is None:
            return jsonify({'success': False, 'error': 'Model has no results. Please fit the model first.'}), 400

        # Get or create variable groups
        from src.decomposition import get_variable_groups, create_default_groups
        groups = get_variable_groups(model_obj)

        if not groups:
            print("No groups found, creating default groups")
            groups = create_default_groups(model_obj)

        # Calculate decomposition
        from src.decomposition import calculate_decomposition
        decomp_df = calculate_decomposition(model_obj, groups)

        # Check if decomposition was successful
        if decomp_df is None or decomp_df.empty:
            return jsonify({'success': False, 'error': 'Failed to calculate decomposition'}), 500

        # Convert the decomposition dataframe to a dictionary for the response
        dates = decomp_df.index.tolist()
        # Convert datetime to string if needed
        if dates and hasattr(dates[0], 'isoformat'):
            dates = [date.isoformat() for date in dates]

        # Get actual and predicted values
        actual = decomp_df['Actual'].tolist() if 'Actual' in decomp_df.columns else []
        predicted = decomp_df['Predicted'].tolist() if 'Predicted' in decomp_df.columns else []

        # Get contribution values for each group
        contributions = {}
        for column in decomp_df.columns:
            if column not in ['Actual', 'Predicted']:
                contributions[column] = decomp_df[column].tolist()

        # Prepare the response
        response_data = {
            'dates': dates,
            'actual': actual,
            'predicted': predicted,
            'contributions': contributions
        }

        print(f"Decomposition successful, returning data for {len(dates)} time points and {len(contributions)} contribution groups")

        return jsonify({
            'success': True,
            'data': response_data
        }), 200

    except Exception as e:
        print(f"ERROR in run_model_decomposition: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/group-decomposition', methods=['POST', 'OPTIONS'])
def run_group_decomposition():
    """Run decomposition for a specific group within a model."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    print("=== run_group_decomposition called ===")
    try:
        data = request.json
        model_name = data.get('modelName')
        group_name = data.get('groupName')

        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        if not group_name:
            return jsonify({'success': False, 'error': 'Group name is required'}), 400

        print(f"Running decomposition for model: {model_name}, group: {group_name}")
        print(f"Available models: {list(data_store['models'].keys())}")

        # Get the model directly from data_store
        if model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{model_name}' not found. Available models: {list(data_store['models'].keys())}"}), 404

        model_obj = data_store['models'][model_name]

        # Check if the model has results
        if not hasattr(model_obj, 'results') or model_obj.results is None:
            return jsonify({'success': False, 'error': 'Model has no results. Please fit the model first.'}), 400

        # Get variable groups
        from src.decomposition import get_variable_groups
        groups = get_variable_groups(model_obj)

        if not groups:
            return jsonify({'success': False, 'error': 'No groups defined for this model'}), 400

        # Check if the requested group exists
        group_variables = [var for var, info in groups.items() if info.get('Group') == group_name]

        if not group_variables:
            return jsonify({'success': False, 'error': f"No variables found in group '{group_name}'"}), 404

        print(f"Found {len(group_variables)} variables in group '{group_name}'")

        # Calculate group decomposition
        from src.decomposition import calculate_group_decomposition
        decomp_df = calculate_group_decomposition(model_obj, groups, group_name)

        # Check if decomposition was successful
        if decomp_df is None or decomp_df.empty:
            return jsonify({'success': False, 'error': 'Failed to calculate group decomposition'}), 500

        # Convert the decomposition dataframe to a dictionary for the response
        dates = decomp_df.index.tolist()
        # Convert datetime to string if needed
        if dates and hasattr(dates[0], 'isoformat'):
            dates = [date.isoformat() for date in dates]

        # Get contribution values for each variable
        variables = [col for col in decomp_df.columns if col not in ['Actual', 'Total']]
        contributions = {}

        for variable in variables:
            contributions[variable] = decomp_df[variable].tolist()

        # Get the total group contribution
        total = decomp_df['Total'].tolist() if 'Total' in decomp_df.columns else []

        # Prepare the response
        response_data = {
            'dates': dates,
            'variables': variables,
            'contributions': contributions,
            'total': total
        }

        print(f"Group decomposition successful, returning data for {len(dates)} time points and {len(variables)} variables")

        return jsonify({
            'success': True,
            'data': response_data
        }), 200

    except Exception as e:
        print(f"ERROR in run_group_decomposition: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

### Contribution Groups ###
@app.route('/api/models/save-contribution-groups', methods=['POST', 'OPTIONS'])
def save_contribution_groups():
    """Save contribution groups for a model."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')
        group_settings = data.get('groupSettings', {})

        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        print(f"Saving contribution groups for model: {model_name}")

        # Get the model
        if model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{model_name}' not found"}), 404

        model_obj = data_store['models'][model_name]

        # Create the groups directory if it doesn't exist
        import os
        from pathlib import Path
        groups_dir = 'groups'
        Path(groups_dir).mkdir(parents=True, exist_ok=True)

        # Save the group settings to a JSON file
        settings_path = os.path.join(groups_dir, f"{model_name}_groups.json")

        with open(settings_path, 'w') as f:
            import json
            json.dump(group_settings, f, indent=2)

        # Store the groups in the model object
        model_obj.variable_groups = group_settings

        return jsonify({
            'success': True,
            'message': f"Contribution groups saved for model '{model_name}'"
        }), 200

    except Exception as e:
        print(f"ERROR in save_contribution_groups: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/contribution-groups/<model_name>', methods=['GET', 'OPTIONS'])
def get_contribution_groups(model_name):
    """Get contribution groups for a model."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        print(f"Getting contribution groups for model: {model_name}")

        # Check if model exists
        if model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{model_name}' not found"}), 404

        # Get the model
        model_obj = data_store['models'][model_name]

        # First check if the model has groups stored in memory
        if hasattr(model_obj, 'variable_groups') and model_obj.variable_groups:
            return jsonify({
                'success': True,
                'groupSettings': model_obj.variable_groups
            }), 200

        # If not in memory, try to load from file
        import os
        import json
        from pathlib import Path

        settings_path = os.path.join('groups', f"{model_name}_groups.json")

        if os.path.exists(settings_path):
            with open(settings_path, 'r') as f:
                group_settings = json.load(f)

            # Store in model for future reference
            model_obj.variable_groups = group_settings

            return jsonify({
                'success': True,
                'groupSettings': group_settings
            }), 200
        else:
            # No groups defined yet, return empty
            return jsonify({
                'success': True,
                'groupSettings': {}
            }), 200

    except Exception as e:
        print(f"ERROR in get_contribution_groups: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/debug/models', methods=['GET'])
def debug_models():
    """Debug endpoint to check available models."""
    models_info = {}

    for name, model in data_store['models'].items():
        models_info[name] = {
            'kpi': model.kpi if hasattr(model, 'kpi') else None,
            'has_results': model.results is not None if hasattr(model, 'results') else False,
            'features_count': len(model.features) if hasattr(model, 'features') else 0
        }

    return jsonify({
        'models': models_info,
        'active_model': data_store['active_model']
    }), 200

### Export & Delete ###
@app.route('/api/models/export-excel', methods=['POST', 'OPTIONS'])
def export_model_to_excel():
    """Export a model to Excel."""
    print("\n\n========= EXPORT MODEL TO EXCEL ENDPOINT CALLED =========")

    if request.method == 'OPTIONS':
        print("OPTIONS request received")
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        print("POST request received")

        # Log the raw request body
        raw_body = request.get_data()
        print(f"Raw request body: {raw_body}")

        data = request.json
        print(f"Parsed JSON data: {data}")

        model_name = data.get('modelName')
        export_path = data.get('exportPath', '')

        print(f"Model name: '{model_name}'")
        print(f"Export path: '{export_path}'")

        if not model_name:
            error_msg = "No model name provided"
            print(f"ERROR: {error_msg}")
            return jsonify({'success': False, 'error': error_msg}), 400

        # Check if model exists
        if model_name not in data_store['models']:
            error_msg = f"Model '{model_name}' not found. Available models: {list(data_store['models'].keys())}"
            print(f"ERROR: {error_msg}")
            return jsonify({'success': False, 'error': error_msg}), 404

        model_obj = data_store['models'][model_name]
        print(f"Model object found: {model_obj.name}")

        # Handle the export path - create directory if needed
        import os
        from pathlib import Path

        # If no path provided, use downloads directory
        if not export_path:
            downloads_dir = Path('downloads')
            downloads_dir.mkdir(parents=True, exist_ok=True)
            export_path = os.path.join('downloads', f"{model_name}.xlsx")
            print(f"No path provided, using default: {export_path}")
        else:
            print(f"Using provided path: {export_path}")

            # Ensure directory exists
            try:
                directory = os.path.dirname(export_path)
                Path(directory).mkdir(parents=True, exist_ok=True)
                print(f"Directory created/verified: {directory}")
            except Exception as dir_error:
                error_msg = f"Error creating directory: {str(dir_error)}"
                print(f"ERROR: {error_msg}")
                return jsonify({'success': False, 'error': error_msg}), 500

        # Now try to export the model
        print(f"Attempting to export model to: {export_path}")

        try:
            from src.model_export import export_model_to_excel
            print("Import successful for export_model_to_excel")

            print(f"Calling export_model_to_excel with model and path: {export_path}")
            # Here's the fix - don't try to unpack the return value
            file_path = export_model_to_excel(model_obj, export_path)

            # Check if file exists to determine success
            if file_path and os.path.exists(file_path):
                success = True
                # Get just the filename for the download URL
                filename = os.path.basename(file_path)
                print(f"Export successful! File: {filename}")
            else:
                success = False
                filename = None
                print("Export failed: No file was created")

            if success:
                print("Export successful!")
                return jsonify({
                    'success': True,
                    'filePath': file_path,
                    'filename': filename,
                    'message': f"Model exported successfully to {file_path}"
                }), 200
            else:
                error_msg = f"Export function failed to create the file"
                print(f"ERROR: {error_msg}")
                return jsonify({'success': False, 'error': error_msg}), 500

        except Exception as export_error:
            error_msg = f"Exception in export function: {str(export_error)}"
            print(f"ERROR: {error_msg}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': error_msg}), 500

    except Exception as e:
        error_msg = f"Unhandled exception in export_model_to_excel endpoint: {str(e)}"
        print(f"ERROR: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': error_msg}), 500
    finally:
        print("========= EXPORT MODEL TO EXCEL ENDPOINT COMPLETED =========\n\n")

@app.route('/api/models/delete', methods=['POST', 'OPTIONS'])
def delete_model():
    """Delete a model."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')

        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        print(f"Deleting model: {model_name}")

        # Check if model exists
        if model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{model_name}' not found"}), 404

        # Remove the model from the data store
        del data_store['models'][model_name]

        # If this was the active model, set active model to None
        if data_store['active_model'] == model_name:
            data_store['active_model'] = None

        # Try to remove any associated files
        import os
        from pathlib import Path

        # Remove model file if it exists
        model_path = os.path.join('models', f"{model_name}.pkl")
        if os.path.exists(model_path):
            os.remove(model_path)

        # Remove groups file if it exists
        groups_path = os.path.join('groups', f"{model_name}_groups.json")
        if os.path.exists(groups_path):
            os.remove(groups_path)

        return jsonify({
            'success': True,
            'message': f"Model '{model_name}' deleted successfully"
        }), 200

    except Exception as e:
        print(f"ERROR in delete_model: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/rename', methods=['POST', 'OPTIONS'])
def rename_model():
    """Rename a model."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        old_model_name = data.get('oldModelName')
        new_model_name = data.get('newModelName')

        if not old_model_name or not new_model_name:
            return jsonify({'success': False, 'error': 'Both old and new model names are required'}), 400

        if new_model_name in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{new_model_name}' already exists"}), 400

        # Get the old model
        if old_model_name not in data_store['models']:
            return jsonify({'success': False, 'error': f"Model '{old_model_name}' not found"}), 404

        # Copy the model with new name
        model_obj = data_store['models'][old_model_name]
        model_obj.name = new_model_name
        data_store['models'][new_model_name] = model_obj

        # Delete the old model
        del data_store['models'][old_model_name]

        # Update active model if needed
        if data_store['active_model'] == old_model_name:
            data_store['active_model'] = new_model_name

        return jsonify({
            'success': True,
            'message': f"Model '{old_model_name}' renamed to '{new_model_name}'"
        }), 200

    except Exception as e:
        print(f"ERROR in rename_model: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

### Colours ###
@app.route('/api/models/group-colors/<model_name>', methods=['GET', 'OPTIONS'])
def get_group_colors(model_name):
    """Get color settings for model groups."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        # Check for existing color settings
        import os
        import json
        from pathlib import Path

        # Create colors directory if it doesn't exist
        colors_dir = 'colors'
        Path(colors_dir).mkdir(parents=True, exist_ok=True)

        colors_path = os.path.join(colors_dir, f"{model_name}_colors.json")

        if os.path.exists(colors_path):
            with open(colors_path, 'r') as f:
                color_data = json.load(f)

            return jsonify({
                'success': True,
                'colors': color_data
            }), 200
        else:
            # No colors defined yet, return empty
            return jsonify({
                'success': True,
                'colors': {}
            }), 200

    except Exception as e:
        print(f"ERROR in get_group_colors: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/models/save-group-colors', methods=['POST', 'OPTIONS'])
def save_group_colors():
    """Save color settings for model groups."""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response, 200

    try:
        data = request.json
        model_name = data.get('modelName')
        color_data = data.get('colorData', {})

        if not model_name:
            return jsonify({'success': False, 'error': 'Model name is required'}), 400

        # Create colors directory if it doesn't exist
        import os
        import json
        from pathlib import Path

        colors_dir = 'colors'
        Path(colors_dir).mkdir(parents=True, exist_ok=True)

        # Save the color data to a JSON file
        colors_path = os.path.join(colors_dir, f"{model_name}_colors.json")

        with open(colors_path, 'w') as f:
            json.dump(color_data, f, indent=2)

        return jsonify({
            'success': True,
            'message': f"Group colors saved for model '{model_name}'"
        }), 200

    except Exception as e:
        print(f"ERROR in save_group_colors: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print_all_routes()
    app.run(debug=True, port=5000)