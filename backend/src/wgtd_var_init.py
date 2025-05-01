"""
Initialization module for the weighted variables functionality.

This module should be imported to activate all the weighted variables features:
- wgtd_var() function for creating weighted variables
- Integration with model saving and loading
- Integration with Excel export and import
- Integration with decomposition
"""

def init_weighted_variables():
    """
    Initialize all weighted variables functionality.
    
    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    success = True
    
    # Apply interface updates
    try:
        from src.interface_update import apply_weighted_vars_to_interface
        success = success and apply_weighted_vars_to_interface()
    except ImportError:
        print("Warning: Could not apply interface updates for weighted variables.")
        success = False
    
    # Apply decomposition patches
    try:
        from src.decomposition_update import apply_decomposition_patches
        success = success and apply_decomposition_patches()
    except ImportError:
        print("Warning: Could not apply decomposition patches for weighted variables.")
        success = False
    
    return success

# Run initialization when the module is imported
init_result = init_weighted_variables()
if init_result:
    print("Weighted variables functionality initialized successfully.")
else:
    print("Warning: Weighted variables functionality may not be fully initialized.")

# Import the main function to make it directly available
try:
    from src.weighted_variables import wgtd_var
except ImportError:
    print("Error: Could not import wgtd_var function.")