import pandas as pd
import numpy as np
import statsmodels.api as sm
import pickle
import os
import datetime
from pathlib import Path

class LinearModel:
    """
    A class to manage linear regression models with support for variable transformations.
    """
    def __init__(self, name=None, loader=None):
        """
        Initialize a new LinearModel object.

        Parameters:
        -----------
        name : str, optional
            Name for the model
        loader : DataLoader, optional
            Data loader with transformation information
        """
        self.name = name or f"model_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.data = None
        self.model_data = None  # Filtered data used for modeling
        self.kpi = None
        self.features = []
        self.feature_transformations = {}  # Dictionary to store feature transformations
        self.transformed_data = {}  # Dictionary to store transformed data
        self.model = None
        self.results = None
        self.start_date = None
        self.end_date = None
        self.loader = loader  # Reference to the data loader for transformations
        self.fixed_coefficients = {}  # Store fixed coefficients

    def set_data(self, data):
        """
        Set the data for the model.

        Parameters:
        -----------
        data : pandas.DataFrame
            The data to use for modeling
        """
        self.data = data
        self.model_data = data.copy()
        return self

    def set_data_loader(self, loader):
        """
        Set the data loader for the model.

        Parameters:
        -----------
        loader : DataLoader
            The data loader with transformation information
        """
        self.loader = loader
        return self

    def set_date_range(self, start_date=None, end_date=None):
        """
        Set the date range for modeling.

        Parameters:
        -----------
        start_date : str or datetime, optional
            The start date for the modeling period
        end_date : str or datetime, optional
            The end date for the modeling period

        Returns:
        --------
        self
            For method chaining
        """
        if self.data is None:
            print("No data loaded. Please set data first.")
            return self

        try:
            self.start_date = pd.to_datetime(start_date) if start_date else None
            self.end_date = pd.to_datetime(end_date) if end_date else None

            self.model_data = self.data.copy()

            if self.start_date:
                self.model_data = self.model_data[self.model_data.index >= self.start_date]

            if self.end_date:
                self.model_data = self.model_data[self.model_data.index <= self.end_date]

            print(f"Model data set to period: {self.start_date} to {self.end_date}")
            print(f"Number of observations: {len(self.model_data)}")

            # Re-transform features for the new date range
            self._reapply_transformations()

            # Re-fit the model if there are features
            if self.features:
                self._refit_model()

        except Exception as e:
            print(f"Error setting date range: {str(e)}")
            import traceback
            traceback.print_exc()

        return self

    def _refit_model(self):
        """
        Re-fit the model with the current features and data.
        """
        if not self.features or not self.kpi:
            return

        try:
            import statsmodels.api as sm

            # Prepare data for fitting
            y = self.model_data[self.kpi]
            X = pd.DataFrame(index=y.index)

            # For each feature, use transformed data if available
            for feat in self.features:
                if hasattr(self, 'transformed_data') and feat in self.transformed_data:
                    X[feat] = self.transformed_data[feat]
                else:
                    X[feat] = self.model_data[feat]

            # Add constant
            X = sm.add_constant(X)

            # Fit the model
            self.model = sm.OLS(y, X)
            self.results = self.model.fit()

            print(f"Model re-fitted with {len(self.features)} features and {len(y)} observations")
            print(f"R-squared: {self.results.rsquared:.4f}")

        except Exception as e:
            print(f"Error re-fitting model: {str(e)}")
            import traceback
            traceback.print_exc()

    def _reapply_transformations(self):
        """
        Reapply transformations to all features after data has changed.
        """
        if not hasattr(self, 'features') or not self.features:
            return

        # Clear transformed data dictionary if it exists
        if hasattr(self, 'transformed_data'):
            self.transformed_data = {}
        else:
            self.transformed_data = {}

        # Reapply transformations for each feature
        for feature in self.features:
            if hasattr(self, 'feature_transformations') and feature in self.feature_transformations:
                transformation = self.feature_transformations[feature]
                self._apply_transformation(feature, transformation)

    def _apply_transformation(self, feature_name, transformation):
        """
        Apply transformation to a feature and store the result.

        Parameters:
        -----------
        feature_name : str
            Name of the feature to transform
        transformation : str
            Transformation type to apply (STA, SUB, MDV, etc.)
        """
        if feature_name not in self.model_data.columns:
            print(f"Error: Feature '{feature_name}' not found in the model data.")
            return

        # Apply the transformation
        original_data = self.model_data[feature_name]

        if transformation == 'STA':
            # Standardizing (STA): Dividing each observation by the mean of the region
            transformed = original_data / original_data.mean() if original_data.mean() != 0 else original_data

        elif transformation == 'SUB':
            # Subtracting (SUB): Subtracting from each observation the mean of the region
            transformed = original_data - original_data.mean()

        elif transformation == 'MDV':
            # Mean of Dependent Variable (MDV): Divides each variable by the mean of dependent variable
            if self.kpi and self.kpi in self.model_data.columns:
                kpi_mean = self.model_data[self.kpi].mean()
                transformed = original_data / kpi_mean if kpi_mean != 0 else original_data
            else:
                print(f"Warning: Cannot apply MDV transformation for '{feature_name}'. KPI not set or invalid.")
                transformed = original_data
        else:
            print(f"Warning: Unknown transformation '{transformation}' for feature '{feature_name}'.")
            transformed = original_data

        # Store the transformed data
        self.transformed_data[feature_name] = transformed

    def set_kpi(self, kpi_name):
        """
        Set the KPI (dependent variable) for the model.

        Parameters:
        -----------
        kpi_name : str
            The name of the column to use as the KPI
        """
        if self.model_data is None:
            print("No data set. Please set data first.")
            return self

        if kpi_name not in self.model_data.columns:
            print(f"Error: '{kpi_name}' not found in the data.")
            return self

        self.kpi = kpi_name
        print(f"KPI set to '{kpi_name}'")

        # Initialize the model with just the constant term
        self.initialize_model()

        # Reapply MDV transformations if any, now that KPI is set
        for feature, transformation in self.feature_transformations.items():
            if transformation == 'MDV':
                self._apply_transformation(feature, transformation)

        return self

    def initialize_model(self):
        """
        Initialize the model with just the constant term.
        """
        if self.kpi is None:
            print("No KPI set. Please set a KPI first.")
            return self

        try:
            # Prepare the data
            y = self.model_data[self.kpi]
            X = sm.add_constant(pd.DataFrame(index=y.index))  # Only the constant term

            # Initialize the model
            self.model = sm.OLS(y, X)
            self.results = self.model.fit()

            print("Model initialized with constant term only.")
            print(f"Constant term: {self.results.params['const']:.4f}")
            print(f"R-squared: {self.results.rsquared:.4f}")

        except Exception as e:
            print(f"Error initializing model: {str(e)}")

        return self

    def add_feature(self, feature_name, transformation=None):
        """
        Add a feature to the model with optional transformation.

        Parameters:
        -----------
        feature_name : str
            The name of the column to add as a feature
        transformation : str, optional
            Transformation code to apply (STA, SUB, MDV).
            If None, uses transformation from data loader if available.
        """
        if self.model_data is None or self.kpi is None:
            print("No data or KPI set. Please set both first.")
            return self

        if feature_name not in self.model_data.columns:
            print(f"Error: '{feature_name}' not found in the data.")
            return self

        if feature_name == self.kpi:
            print(f"Error: Cannot use KPI '{feature_name}' as a feature.")
            return self

        if feature_name in self.features:
            print(f"Feature '{feature_name}' already in the model.")
            return self

        try:
            # Determine transformation to apply
            if transformation is None and self.loader is not None:
                # Check if data loader has a transformation for this feature
                transformation = self.loader.get_transformation(feature_name)

            if transformation:
                print(f"Applying '{transformation}' transformation to feature '{feature_name}'")
                self.feature_transformations[feature_name] = transformation
                self._apply_transformation(feature_name, transformation)

            # Add the feature to our list
            self.features.append(feature_name)

            # Prepare the data for model fitting
            y = self.model_data[self.kpi]
            X = pd.DataFrame(index=y.index)

            # For each feature, use transformed data if available
            for feat in self.features:
                if feat in self.transformed_data:
                    X[feat] = self.transformed_data[feat]
                else:
                    X[feat] = self.model_data[feat]

            # Add the constant
            X = sm.add_constant(X)

            # Fit the model
            self.model = sm.OLS(y, X)
            self.results = self.model.fit()

            print(f"Added feature '{feature_name}' to the model.")

        except Exception as e:
            # If there was an error, remove the feature from our list
            if feature_name in self.features:
                self.features.remove(feature_name)
            if feature_name in self.feature_transformations:
                del self.feature_transformations[feature_name]
            if feature_name in self.transformed_data:
                del self.transformed_data[feature_name]

            print(f"Error adding feature: {str(e)}")

        return self

    def remove_feature(self, feature_name):
        """
        Remove a feature from the model.

        Parameters:
        -----------
        feature_name : str
            The name of the feature to remove
        """
        if feature_name not in self.features:
            print(f"Feature '{feature_name}' not in the model.")
            return self

        try:
            # Remove the feature from our list
            self.features.remove(feature_name)

            # Remove transformation info if present
            if feature_name in self.feature_transformations:
                del self.feature_transformations[feature_name]

            # Remove transformed data if present
            if feature_name in self.transformed_data:
                del self.transformed_data[feature_name]

            if not self.features:
                # If no features left, reinitialize with just the constant
                self.initialize_model()
            else:
                # Prepare the data for model fitting
                y = self.model_data[self.kpi]
                X = pd.DataFrame(index=y.index)

                # For each feature, use transformed data if available
                for feat in self.features:
                    if feat in self.transformed_data:
                        X[feat] = self.transformed_data[feat]
                    else:
                        X[feat] = self.model_data[feat]

                # Add the constant
                X = sm.add_constant(X)

                # Fit the model
                self.model = sm.OLS(y, X)
                self.results = self.model.fit()

            print(f"Removed feature '{feature_name}' from the model.")

        except Exception as e:
            print(f"Error removing feature: {str(e)}")

        return self

    # Fix a coefficient
    def set_fixed_coefficient(self, variable_name, value):
        """
        Set a fixed coefficient for a variable.

        Parameters:
        -----------
        variable_name : str
            Name of the variable to fix
        value : float
            Fixed coefficient value
        """
        if variable_name not in self.features and variable_name != 'const':
            raise ValueError(f"Variable '{variable_name}' not in model features")

        # Store the fixed coefficient
        self.fixed_coefficients[variable_name] = float(value)

        # Re-fit the model with fixed coefficient
        self._refit_model_with_fixed_coefficients()

        return self

    # Unfix a coefficient
    def unset_fixed_coefficient(self, variable_name):
        """
        Unset a fixed coefficient for a variable, making it floating again.

        Parameters:
        -----------
        variable_name : str
            Name of the variable to unfix
        """
        if variable_name in self.fixed_coefficients:
            del self.fixed_coefficients[variable_name]

            # Re-fit the model without the fixed coefficient
            self._refit_model_with_fixed_coefficients()

        return self

    # Refit the model with fixed coefficients
    def _refit_model_with_fixed_coefficients(self):
        """
        Refit the model while respecting fixed coefficients.
        """
        if not self.features or not self.kpi or not self.model_data is not None:
            return

        try:
            import statsmodels.api as sm
            import pandas as pd
            import numpy as np

            # Prepare the data
            y = self.model_data[self.kpi]

            # If there are no fixed coefficients, use the standard fitting
            if not self.fixed_coefficients:
                # Add each feature
                X = pd.DataFrame(index=y.index)
                for feat in self.features:
                    if feat in self.transformed_data:
                        X[feat] = self.transformed_data[feat]
                    else:
                        X[feat] = self.model_data[feat]

                # Add constant
                X = sm.add_constant(X)

                # Fit model
                self.model = sm.OLS(y, X)
                self.results = self.model.fit()
                return

            # Handle case with fixed coefficients
            # First, adjust y by subtracting the fixed components
            adjusted_y = y.copy()
            remaining_features = []

            # Process fixed coefficients
            for var, coef in self.fixed_coefficients.items():
                if var == 'const':
                    # Subtract the fixed constant
                    adjusted_y = adjusted_y - coef
                elif var in self.features:
                    # Get variable data
                    if var in self.transformed_data:
                        var_data = self.transformed_data[var]
                    else:
                        var_data = self.model_data[var]

                    # Subtract the fixed component
                    adjusted_y = adjusted_y - coef * var_data
                else:
                    # Skip variables not in the model
                    continue

            # Identify remaining features (not fixed)
            remaining_features = [f for f in self.features if f not in self.fixed_coefficients]

            # If there are no remaining features and const is fixed, we're done
            if not remaining_features and 'const' in self.fixed_coefficients:
                # Create a simple OLS result with just the fixed coefficients
                X = pd.DataFrame(index=y.index)
                X['const'] = 1.0
                for feat in self.features:
                    if feat in self.transformed_data:
                        X[feat] = self.transformed_data[feat]
                    else:
                        X[feat] = self.model_data[feat]

                self.model = sm.OLS(y, X)
                result = self.model.fit()

                # Overwrite the parameters with fixed values
                params = result.params.copy()
                for var, coef in self.fixed_coefficients.items():
                    params[var] = coef

                # Store the modified results
                self.results = result
                self.results.params = params
                return

            # Prepare data for remaining features
            X = pd.DataFrame(index=y.index)
            for feat in remaining_features:
                if feat in self.transformed_data:
                    X[feat] = self.transformed_data[feat]
                else:
                    X[feat] = self.model_data[feat]

            # Add constant if not fixed
            if 'const' not in self.fixed_coefficients:
                X = sm.add_constant(X)

            # Fit model with remaining features
            remaining_model = sm.OLS(adjusted_y, X)
            remaining_results = remaining_model.fit()

            # Now reconstruct the full model results
            X_full = pd.DataFrame(index=y.index)
            X_full['const'] = 1.0
            for feat in self.features:
                if feat in self.transformed_data:
                    X_full[feat] = self.transformed_data[feat]
                else:
                    X_full[feat] = self.model_data[feat]

            self.model = sm.OLS(y, X_full)
            self.results = self.model.fit()

            # Override the coefficients with fixed values
            params = self.results.params.copy()
            for var, coef in self.fixed_coefficients.items():
                params[var] = coef

            # For remaining features, use the fitted values
            if 'const' not in self.fixed_coefficients and 'const' in remaining_results.params:
                params['const'] = remaining_results.params['const']

            for feat in remaining_features:
                if feat in remaining_results.params:
                    params[feat] = remaining_results.params[feat]

            # Update the model parameters
            self.results.params = params

        except Exception as e:
            print(f"Error refitting model with fixed coefficients: {str(e)}")
            import traceback
            traceback.print_exc()

    def get_summary(self):
        """
        Get a summary of the model.

        Returns:
        --------
        statsmodels.iolib.summary.Summary or str
            Summary of the model
        """
        if self.results is None:
            return "No model has been fitted yet."

        return self.results.summary()

    def save_model(self, file_path=None, directory='models'):
        """
        Save the model to a file.

        Parameters:
        -----------
        file_path : str, optional
            Full path where to save the model (overrides directory and uses this exact path)
        directory : str, optional
            Directory to save the model in (used if file_path is not provided)

        Returns:
        --------
        str
            Path to the saved model file
        """
        if self.results is None:
            print("No model to save.")
            return None

        try:
            if file_path is not None:
                # Ensure the directory exists
                save_dir = os.path.dirname(file_path)
                if save_dir:
                    Path(save_dir).mkdir(parents=True, exist_ok=True)

                # Use the provided path directly
                filename = file_path
            else:
                # Create the directory if it doesn't exist
                Path(directory).mkdir(parents=True, exist_ok=True)

                # Create the filename
                filename = os.path.join(directory, f"{self.name}.pkl")

            # Store all transformed variables that exist in model_data
            transformed_variables = {}
            if hasattr(self, 'model_data'):
                # Get all variables in model_data that appear to be transformations
                all_columns = list(self.model_data.columns)

                # Find all transformation types
                split_vars = [var for var in all_columns if '|SPLIT' in var]
                mult_vars = [var for var in all_columns if '|MULT' in var]
                lag_vars = [var for var in all_columns if '|LAG' in var]
                lead_vars = [var for var in all_columns if '|LEAD' in var]
                adstock_vars = [var for var in all_columns if '_adstock_' in var]

                # Add all transformed variables to the dictionary
                for var in split_vars + mult_vars + lag_vars + lead_vars + adstock_vars:
                    transformed_variables[var] = self.model_data[var].values.tolist()

            # Save the model
            with open(filename, 'wb') as f:
                pickle.dump({
                    'name': self.name,
                    'kpi': self.kpi,
                    'features': self.features,
                    'feature_transformations': self.feature_transformations,
                    'model': self.model,
                    'results': self.results,
                    'start_date': self.start_date,
                    'end_date': self.end_date,
                    'var_transformations': getattr(self, 'var_transformations', {}),
                    'transformed_variables': transformed_variables  # Add all transformed variables
                }, f)

            print(f"Model saved to {filename}")
            if transformed_variables:
                print(f"Saved {len(transformed_variables)} transformed variables with the model")

            return filename

        except Exception as e:
            print(f"Error saving model: {str(e)}")
            return None

    @classmethod
    def load_model(cls, filename):
        """
        Load a model from a file.

        Parameters:
        -----------
        filename : str
            Path to the model file

        Returns:
        --------
        LinearModel
            The loaded model
        """
        try:
            # Load the model
            with open(filename, 'rb') as f:
                model_data = pickle.load(f)

            # Create a new model
            model = cls(name=model_data['name'])
            model.kpi = model_data['kpi']
            model.features = model_data['features']
            model.feature_transformations = model_data.get('feature_transformations', {})
            model.model = model_data['model']
            model.results = model_data['results']
            model.start_date = model_data['start_date']
            model.end_date = model_data['end_date']

            # Load variable transformations if available
            if 'var_transformations' in model_data:
                model.var_transformations = model_data['var_transformations']

            print(f"Model loaded from {filename}")
            print(f"KPI: {model.kpi}")
            print(f"Features: {', '.join(model.features) if model.features else 'None (constant only)'}")

            # Print transformation info if available
            if model.feature_transformations:
                print(f"Transformations: {len(model.feature_transformations)} features have transformations")

            # Restore transformed variables if available
            if 'transformed_variables' in model_data and model_data['transformed_variables']:
                transformed_vars = model_data['transformed_variables']
                print(f"Restoring {len(transformed_vars)} transformed variables...")

                # Make sure model_data is initialized
                if not hasattr(model, 'model_data') or model.model_data is None:
                    model.model_data = pd.DataFrame()

                # Add each transformed variable to model_data
                for var_name, values in transformed_vars.items():
                    if var_name not in model.model_data.columns:
                        if len(values) == len(model.model_data) or len(model.model_data) == 0:
                            # If model_data is empty or lengths match, we can add directly
                            model.model_data[var_name] = values

            return model

        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return None

def apply_split_by_date(model, variable_name, start_date=None, end_date=None, identifier=""):
    """
    Apply a date-based split transformation to a variable in the model.

    Parameters:
    -----------
    model : LinearModel
        The model to apply the transformation to
    variable_name : str
        Name of the variable to transform
    start_date : str or datetime, optional
        Start date for the period to keep values (inclusive)
    end_date : str or datetime, optional
        End date for the period to keep values (inclusive)
    identifier : str, optional
        Custom identifier to append to the variable name

    Returns:
    --------
    str
        The name of the new variable
    """
    from src.variable_transformations import split_by_date

    if model.model_data is None:
        print("No data available. Please set data first.")
        return None

    if variable_name not in model.model_data.columns:
        print(f"Variable '{variable_name}' not found in the model data.")
        return None

    try:
        # Apply the transformation
        _, new_var_name = split_by_date(
            model.model_data,
            variable_name,
            start_date,
            end_date,
            identifier,
            inplace=True
        )

        # Store transformation information
        if not hasattr(model, 'var_transformations'):
            model.var_transformations = {}

        model.var_transformations[new_var_name] = {
            'type': 'split_by_date',
            'original_var': variable_name,
            'start_date': start_date,
            'end_date': end_date,
            'identifier': identifier
        }

        print(f"Created new variable '{new_var_name}'")
        return new_var_name

    except Exception as e:
        print(f"Error applying transformation: {str(e)}")
        return None

def apply_multiply_vars(model, var1, var2, identifier=""):
    """
    Apply multiplication transformation to two variables in the model.

    Parameters:
    -----------
    model : LinearModel
        The model to apply the transformation to
    var1 : str
        Name of the first variable
    var2 : str
        Name of the second variable
    identifier : str, optional
        Custom identifier for the new variable name

    Returns:
    --------
    str
        The name of the new variable
    """
    from src.variable_transformations import multiply_variables

    if model.model_data is None:
        print("No data available. Please set data first.")
        return None

    if var1 not in model.model_data.columns:
        print(f"Variable '{var1}' not found in the model data.")
        return None

    if var2 not in model.model_data.columns:
        print(f"Variable '{var2}' not found in the model data.")
        return None

    try:
        # Apply the transformation
        _, new_var_name = multiply_variables(
            model.model_data,
            var1,
            var2,
            identifier,
            inplace=True
        )

        # Store transformation information
        if not hasattr(model, 'var_transformations'):
            model.var_transformations = {}

        model.var_transformations[new_var_name] = {
            'type': 'multiply',
            'var1': var1,
            'var2': var2,
            'identifier': identifier
        }

        print(f"Created new variable '{new_var_name}'")
        return new_var_name

    except Exception as e:
        print(f"Error applying transformation: {str(e)}")
        return None

def load_transformed_variables(model):
    """
    Load transformed variables stored in the model.

    Parameters:
    -----------
    model : LinearModel
        The model containing transformation information

    Returns:
    --------
    bool
        True if successful, False otherwise
    """
    if not hasattr(model, 'var_transformations') or not model.var_transformations:
        print("No variable transformations to load.")
        return False

    if model.model_data is None:
        print("No data available. Please set data first.")
        return False

    from src.variable_transformations import split_by_date, multiply_variables

    try:
        count = 0
        for var_name, info in model.var_transformations.items():
            if info['type'] == 'split_by_date':
                # Apply split by date
                split_by_date(
                    model.model_data,
                    info['original_var'],
                    info['start_date'],
                    info['end_date'],
                    info['identifier'],
                    inplace=True
                )
                count += 1

            elif info['type'] == 'multiply':
                # Apply multiplication
                multiply_variables(
                    model.model_data,
                    info['var1'],
                    info['var2'],
                    info['identifier'],
                    inplace=True
                )
                count += 1

        if count > 0:
            print(f"Loaded {count} transformed variables")

        return True

    except Exception as e:
        print(f"Error loading transformations: {str(e)}")
        return False