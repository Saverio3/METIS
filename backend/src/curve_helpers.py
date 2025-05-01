"""
Helper functions for working with curve transformations across different models.
"""

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
    # Get the model object
    model_obj = get_model_object(model_name)
    if model_obj is None:
        return None
    
    # Import the test_icp function
    try:
        from src.curve_transformations import test_icp
        return test_icp(model_obj, variable_name)
    except ImportError:
        print("Error: Curve transformations module not found.")
        return None

def run_test_adbug(model_name=None, variable_name=None):
    """
    Run ADBUG curve tests on a model by name.
    
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
    # Get the model object
    model_obj = get_model_object(model_name)
    if model_obj is None:
        return None
    
    # Import the test_adbug function
    try:
        from src.curve_transformations import test_adbug
        return test_adbug(model_obj, variable_name)
    except ImportError:
        print("Error: Curve transformations module not found.")
        return None

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