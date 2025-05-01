"""
Functions for variable transformations in the econometric tool.
"""

import pandas as pd
import numpy as np

def split_by_date(data, variable_name, start_date=None, end_date=None, identifier="", inplace=False):
    """
    Split a variable by date range - keeping values only within the specified date range
    and setting values to zero outside that range.
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data (with datetime index)
    variable_name : str
        Name of the variable to split
    start_date : str or datetime, optional
        Start date for the period to keep values (inclusive)
    end_date : str or datetime, optional
        End date for the period to keep values (inclusive)
    identifier : str, optional
        Custom identifier to append to the variable name
    inplace : bool, optional
        If True, modifies the DataFrame in place
        
    Returns:
    --------
    pandas.DataFrame, str
        Modified DataFrame and the new variable name
    """
    if not inplace:
        data = data.copy()
        
    # Check if variable exists
    if variable_name not in data.columns:
        raise ValueError(f"Variable '{variable_name}' not found in the data")
    
    # Convert dates to datetime
    if start_date is not None:
        start_date = pd.to_datetime(start_date)
    if end_date is not None:
        end_date = pd.to_datetime(end_date)
    
    # Create new variable name
    if not identifier:
        identifier = f"{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}" if start_date and end_date else "split"
    
    # Use |SPLIT instead of |EDIT
    new_var_name = f"{variable_name}|SPLIT {identifier}"
    
    # Create a mask for dates within the range
    mask = pd.Series(True, index=data.index)
    if start_date is not None:
        mask = mask & (data.index >= start_date)
    if end_date is not None:
        mask = mask & (data.index <= end_date)
    
    # Create the new variable
    data[new_var_name] = 0.0
    data.loc[mask, new_var_name] = data.loc[mask, variable_name]
    
    return data, new_var_name

def multiply_variables(data, var1, var2, identifier="", inplace=False):
    """
    Multiply two variables together.
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data
    var1 : str
        Name of the first variable
    var2 : str
        Name of the second variable
    identifier : str, optional
        Custom identifier for the new variable name
    inplace : bool, optional
        If True, modifies the DataFrame in place
        
    Returns:
    --------
    pandas.DataFrame, str
        Modified DataFrame and the new variable name
    """
    if not inplace:
        data = data.copy()
    
    # Check if variables exist
    if var1 not in data.columns:
        raise ValueError(f"Variable '{var1}' not found in the data")
    if var2 not in data.columns:
        raise ValueError(f"Variable '{var2}' not found in the data")
    
    # Create new variable name
    if not identifier:
        identifier = f"{var1}*{var2}"
    
    # Use |MULT for multiply operations
    new_var_name = f"{var1}*{var2}|MULT {identifier}"
    
    # Create the new variable
    data[new_var_name] = data[var1] * data[var2]
    
    return data, new_var_name

def get_transformation_info(name):
    """
    Parse a transformation from the variable name.
    
    Parameters:
    -----------
    name : str
        Variable name with possible transformation info
        
    Returns:
    --------
    dict
        Dictionary with transformation info
    """
    info = {
        'original_var': name,
        'type': None,
        'parameters': {}
    }
    
    # Check if this is a transformed variable - support both |SPLIT and |EDIT for backward compatibility
    if '|SPLIT' in name:
        parts = name.split('|SPLIT')
        base_name = parts[0]
        identifier = parts[1].strip()
        
        # This is a date split
        info['type'] = 'split_by_date'
        info['parameters']['variable_name'] = base_name
        info['parameters']['identifier'] = identifier
        
        # Try to extract dates from identifier if it has a date format
        if '-' in identifier and identifier.replace('-', '').isdigit() and len(identifier.replace('-', '')) == 16:
            try:
                start_date = pd.to_datetime(identifier.split('-')[0])
                end_date = pd.to_datetime(identifier.split('-')[1])
                info['parameters']['start_date'] = start_date
                info['parameters']['end_date'] = end_date
            except:
                pass
    
    elif '|MULT' in name:
        parts = name.split('|MULT')
        base_name = parts[0]
        identifier = parts[1].strip()
        
        if '*' in base_name:
            # This is a multiplication
            vars = base_name.split('*')
            info['type'] = 'multiply'
            info['parameters']['var1'] = vars[0]
            info['parameters']['var2'] = vars[1]
            info['parameters']['identifier'] = identifier
    
    # For backwards compatibility
    elif '|EDIT' in name:
        parts = name.split('|EDIT')
        base_name = parts[0]
        identifier = parts[1].strip()
        
        if '*' in base_name:
            # This is a multiplication
            vars = base_name.split('*')
            info['type'] = 'multiply'
            info['parameters']['var1'] = vars[0]
            info['parameters']['var2'] = vars[1]
            info['parameters']['identifier'] = identifier
        else:
            # This is a date split
            info['type'] = 'split_by_date'
            info['parameters']['variable_name'] = base_name
            info['parameters']['identifier'] = identifier
            
            # Try to extract dates from identifier if it has a date format
            if '-' in identifier and identifier.replace('-', '').isdigit() and len(identifier.replace('-', '')) == 16:
                try:
                    start_date = pd.to_datetime(identifier.split('-')[0])
                    end_date = pd.to_datetime(identifier.split('-')[1])
                    info['parameters']['start_date'] = start_date
                    info['parameters']['end_date'] = end_date
                except:
                    pass
    
    return info


"""
Functions for creating lead and lag variables in the econometric tool.
"""

import pandas as pd
import numpy as np

def create_lead(data, variables=None, periods=None, inplace=False):
    """
    Create lead variables (future values of a variable).
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data (with datetime index)
    variables : str, list, or None, optional
        Variable name(s) to create leads for. If None, will prompt for input.
    periods : int, list, or None, optional
        Number of periods to shift forward for each lead. If None, will prompt for input.
    inplace : bool, optional
        If True, modifies the DataFrame in place
        
    Returns:
    --------
    pandas.DataFrame, list
        Modified DataFrame and list of new variable names
    """
    if not inplace:
        data = data.copy()
    
    # Get variables input if not provided
    if variables is None:
        var_input = input("Enter variable names to create leads for (separated by commas): ")
        variables = [v.strip() for v in var_input.split(',') if v.strip()]
    elif isinstance(variables, str):
        variables = [variables]
    
    # Check if all variables exist
    missing_vars = [var for var in variables if var not in data.columns]
    if missing_vars:
        raise ValueError(f"The following variables were not found in the data: {', '.join(missing_vars)}")
    
    # Get periods input if not provided
    if periods is None:
        period_input = input("Enter the number of periods for leads (separated by commas): ")
        try:
            periods = [int(p.strip()) for p in period_input.split(',') if p.strip()]
        except ValueError:
            raise ValueError("Periods must be integers")
    elif isinstance(periods, int):
        periods = [periods]
    elif isinstance(periods, (list, tuple)):
        try:
            periods = [int(p) for p in periods]
        except (ValueError, TypeError):
            raise ValueError("Periods must be integers")
    
    # Make sure all periods are positive
    if any(p <= 0 for p in periods):
        raise ValueError("All periods must be positive integers")
    
    # Create the new variables
    new_var_names = []
    
    for var in variables:
        for period in periods:
            # Create the new variable name
            new_var_name = f"{var}|LEAD {period}"
            
            # Create the new variable by shifting
            data[new_var_name] = data[var].shift(-period)
            
            # Add to list of new variable names
            new_var_names.append(new_var_name)
            
            print(f"Created lead variable: {new_var_name}")
    
    return data, new_var_names

def create_lag(data, variables=None, periods=None, inplace=False):
    """
    Create lag variables (past values of a variable).
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data (with datetime index)
    variables : str, list, or None, optional
        Variable name(s) to create lags for. If None, will prompt for input.
    periods : int, list, or None, optional
        Number of periods to shift backward for each lag. If None, will prompt for input.
    inplace : bool, optional
        If True, modifies the DataFrame in place
        
    Returns:
    --------
    pandas.DataFrame, list
        Modified DataFrame and list of new variable names
    """
    if not inplace:
        data = data.copy()
    
    # Get variables input if not provided
    if variables is None:
        var_input = input("Enter variable names to create lags for (separated by commas): ")
        variables = [v.strip() for v in var_input.split(',') if v.strip()]
    elif isinstance(variables, str):
        variables = [variables]
    
    # Check if all variables exist
    missing_vars = [var for var in variables if var not in data.columns]
    if missing_vars:
        raise ValueError(f"The following variables were not found in the data: {', '.join(missing_vars)}")
    
    # Get periods input if not provided
    if periods is None:
        period_input = input("Enter the number of periods for lags (separated by commas): ")
        try:
            periods = [int(p.strip()) for p in period_input.split(',') if p.strip()]
        except ValueError:
            raise ValueError("Periods must be integers")
    elif isinstance(periods, int):
        periods = [periods]
    elif isinstance(periods, (list, tuple)):
        try:
            periods = [int(p) for p in periods]
        except (ValueError, TypeError):
            raise ValueError("Periods must be integers")
    
    # Make sure all periods are positive
    if any(p <= 0 for p in periods):
        raise ValueError("All periods must be positive integers")
    
    # Create the new variables
    new_var_names = []
    
    for var in variables:
        for period in periods:
            # Create the new variable name
            new_var_name = f"{var}|LAG {period}"
            
            # Create the new variable by shifting
            data[new_var_name] = data[var].shift(period)
            
            # Add to list of new variable names
            new_var_names.append(new_var_name)
            
            print(f"Created lag variable: {new_var_name}")
    
    return data, new_var_names

def get_transformation_info(name):
    """
    Parse a transformation from the variable name.
    
    Parameters:
    -----------
    name : str
        Variable name with possible transformation info
        
    Returns:
    --------
    dict
        Dictionary with transformation info
    """
    info = {
        'original_var': name,
        'type': None,
        'parameters': {}
    }
    
    # Check if this is a transformed variable
    if '|SPLIT' in name:
        parts = name.split('|SPLIT')
        base_name = parts[0]
        identifier = parts[1].strip()
        
        # This is a date split
        info['type'] = 'split_by_date'
        info['parameters']['variable_name'] = base_name
        info['parameters']['identifier'] = identifier
        
        # Try to extract dates from identifier if it has a date format
        if '-' in identifier and identifier.replace('-', '').isdigit() and len(identifier.replace('-', '')) == 16:
            try:
                start_date = pd.to_datetime(identifier.split('-')[0])
                end_date = pd.to_datetime(identifier.split('-')[1])
                info['parameters']['start_date'] = start_date
                info['parameters']['end_date'] = end_date
            except:
                pass
    
    elif '|MULT' in name:
        parts = name.split('|MULT')
        base_name = parts[0]
        identifier = parts[1].strip()
        
        if '*' in base_name:
            # This is a multiplication
            vars = base_name.split('*')
            info['type'] = 'multiply'
            info['parameters']['var1'] = vars[0]
            info['parameters']['var2'] = vars[1]
            info['parameters']['identifier'] = identifier
    
    elif '|LEAD' in name:
        parts = name.split('|LEAD')
        base_name = parts[0]
        period_str = parts[1].strip()
        
        # Try to extract the period
        try:
            period = int(period_str)
            info['type'] = 'lead'
            info['parameters']['variable_name'] = base_name
            info['parameters']['period'] = period
        except:
            pass
    
    elif '|LAG' in name:
        parts = name.split('|LAG')
        base_name = parts[0]
        period_str = parts[1].strip()
        
        # Try to extract the period
        try:
            period = int(period_str)
            info['type'] = 'lag'
            info['parameters']['variable_name'] = base_name
            info['parameters']['period'] = period
        except:
            pass
    
    # For backwards compatibility
    elif '|EDIT' in name:
        parts = name.split('|EDIT')
        base_name = parts[0]
        identifier = parts[1].strip()
        
        if '*' in base_name:
            # This is a multiplication
            vars = base_name.split('*')
            info['type'] = 'multiply'
            info['parameters']['var1'] = vars[0]
            info['parameters']['var2'] = vars[1]
            info['parameters']['identifier'] = identifier
        else:
            # This is a date split
            info['type'] = 'split_by_date'
            info['parameters']['variable_name'] = base_name
            info['parameters']['identifier'] = identifier
            
            # Try to extract dates from identifier if it has a date format
            if '-' in identifier and identifier.replace('-', '').isdigit() and len(identifier.replace('-', '')) == 16:
                try:
                    start_date = pd.to_datetime(identifier.split('-')[0])
                    end_date = pd.to_datetime(identifier.split('-')[1])
                    info['parameters']['start_date'] = start_date
                    info['parameters']['end_date'] = end_date
                except:
                    pass
    
    return info