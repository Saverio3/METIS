"""
This module contains compatibility functions to ensure backward compatibility
with existing code while implementing the new transformations.
"""
import types
import pandas as pd

def check_and_add_methods(model_class):
    """
    Add any missing methods to the LinearModel class for backward compatibility.
    
    Parameters:
    -----------
    model_class : class
        The LinearModel class to modify
    """
    # Check if get_summary method exists
    if not hasattr(model_class, 'get_summary'):
        def get_summary(self):
            """Get a summary of the model."""
            if self.results is None:
                return "No model has been fitted yet."
                
            return self.results.summary()
        
        # Add the method to the class as a class method (not instance method)
        setattr(model_class, 'get_summary', get_summary)
    
    # Ensure all necessary attributes exist
    old_init = model_class.__init__
    
    def new_init(self, *args, **kwargs):
        old_init(self, *args, **kwargs)
        
        # Ensure these attributes exist
        if not hasattr(self, 'feature_transformations'):
            self.feature_transformations = {}
        if not hasattr(self, 'transformed_data'):
            self.transformed_data = {}
            
        # Add the apply_transformation method if it doesn't exist
        if not hasattr(self, '_apply_transformation'):
            def _apply_transformation(instance, feature_name):
                """Apply transformation to a feature and store the result."""
                if feature_name not in instance.model_data.columns:
                    print(f"Error: Feature '{feature_name}' not found in the model data.")
                    return
                    
                if feature_name not in instance.feature_transformations:
                    # No transformation to apply
                    return
                    
                transformation = instance.feature_transformations[feature_name]
                
                # Apply the transformation
                original_data = instance.model_data[feature_name]
                
                if transformation == 'STA':
                    # Standardizing (STA): Dividing each observation by the mean of the region
                    transformed = original_data / original_data.mean() if original_data.mean() != 0 else original_data
                    
                elif transformation == 'SUB':
                    # Subtracting (SUB): Subtracting from each observation the mean of the region
                    transformed = original_data - original_data.mean()
                    
                elif transformation == 'MDV':
                    # Mean of Dependent Variable (MDV): Divides each variable by the mean of dependent variable
                    if instance.kpi and instance.kpi in instance.model_data.columns:
                        kpi_mean = instance.model_data[instance.kpi].mean()
                        transformed = original_data / kpi_mean if kpi_mean != 0 else original_data
                    else:
                        print(f"Warning: Cannot apply MDV transformation for '{feature_name}'. KPI not set or invalid.")
                        transformed = original_data
                else:
                    print(f"Warning: Unknown transformation '{transformation}' for feature '{feature_name}'.")
                    transformed = original_data
                    
                # Store the transformed data
                instance.transformed_data[feature_name] = transformed
            
            # Set the method on the instance, not the class
            self._apply_transformation = types.MethodType(_apply_transformation, self)
    
    # Replace the __init__ method
    model_class.__init__ = new_init

def enhance_model_class():
    """
    Add enhancements to the LinearModel class without breaking backwards compatibility.
    """
    try:
        from src.linear_models import LinearModel
        
        # Check if the class has get_summary method
        if not hasattr(LinearModel, 'get_summary'):
            def get_summary(self):
                if self.results is None:
                    return "No model has been fitted yet."
                return self.results.summary()
            LinearModel.get_summary = get_summary
        
        # Add a function to get transformations from the data loader
        def update_transformations_from_loader(self):
            """Update transformations from data loader."""
            if hasattr(self, 'loader') and self.loader is not None:
                loader_trans = self.loader.get_transformations()
                if not hasattr(self, 'feature_transformations'):
                    self.feature_transformations = {}
                
                # Update transformations for features in the model
                for feature in self.features:
                    if feature in loader_trans:
                        self.feature_transformations[feature] = loader_trans[feature]
        
        LinearModel.update_transformations_from_loader = update_transformations_from_loader
        
        # Apply transformations to the model
        def apply_loader_transformations(self):
            """Apply transformations from data loader to the model data."""
            if hasattr(self, 'loader') and self.loader is not None:
                loader_trans = self.loader.get_transformations()
                
                if not hasattr(self, 'feature_transformations'):
                    self.feature_transformations = {}
                
                if not hasattr(self, 'transformed_data'):
                    self.transformed_data = {}
                
                # Update and apply transformations for features in the model
                for feature in self.features:
                    if feature in loader_trans:
                        # Store the transformation
                        self.feature_transformations[feature] = loader_trans[feature]
                        
                        # Apply the transformation
                        transformation = loader_trans[feature]
                        original_data = self.model_data[feature]
                        
                        if transformation == 'STA':
                            # Standardizing (STA)
                            transformed = original_data / original_data.mean() if original_data.mean() != 0 else original_data
                        elif transformation == 'SUB':
                            # Subtracting (SUB)
                            transformed = original_data - original_data.mean()
                        elif transformation == 'MDV':
                            # Mean of Dependent Variable (MDV)
                            if self.kpi and self.kpi in self.model_data.columns:
                                kpi_mean = self.model_data[self.kpi].mean()
                                transformed = original_data / kpi_mean if kpi_mean != 0 else original_data
                            else:
                                print(f"Warning: Cannot apply MDV transformation for '{feature}'. KPI not set or invalid.")
                                transformed = original_data
                        else:
                            print(f"Warning: Unknown transformation '{transformation}' for feature '{feature}'.")
                            transformed = original_data
                            
                        # Store the transformed data
                        self.transformed_data[feature] = transformed
        
        LinearModel.apply_loader_transformations = apply_loader_transformations
        
        return True
    except Exception as e:
        print(f"Warning: Could not enhance LinearModel class: {str(e)}")
        return False