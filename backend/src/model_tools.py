"""
Enhanced curve testing functions that don't rely on global models.
"""

def run_test_icp(model_name=None, variable_name=None):
    """
    Run ICP curve tests on a specified model or the current model.
    
    Parameters:
    -----------
    model_name : str, optional
        Name of the model to test. If None, uses the current model.
    variable_name : str, optional
        Name of the variable to test. If None, shows selection UI.
        
    Returns:
    --------
    DataFrame
        Results of the test
    """
    # Import the curve testing function
    try:
        from src.curve_transformations import test_icp
    except ImportError:
        print("Error: Curve transformations module not found.")
        return None
    
    # Find the model
    model_obj = get_model_by_name(model_name)
    if model_obj is None:
        return None
    
    # Run the test
    return test_icp(model_obj, variable_name)

def run_test_adbug(model_name=None, variable_name=None):
    """
    Run ADBUG curve tests on a specified model or the current model.
    
    Parameters:
    -----------
    model_name : str, optional
        Name of the model to test. If None, uses the current model.
    variable_name : str, optional
        Name of the variable to test. If None, shows selection UI.
        
    Returns:
    --------
    DataFrame
        Results of the test
    """
    # Import the curve testing function
    try:
        from src.curve_transformations import test_adbug
    except ImportError:
        print("Error: Curve transformations module not found.")
        return None
    
    # Find the model
    model_obj = get_model_by_name(model_name)
    if model_obj is None:
        return None
    
    # Run the test
    return test_adbug(model_obj, variable_name)

def get_model_by_name(model_name=None):
    """
    Get a model by name or return the current model if name is None.
    
    Parameters:
    -----------
    model_name : str, optional
        Name of the model to get
        
    Returns:
    --------
    LinearModel or None
        The model object
    """
    try:
        # First, try to access the global _model
        import src.interface as interface
        
        # If no model name provided, use the current model
        if model_name is None:
            if hasattr(interface, '_model') and interface._model is not None:
                return interface._model
            else:
                # Check if we can find it in the notebook globals
                from IPython import get_ipython
                ip = get_ipython()
                if ip is not None:
                    user_ns = ip.user_ns
                    if '_model' in user_ns and user_ns['_model'] is not None:
                        return user_ns['_model']
                    elif 'model' in user_ns and user_ns['model'] is not None:
                        return user_ns['model']
                        
                print("No current model found. Please create or load a model first.")
                return None
        
        # If a model name is provided, try to find a model with that name
        # First check if the current model has that name
        if hasattr(interface, '_model') and interface._model is not None and interface._model.name == model_name:
            return interface._model
            
        # If not found, look for saved models
        import os
        from src.linear_models import LinearModel
        
        # Look in models directory for a model with this name
        model_dir = 'models'
        if os.path.exists(model_dir):
            for file in os.listdir(model_dir):
                # Check if it's a model file
                if file.endswith('.pkl'):
                    # Extract model name from filename
                    model_file_name = os.path.splitext(file)[0]
                    if model_file_name == model_name:
                        # Try to load this model
                        try:
                            model_path = os.path.join(model_dir, file)
                            loaded_model = LinearModel.load_model(model_path)
                            print(f"Loaded model '{model_name}' from file.")
                            return loaded_model
                        except Exception as e:
                            print(f"Error loading model '{model_name}': {str(e)}")
                            break
        
        print(f"Model '{model_name}' not found. Please check the model name or create/load the model first.")
        return None
        
    except Exception as e:
        print(f"Error accessing model: {str(e)}")
        return None

# Add these functions to the interface module
def add_to_interface():
    """
    Add the enhanced functions to the interface module.
    """
    try:
        import src.interface as interface
        interface.run_test_icp = run_test_icp
        interface.run_test_adbug = run_test_adbug
        interface.get_model_by_name = get_model_by_name
        print("Enhanced curve testing functions added to interface.")
    except Exception as e:
        print(f"Error adding functions to interface: {str(e)}")

# Try to add functions immediately
add_to_interface()