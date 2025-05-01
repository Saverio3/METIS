"""
Chart functions for model decomposition visualization with interactive features.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import ipywidgets as widgets
from IPython.display import display, HTML, clear_output
import io
import base64

# For interactive charts
try:
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False
    print("Plotly not available. Interactive charts will be disabled.")
    print("To enable interactive charts: pip install plotly")

# Define color mapping for common groups
GROUP_COLORS = {
    'Base': '#CCCCCC',        # Light gray
    'Pricing': '#FF0000',     # Red
    'Price': '#FF0000',       # Red
    'Promotions': '#FFA500',  # Orange
    'Promotion': '#FFA500',   # Orange
    'Promo': '#FFA500',       # Orange
    'Media': '#4682B4',       # Steel blue
    'Competition': '#000000', # Black
    'Competitor': '#000000',  # Black
    'Weather': '#8B4513',     # Brown
    'Seasonality': '#9370DB', # Medium purple
    'Distribution': '#2E8B57',# Sea green
    'Other': '#808080'        # Gray
}

def get_group_color(group_name):
    """
    Get color for a group, using predefined colors where available.
    
    Parameters:
    -----------
    group_name : str
        Name of the group
        
    Returns:
    --------
    str
        Hex color code
    """
    # Check if we have a predefined color
    for key, color in GROUP_COLORS.items():
        if key.lower() == group_name.lower():
            return color
            
    # If not, return a color based on the built-in colormap
    colors = list(mcolors.TABLEAU_COLORS.values())
    # Hash the group name to get a consistent color
    hash_val = hash(group_name) % len(colors)
    return colors[hash_val]

def display_decomposition_chart(model, decomp_df):
    """
    Display an interactive decomposition chart.
    
    Parameters:
    -----------
    model : LinearModel
        The model used for decomposition
    decomp_df : pandas.DataFrame
        DataFrame with decomposed contributions
        
    Returns:
    --------
    None
    """
    # Create copy to avoid modifying original
    df = decomp_df.copy()
    
    # Refresh group assignments from file before displaying
    from src.decomposition import get_variable_groups
    latest_groups = get_variable_groups(model)
    
    # Update any missing group columns based on latest group settings
    # This ensures any new group assignments are reflected in the chart
    expected_groups = set(group_info['Group'] for group_info in latest_groups.values())
    for group in expected_groups:
        if group not in df.columns and group not in ['Actual', 'Predicted']:
            # Add missing group with zeros
            df[group] = 0.0
    
    # Get contribution columns (excluding Actual and Predicted)
    contribution_cols = [col for col in df.columns if col not in ['Actual', 'Predicted']]
    
    # Sort contribution columns to ensure Base is at the bottom
    if 'Base' in contribution_cols:
        contribution_cols.remove('Base')
        contribution_cols = ['Base'] + contribution_cols
    
    # Check if we can use Plotly for interactive charts
    if PLOTLY_AVAILABLE:
        display_plotly_decomp_chart(model, df, contribution_cols)
    else:
        # Fall back to matplotlib static chart
        display_static_decomp_chart(model, df, contribution_cols)
    
    # Create data copy button
    copy_button = widgets.Button(
        description='Copy Data',
        button_style='info',
        tooltip='Copy data to clipboard',
        icon='copy'
    )
    
    output = widgets.Output()
    
    def on_copy_button_clicked(b):
        with output:
            clear_output()
            js_code = copy_data_to_clipboard(df)
            display(HTML(js_code))
    
    copy_button.on_click(on_copy_button_clicked)
    
    # Display the copy button and output area
    display(copy_button)
    display(output)

def display_plotly_decomp_chart(model, df, contribution_cols):
    """
    Display an interactive decomposition chart using Plotly.
    
    Parameters:
    -----------
    model : LinearModel
        The model used for decomposition
    df : pandas.DataFrame
        DataFrame with decomposed contributions
    contribution_cols : list
        List of contribution column names
        
    Returns:
    --------
    None
    """
    # Split positive and negative contributions for each group
    pos_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    neg_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    
    for col in contribution_cols:
        pos_contributions[col] = df[col].where(df[col] > 0, 0)
        neg_contributions[col] = df[col].where(df[col] < 0, 0)
    
    # Create figure
    fig = go.Figure()
    
    # Format x-axis values based on index type
    if isinstance(df.index, pd.DatetimeIndex):
        x_values = df.index
        x_format = '%Y-%m-%d'
        hover_format = '%Y-%m-%d'
    else:
        x_values = [f"Week {i+1}" for i in range(len(df))]
        x_format = None
        hover_format = None
    
    # Keep track of groups that have been added to the legend
    legend_entries = {}  # Dictionary to track legend entries by group name
    
    # Add positive contributions (bottom to top)
    bottom_pos = np.zeros(len(df))
    
    for col in contribution_cols:
        values = pos_contributions[col].values
        color = get_group_color(col)
        
        # Create hover text
        if isinstance(df.index, pd.DatetimeIndex):
            hover_texts = [
                f"Date: {date.strftime(hover_format)}<br>" +
                f"{col}: {value:,.2f}"
                for date, value in zip(df.index, values)
            ]
        else:
            hover_texts = [
                f"Period: {i+1}<br>" +
                f"{col}: {value:,.2f}"
                for i, value in enumerate(values)
            ]
        
        # Determine if this group should show in legend
        if col in legend_entries:
            # Group already has a legend entry
            show_in_legend = False
            legendgroup = legend_entries[col]  # Use the same legend group
        else:
            # New group, create legend entry only if it has non-zero values
            # Convert numpy.bool_ to Python bool to avoid Plotly error
            show_in_legend = bool(np.sum(values) > 0)
            if show_in_legend:
                legend_entries[col] = col  # Use column name as legend group
                legendgroup = col
            else:
                legendgroup = col
                
        # Add bar chart for this group's positive values
        fig.add_trace(go.Bar(
            x=x_values,
            y=values,
            base=bottom_pos,
            name=col,
            marker_color=color,
            hoverinfo='text',
            hovertext=hover_texts,
            legendgroup=legendgroup,
            showlegend=show_in_legend
        ))
        
        # Update the bottom position for the next group
        bottom_pos += values
    
    # Add negative contributions (top to bottom)
    bottom_neg = np.zeros(len(df))
    
    for col in reversed(contribution_cols):
        values = neg_contributions[col].values
        if np.any(values != 0):  # Only if there are non-zero negative values
            color = get_group_color(col)
            
            # Create hover text
            if isinstance(df.index, pd.DatetimeIndex):
                hover_texts = [
                    f"Date: {date.strftime(hover_format)}<br>" +
                    f"{col}: {value:,.2f}"
                    for date, value in zip(df.index, values)
                ]
            else:
                hover_texts = [
                    f"Period: {i+1}<br>" +
                    f"{col}: {value:,.2f}"
                    for i, value in enumerate(values)
                ]
            
            # Determine if this group should show in legend
            if col in legend_entries:
                # Group already has a legend entry
                show_in_legend = False
                legendgroup = legend_entries[col]
            else:
                # New group, create legend entry if it has non-zero values
                # Convert numpy.bool_ to Python bool
                show_in_legend = bool(True)
                legend_entries[col] = col
                legendgroup = col
            
            # Add bar chart for this group's negative values
            fig.add_trace(go.Bar(
                x=x_values,
                y=values,
                base=bottom_neg,
                name=col,
                marker_color=color,
                hoverinfo='text',
                hovertext=hover_texts,
                legendgroup=legendgroup,
                showlegend=show_in_legend
            ))
            
            # Update the bottom position for the next group
            bottom_neg += values
    
    # Add Actual line with dots
    if isinstance(df.index, pd.DatetimeIndex):
        hover_texts = [
            f"Date: {date.strftime(hover_format)}<br>" +
            f"Actual: {value:,.2f}"
            for date, value in zip(df.index, df['Actual'])
        ]
    else:
        hover_texts = [
            f"Period: {i+1}<br>" +
            f"Actual: {value:,.2f}"
            for i, value in enumerate(df['Actual'])
        ]
        
    fig.add_trace(go.Scatter(
        x=x_values,
        y=df['Actual'],
        mode='lines+markers',  # Add markers (dots)
        name='Actual',
        line=dict(color='black', width=2),
        marker=dict(size=6, color='black'),
        hoverinfo='text',
        hovertext=hover_texts
    ))
    
    # Add Predicted line with dots
    if isinstance(df.index, pd.DatetimeIndex):
        hover_texts = [
            f"Date: {date.strftime(hover_format)}<br>" +
            f"Predicted: {value:,.2f}"
            for date, value in zip(df.index, df['Predicted'])
        ]
    else:
        hover_texts = [
            f"Period: {i+1}<br>" +
            f"Predicted: {value:,.2f}"
            for i, value in enumerate(df['Predicted'])
        ]
        
    fig.add_trace(go.Scatter(
        x=x_values,
        y=df['Predicted'],
        mode='lines+markers',  # Add markers (dots)
        name='Predicted',
        line=dict(color='red', width=2),
        marker=dict(size=6, color='red'),
        hoverinfo='text',
        hovertext=hover_texts
    ))
    
    # Update layout
    fig.update_layout(
        title={
            'text': 'Decomposition Chart',
            'x': 0.5,  # Center the title
            'xanchor': 'center'
        },
        yaxis_title=model.kpi,
        barmode='relative',
        hovermode='closest',
        width=1000,
        height=600,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=-0.3,  # Move legend further down
            xanchor="center",
            x=0.5
        ),
        margin=dict(b=160),  # More bottom margin for legend
        plot_bgcolor='white',  # White background
        paper_bgcolor='white'  # White paper background
    )
    
    # Configure xaxis dates if applicable
    if isinstance(df.index, pd.DatetimeIndex):
        tickvals = []
        ticktext = []
        
        # If many dates, pick monthly ticks
        if len(df) > 30:
            # Generate unique months
            month_ends = pd.Series(df.index).dt.to_period('M').unique()
            for month in month_ends:
                # Find dates in this month
                month_dates = [d for d in df.index if (d.year == month.year and d.month == month.month)]
                if month_dates:
                    tickvals.append(month_dates[0])
                    ticktext.append(month_dates[0].strftime('%b %Y'))
        else:
            # For fewer dates, show them all
            tickvals = df.index
            ticktext = [d.strftime('%Y-%m-%d') for d in df.index]
        
        fig.update_xaxes(
            tickvals=tickvals,
            ticktext=ticktext,
            tickangle=45,
        )
    else:
        # For non-date index
        if len(df) > 30:
            # Pick a subset of ticks
            step = max(len(df) // 12, 1)
            tickvals = list(range(0, len(df), step))
            ticktext = [f"Week {i+1}" for i in tickvals]
            
            fig.update_xaxes(
                tickvals=tickvals,
                ticktext=ticktext,
                tickangle=45,
            )
    
    # Add grid lines
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='lightgray')
    
    # Show the plot
    fig.show()

def display_static_decomp_chart(model, df, contribution_cols):
    """
    Display a static decomposition chart using Matplotlib.
    
    Parameters:
    -----------
    model : LinearModel
        The model used for decomposition
    df : pandas.DataFrame
        DataFrame with decomposed contributions
    contribution_cols : list
        List of contribution column names
        
    Returns:
    --------
    None
    """
    # Split positive and negative contributions for each group
    pos_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    neg_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    
    for col in contribution_cols:
        pos_contributions[col] = df[col].where(df[col] > 0, 0)
        neg_contributions[col] = df[col].where(df[col] < 0, 0)
    
    # Create the figure
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Plot positive contributions
    bottom_pos = np.zeros(len(df))
    for col in contribution_cols:
        color = get_group_color(col)
        ax.bar(range(len(df)), pos_contributions[col], bottom=bottom_pos, 
              label=col if col not in neg_contributions.columns[neg_contributions.any()] else None,
              color=color)
        bottom_pos += pos_contributions[col].values
    
    # Plot negative contributions
    bottom_neg = np.zeros(len(df))
    for col in reversed(contribution_cols):  # Reverse to maintain consistent ordering
        if neg_contributions[col].any():  # Only if there are negative values
            color = get_group_color(col)
            ax.bar(range(len(df)), neg_contributions[col], bottom=bottom_neg,
                  label=None if col in pos_contributions.columns[pos_contributions.any()] else col,
                  color=color)
            bottom_neg += neg_contributions[col].values
    
    # Add lines for Actual and Predicted
    ax.plot(range(len(df)), df['Actual'], 'k-', linewidth=2, label='Actual')
    ax.plot(range(len(df)), df['Predicted'], 'r-', linewidth=2, label='Predicted')
    
    # Set chart title and labels
    ax.set_title('Decomposition Chart', fontsize=16)
    ax.set_ylabel(model.kpi, fontsize=12)
    ax.set_xlabel('', fontsize=12)
    
    # Set x-axis ticks using actual observation dates if available
    if isinstance(df.index, pd.DatetimeIndex):  # Check if index is datetime
        # Format dates based on number of observations
        if len(df) > 50:
            date_format = '%Y-%m'  # Monthly format for many observations
        else:
            date_format = '%Y-%m-%d'  # Full date for fewer observations
        
        # Create labels from dates
        x_labels = [date.strftime(date_format) for date in df.index]
        
        # Show subset of labels if there are many
        x_ticks = range(len(df))
        if len(df) > 30:
            # Show monthly or quarterly labels
            step = max(len(df) // 12, 1)  # Show ~12 labels
            x_ticks = range(0, len(df), step)
            x_labels = [x_labels[i] for i in x_ticks]
    else:
        # Use week labels as before if no date index
        x_labels = [f'w{i+1}' for i in range(len(df))]
        x_ticks = range(len(df))
        if len(df) > 30:
            step = max(len(df) // 12, 1)
            x_ticks = range(0, len(df), step)
            x_labels = [x_labels[i] for i in x_ticks]
    
    ax.set_xticks(x_ticks)
    ax.set_xticklabels(x_labels, rotation=45)
    
    # Add grid lines for y-axis
    ax.grid(axis='y', linestyle='-', alpha=0.2)
    
    # Add legend
    ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.13),
             fancybox=True, shadow=True, ncol=min(6, len(contribution_cols) + 2))
    
    # Adjust layout to make room for legend
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.18)
    
    # Display the chart
    plt.show()

def copy_data_to_clipboard(data):
    """
    Copy data to clipboard in a format that can be pasted into Excel.
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data
    
    Returns:
    --------
    str
        HTML message indicating data has been copied
    """
    # Try to use pyperclip if available (needs to be installed)
    try:
        import pyperclip
        
        # Reset index to include it as a column
        df_to_copy = data.reset_index()
        
        # Convert to clipboard format (tab separated values)
        clipboard_data = df_to_copy.to_csv(sep='\t', index=False)
        
        # Copy to clipboard using pyperclip
        pyperclip.copy(clipboard_data)
        
        return """
        <div style="padding: 10px; background-color: #dff0d8; color: #3c763d; border: 1px solid #d6e9c6; border-radius: 4px;">
        Data copied to clipboard! You can now paste it into Excel.
        </div>
        """
    except (ImportError, Exception) as e:
        # Fall back to JavaScript method if pyperclip is not available
        print(f"Warning: Falling back to JavaScript clipboard method. For better results, install pyperclip: pip install pyperclip")
        
        # Reset index to include it as a column
        df_to_copy = data.reset_index()
        
        # Convert to TSV format
        tsv_data = df_to_copy.to_csv(sep='\t', index=False)
        
        # Create a download link instead
        import base64
        b64 = base64.b64encode(tsv_data.encode()).decode()
        
        download_link = f"""
        <div style="padding: 10px; background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0;">
            <p>JavaScript clipboard access failed. Please use this download link instead:</p>
            <a href="data:text/tab-separated-values;base64,{b64}" download="decomposition_data.tsv" 
               style="display: inline-block; padding: 6px 12px; background: #007bff; color: white; 
                      text-decoration: none; border-radius: 4px;">
                Download Data
            </a>
            <p style="margin-top: 10px; font-size: 0.9em;">After downloading, you can open the file in Excel.</p>
        </div>
        """
        return download_link
    
    
    
    
    
"""
Chart functions for group decomposition visualization with interactive features.
"""

def display_group_decomposition_chart(model, decomp_df, group_name):
    """
    Display an interactive decomposition chart for a specific group's variables.
    
    Parameters:
    -----------
    model : LinearModel
        The model used for decomposition
    decomp_df : pandas.DataFrame
        DataFrame with decomposed contributions for variables in the group
    group_name : str
        Name of the group being decomposed
        
    Returns:
    --------
    None
    """
    # Create copy to avoid modifying original
    df = decomp_df.copy()
    
    # Get contribution columns (excluding Actual and Total)
    contribution_cols = [col for col in df.columns if col not in ['Actual', 'Total']]
    
    # Check if we can use Plotly for interactive charts
    if PLOTLY_AVAILABLE:
        display_plotly_group_decomp_chart(model, df, contribution_cols, group_name)
    else:
        # Fall back to matplotlib static chart
        display_static_group_decomp_chart(model, df, contribution_cols, group_name)
    
    # Create data copy button
    copy_button = widgets.Button(
        description='Copy Data',
        button_style='info',
        tooltip='Copy data to clipboard',
        icon='copy'
    )
    
    output = widgets.Output()
    
    def on_copy_button_clicked(b):
        with output:
            clear_output()
            js_code = copy_data_to_clipboard(df)
            display(HTML(js_code))
    
    copy_button.on_click(on_copy_button_clicked)
    
    # Display the copy button and output area
    display(copy_button)
    display(output)
def display_plotly_group_decomp_chart(model, df, contribution_cols, group_name):
    """
    Display an interactive decomposition chart for a specific group using Plotly.
    
    Parameters:
    -----------
    model : LinearModel
        The model used for decomposition
    df : pandas.DataFrame
        DataFrame with decomposed contributions
    contribution_cols : list
        List of contribution column names (individual variables)
    group_name : str
        Name of the group being decomposed
        
    Returns:
    --------
    None
    """
    # Split positive and negative contributions for each variable
    pos_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    neg_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    
    for col in contribution_cols:
        pos_contributions[col] = df[col].where(df[col] > 0, 0)
        neg_contributions[col] = df[col].where(df[col] < 0, 0)
    
    # Create figure
    fig = go.Figure()
    
    # Format x-axis values based on index type
    if isinstance(df.index, pd.DatetimeIndex):
        x_values = df.index
        x_format = '%Y-%m-%d'
        hover_format = '%Y-%m-%d'
    else:
        x_values = [f"Week {i+1}" for i in range(len(df))]
        x_format = None
        hover_format = None
    
    # Keep track of variables that have been added to the legend
    legend_entries = {}  # Dictionary to track legend entries by variable name
    
    # Add positive contributions (bottom to top)
    bottom_pos = np.zeros(len(df))
    
    for col in contribution_cols:
        values = pos_contributions[col].values
        # Use a consistent color scheme but ensure each variable has a unique color
        color = get_variable_color(col, contribution_cols)
        
        # Create hover text
        if isinstance(df.index, pd.DatetimeIndex):
            hover_texts = [
                f"Date: {date.strftime(hover_format)}<br>" +
                f"{col}: {value:,.2f}"
                for date, value in zip(df.index, values)
            ]
        else:
            hover_texts = [
                f"Period: {i+1}<br>" +
                f"{col}: {value:,.2f}"
                for i, value in enumerate(values)
            ]
        
        # Determine if this variable should show in legend
        if col in legend_entries:
            # Variable already has a legend entry
            show_in_legend = False
            legendgroup = legend_entries[col]  # Use the same legend group
        else:
            # New variable, create legend entry only if it has non-zero values
            # Convert numpy.bool_ to Python bool
            show_in_legend = bool(np.sum(values) > 0)
            if show_in_legend:
                legend_entries[col] = col  # Use column name as legend group
                legendgroup = col
            else:
                legendgroup = col
                
        # Add bar chart for this variable's positive values
        fig.add_trace(go.Bar(
            x=x_values,
            y=values,
            base=bottom_pos,
            name=col,
            marker_color=color,
            hoverinfo='text',
            hovertext=hover_texts,
            legendgroup=legendgroup,
            showlegend=show_in_legend
        ))
        
        # Update the bottom position for the next variable
        bottom_pos += values
    
    # Add negative contributions (top to bottom)
    bottom_neg = np.zeros(len(df))
    
    for col in reversed(contribution_cols):
        values = neg_contributions[col].values
        if np.any(values != 0):  # Only if there are non-zero negative values
            color = get_variable_color(col, contribution_cols)
            
            # Create hover text
            if isinstance(df.index, pd.DatetimeIndex):
                hover_texts = [
                    f"Date: {date.strftime(hover_format)}<br>" +
                    f"{col}: {value:,.2f}"
                    for date, value in zip(df.index, values)
                ]
            else:
                hover_texts = [
                    f"Period: {i+1}<br>" +
                    f"{col}: {value:,.2f}"
                    for i, value in enumerate(values)
                ]
            
            # Determine if this variable should show in legend
            if col in legend_entries:
                # Variable already has a legend entry
                show_in_legend = False
                legendgroup = legend_entries[col]
            else:
                # New variable, create legend entry
                # Convert numpy.bool_ to Python bool
                show_in_legend = bool(True)
                legend_entries[col] = col
                legendgroup = col
            
            # Add bar chart for this variable's negative values
            fig.add_trace(go.Bar(
                x=x_values,
                y=values,
                base=bottom_neg,
                name=col,
                marker_color=color,
                hoverinfo='text',
                hovertext=hover_texts,
                legendgroup=legendgroup,
                showlegend=show_in_legend
            ))
            
            # Update the bottom position for the next variable
            bottom_neg += values
    
    # Add Total line (group total) with markers
    if isinstance(df.index, pd.DatetimeIndex):
        hover_texts = [
            f"Date: {date.strftime(hover_format)}<br>" +
            f"Total {group_name}: {value:,.2f}"
            for date, value in zip(df.index, df['Total'])
        ]
    else:
        hover_texts = [
            f"Period: {i+1}<br>" +
            f"Total {group_name}: {value:,.2f}"
            for i, value in enumerate(df['Total'])
        ]
        
    fig.add_trace(go.Scatter(
        x=x_values,
        y=df['Total'],
        mode='lines+markers',  # Add markers (dots)
        name=f'Total {group_name}',
        line=dict(color='black', width=2),
        marker=dict(size=6, color='black'),
        hoverinfo='text',
        hovertext=hover_texts
    ))
    
    # We no longer add the Actual line in the decomp_groups chart as requested
    
    # Update layout
    fig.update_layout(
        title={
            'text': f'{group_name} Group Decomposition',
            'x': 0.5,  # Center the title
            'xanchor': 'center'
        },
        yaxis_title=model.kpi,
        barmode='relative',
        hovermode='closest',
        width=1000,
        height=600,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=-0.3,  # Move legend further down
            xanchor="center",
            x=0.5
        ),
        margin=dict(b=160),  # More bottom margin for legend
        plot_bgcolor='white',  # White background
        paper_bgcolor='white'  # White paper background
    )
    
    # Configure xaxis dates if applicable
    if isinstance(df.index, pd.DatetimeIndex):
        tickvals = []
        ticktext = []
        
        # If many dates, pick monthly ticks
        if len(df) > 30:
            # Generate unique months
            month_ends = pd.Series(df.index).dt.to_period('M').unique()
            for month in month_ends:
                # Find dates in this month
                month_dates = [d for d in df.index if (d.year == month.year and d.month == month.month)]
                if month_dates:
                    tickvals.append(month_dates[0])
                    ticktext.append(month_dates[0].strftime('%b %Y'))
        else:
            # For fewer dates, show them all
            tickvals = df.index
            ticktext = [d.strftime('%Y-%m-%d') for d in df.index]
        
        fig.update_xaxes(
            tickvals=tickvals,
            ticktext=ticktext,
            tickangle=45,
        )
    else:
        # For non-date index
        if len(df) > 30:
            # Pick a subset of ticks
            step = max(len(df) // 12, 1)
            tickvals = list(range(0, len(df), step))
            ticktext = [f"Week {i+1}" for i in tickvals]
            
            fig.update_xaxes(
                tickvals=tickvals,
                ticktext=ticktext,
                tickangle=45,
            )
    
    # Add grid lines
    fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='lightgray')
    
    # Show the plot
    fig.show()

def display_static_group_decomp_chart(model, df, contribution_cols, group_name):
    """
    Display a static decomposition chart for a specific group using Matplotlib.
    
    Parameters:
    -----------
    model : LinearModel
        The model used for decomposition
    df : pandas.DataFrame
        DataFrame with decomposed contributions
    contribution_cols : list
        List of contribution column names (individual variables)
    group_name : str
        Name of the group being decomposed
        
    Returns:
    --------
    None
    """
    # Split positive and negative contributions for each variable
    pos_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    neg_contributions = pd.DataFrame(0, index=df.index, columns=contribution_cols)
    
    for col in contribution_cols:
        pos_contributions[col] = df[col].where(df[col] > 0, 0)
        neg_contributions[col] = df[col].where(df[col] < 0, 0)
    
    # Create the figure
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Plot positive contributions
    bottom_pos = np.zeros(len(df))
    for col in contribution_cols:
        color = get_variable_color(col, contribution_cols)
        ax.bar(range(len(df)), pos_contributions[col], bottom=bottom_pos, 
              label=col if col not in neg_contributions.columns[neg_contributions.any()] else None,
              color=color)
        bottom_pos += pos_contributions[col].values
    
    # Plot negative contributions
    bottom_neg = np.zeros(len(df))
    for col in reversed(contribution_cols):  # Reverse to maintain consistent ordering
        if neg_contributions[col].any():  # Only if there are negative values
            color = get_variable_color(col, contribution_cols)
            ax.bar(range(len(df)), neg_contributions[col], bottom=bottom_neg,
                  label=None if col in pos_contributions.columns[pos_contributions.any()] else col,
                  color=color)
            bottom_neg += neg_contributions[col].values
    
    # Add lines for Total and Actual
    ax.plot(range(len(df)), df['Total'], 'k-', linewidth=2, label=f'Total {group_name}')
    ax.plot(range(len(df)), df['Actual'], 'r--', linewidth=2, label='Actual')
    
    # Set chart title and labels
    ax.set_title(f'{group_name} Group Decomposition', fontsize=16)
    ax.set_ylabel(model.kpi, fontsize=12)
    ax.set_xlabel('', fontsize=12)
    
    # Set x-axis ticks using actual observation dates if available
    if isinstance(df.index, pd.DatetimeIndex):  # Check if index is datetime
        # Format dates based on number of observations
        if len(df) > 50:
            date_format = '%Y-%m'  # Monthly format for many observations
        else:
            date_format = '%Y-%m-%d'  # Full date for fewer observations
        
        # Create labels from dates
        x_labels = [date.strftime(date_format) for date in df.index]
        
        # Show subset of labels if there are many
        x_ticks = range(len(df))
        if len(df) > 30:
            # Show monthly or quarterly labels
            step = max(len(df) // 12, 1)  # Show ~12 labels
            x_ticks = range(0, len(df), step)
            x_labels = [x_labels[i] for i in x_ticks]
    else:
        # Use week labels as before if no date index
        x_labels = [f'w{i+1}' for i in range(len(df))]
        x_ticks = range(len(df))
        if len(df) > 30:
            step = max(len(df) // 12, 1)
            x_ticks = range(0, len(df), step)
            x_labels = [x_labels[i] for i in x_ticks]
    
    ax.set_xticks(x_ticks)
    ax.set_xticklabels(x_labels, rotation=45)
    
    # Add grid lines for y-axis
    ax.grid(axis='y', linestyle='-', alpha=0.2)
    
    # Add legend
    ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.13),
             fancybox=True, shadow=True, ncol=min(6, len(contribution_cols) + 2))
    
    # Adjust layout to make room for legend
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.18)
    
    # Display the chart
    plt.show()

def get_variable_color(variable_name, all_variables):
    """
    Get a consistent color for a variable.
    
    Parameters:
    -----------
    variable_name : str
        Name of the variable
    all_variables : list
        List of all variable names
        
    Returns:
    --------
    str
        Hex color code
    """
    # Standard color palette with enough distinct colors
    colors = [
        '#1f77b4',  # blue
        '#ff7f0e',  # orange
        '#2ca02c',  # green
        '#d62728',  # red
        '#9467bd',  # purple
        '#8c564b',  # brown
        '#e377c2',  # pink
        '#7f7f7f',  # gray
        '#bcbd22',  # olive
        '#17becf',  # teal
        '#aec7e8',  # light blue
        '#ffbb78',  # light orange
        '#98df8a',  # light green
        '#ff9896',  # light red
        '#c5b0d5',  # light purple
        '#c49c94',  # light brown
        '#f7b6d2',  # light pink
        '#c7c7c7',  # light gray
        '#dbdb8d',  # light olive
        '#9edae5'   # light teal
    ]
    
    # Get stable index for the variable
    if variable_name in all_variables:
        idx = all_variables.index(variable_name)
    else:
        # Hash the variable name for a stable color if not in the list
        idx = hash(variable_name) % len(colors)
    
    return colors[idx % len(colors)]