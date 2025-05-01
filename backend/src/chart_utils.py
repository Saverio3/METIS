"""
Enhanced charting utilities for the econometric tool with interactive features.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import MaxNLocator
import ipywidgets as widgets
from IPython.display import display, HTML, clear_output
import io
import base64
import copy
import matplotlib.ticker as mticker

# Check if plotly is available for interactive charts
try:
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

def create_chart(data, variables, title=None, dual_scale=False, show_dependent=False, 
                show_residuals=False, figsize=(12, 6), kpi=None, model=None):
    """
    Create a chart with the given variables.
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data to plot
    variables : list
        List of variable names to plot
    title : str, optional
        Title for the chart
    dual_scale : bool, optional
        Whether to use dual y-axes
    show_dependent : bool, optional
        Whether to show the dependent variable
    show_residuals : bool, optional
        Whether to show the model residuals
    figsize : tuple, optional
        Figure size (width, height)
    kpi : str, optional
        Name of the dependent variable
    model : LinearModel, optional
        Model to get residuals from
    
    Returns:
    --------
    matplotlib.figure.Figure
        The created figure
    """
    if not variables:
        print("No variables specified for charting.")
        return None
    
    # Create a copy of the variables list
    plot_vars = copy.deepcopy(variables)
    
    # Add dependent variable if requested
    if show_dependent and kpi and kpi not in plot_vars:
        plot_vars.append(kpi)
    
    # Check if all variables exist in the data
    missing_vars = [var for var in plot_vars if var not in data.columns]
    if missing_vars:
        print(f"Warning: The following variables are not in the data: {', '.join(missing_vars)}")
        plot_vars = [var for var in plot_vars if var in data.columns]
        
        if not plot_vars:
            print("No valid variables to plot.")
            return None
    
    # Check if we should use interactive Plotly chart
    if PLOTLY_AVAILABLE:
        return create_interactive_plotly_chart(data, plot_vars, title, dual_scale, 
                                              show_dependent, show_residuals, kpi, model)
    else:
        # Fall back to static matplotlib chart
        return create_static_chart(data, plot_vars, title, dual_scale, 
                                  show_dependent, show_residuals, figsize, kpi, model)

def create_static_chart(data, plot_vars, title=None, dual_scale=False, 
                      show_dependent=False, show_residuals=False, 
                      figsize=(12, 6), kpi=None, model=None):
    """
    Create a static chart using matplotlib.
    """
    # Create figure and primary axis
    fig, ax1 = plt.subplots(figsize=figsize)
    
    # Format the date axis
    ax1.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    ax1.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
    plt.xticks(rotation=45)
    
    # Set title if provided
    if title:
        plt.title(title)
    
    # Colors for lines
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
              '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
    
    # Track the min and max values for each axis
    y1_min, y1_max = float('inf'), float('-inf')
    y2_min, y2_max = float('inf'), float('-inf')
    
    # Track if there's residuals to plot
    has_residuals = False
    
    # Store all plotted lines for tooltip
    all_lines = []
    all_labels = []
    
    # If using dual scale with residuals, use ax2 for residuals
    use_dual_for_residuals = dual_scale and show_residuals
    standard_dual = dual_scale and not use_dual_for_residuals
    
    # If using dual scale, create second axis
    ax2 = ax1.twinx() if dual_scale else None
    
    # Plot each variable
    for i, var in enumerate(plot_vars):
        # If using standard dual scale, use ax2 for the second half of the variables
        if standard_dual:
            ax = ax2 if i >= len(plot_vars) // 2 else ax1
        else:
            ax = ax1  # In residuals mode, all primary variables go on ax1
            
        color = colors[i % len(colors)]
        
        # Plot the data
        line, = ax.plot(data.index, data[var], marker='o', linestyle='-', 
                       markersize=4, label=var, color=color)
        
        # Add to lines for tooltip
        all_lines.append(line)
        all_labels.append(var)
        
        # Update min/max for appropriate axis
        if ax == ax1:
            y1_min = min(y1_min, data[var].min())
            y1_max = max(y1_max, data[var].max())
        else:
            y2_min = min(y2_min, data[var].min())
            y2_max = max(y2_max, data[var].max())
    
    # Add residuals if requested
    if show_residuals and model is not None and model.results is not None:
        residuals = model.results.resid
        if not residuals.empty:
            # Get the overlap between residuals index and data index
            common_idx = data.index.intersection(residuals.index)
            if len(common_idx) > 0:
                has_residuals = True
                res_data = pd.Series(residuals).loc[common_idx]
                
                # Determine which axis to use for residuals
                if use_dual_for_residuals:
                    ax_res = ax2  # Use dual axis for residuals
                else:
                    ax_res = ax1  # Use same axis
                
                res_line, = ax_res.plot(common_idx, res_data, marker='o', linestyle='-', 
                           markersize=4, label='Residuals', color='black', alpha=0.7)
                
                # Add to lines for tooltip
                all_lines.append(res_line)
                all_labels.append('Residuals')
                
                # Update min/max for appropriate axis
                if ax_res == ax1:
                    y1_min = min(y1_min, res_data.min())
                    y1_max = max(y1_max, res_data.max())
                else:
                    y2_min = min(y2_min, res_data.min())
                    y2_max = max(y2_max, res_data.max())
    
    # Set y-axis limits with some padding
    def set_axis_limits(ax, ymin, ymax):
        if np.isfinite(ymin) and np.isfinite(ymax):
            padding = (ymax - ymin) * 0.1
            ax.set_ylim(ymin - padding, ymax + padding)
    
    set_axis_limits(ax1, y1_min, y1_max)
    if ax2 is not None:
        set_axis_limits(ax2, y2_min, y2_max)
    
    # Add legends
    handles1, labels1 = ax1.get_legend_handles_labels()
    if ax2 is not None:
        handles2, labels2 = ax2.get_legend_handles_labels()
        handles = handles1 + handles2
        labels = labels1 + labels2
        fig.legend(handles, labels, loc='upper center', bbox_to_anchor=(0.5, 0.05), 
                  ncol=min(5, len(handles)), frameon=True)
    else:
        ax1.legend(loc='best')
    
    # Add grid for better readability
    ax1.grid(True, alpha=0.3)
    
    # Set up tooltips for interactive display
    tooltip = ax1.annotate("", xy=(0,0), xytext=(20,20), textcoords="offset points",
                           bbox=dict(boxstyle="round", fc="white", ec="b", alpha=0.8),
                           arrowprops=dict(arrowstyle="->"))
    tooltip.set_visible(False)
    
    # Function to update the tooltip
    def update_tooltip(event):
        if event.inaxes:
            cont, ind = sc.contains(event)
            if cont:
                x, y = event.xdata, event.ydata
                tooltip.xy = (x, y)
                
                # Find closest data point
                idx = np.argmin(np.abs(mdates.date2num(data.index) - x))
                date = data.index[idx].strftime('%Y-%m-%d')
                
                # Create tooltip text with values for each line
                text = f"Date: {date}\n"
                for line, label in zip(all_lines, all_labels):
                    # Get y value at this date
                    y_val = line.get_ydata()[idx] if idx < len(line.get_ydata()) else "N/A"
                    text += f"{label}: {y_val:.2f}\n"
                
                tooltip.set_text(text)
                tooltip.set_visible(True)
                fig.canvas.draw_idle()
            else:
                tooltip.set_visible(False)
                fig.canvas.draw_idle()
    
    # Connect the tooltip update function to mouse movement
    fig.canvas.mpl_connect("motion_notify_event", update_tooltip)
    
    # Set up the scatter plot for tooltip interactivity (invisible but used for mouse detection)
    sc = ax1.scatter(data.index, [0] * len(data.index), alpha=0)
    
    # Adjust layout to make room for the legend
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.2)
    
    return fig

def create_interactive_plotly_chart(data, plot_vars, title=None, dual_scale=False, 
                                   show_dependent=False, show_residuals=False,
                                   kpi=None, model=None):
    """
    Create an interactive chart using Plotly.
    """
    # Determine if we need two y-axes
    use_secondary_y = dual_scale
    
    # Create figure
    fig = go.Figure()
    
    # Split variables for dual axes if needed
    primary_vars = plot_vars
    secondary_vars = []
    
    if dual_scale and not show_residuals:
        # Split variables evenly between the two axes
        mid_point = len(plot_vars) // 2
        primary_vars = plot_vars[:mid_point]
        secondary_vars = plot_vars[mid_point:]
    
    # Add traces for primary axis variables
    for i, var in enumerate(primary_vars):
        # Create hover text with date and value
        hover_text = [f"Date: {date.strftime('%Y-%m-%d')}<br>{var}: {value:.2f}" 
                     for date, value in zip(data.index, data[var])]
        
        fig.add_trace(go.Scatter(
            x=data.index,
            y=data[var],
            mode='lines+markers',
            name=var,
            hoverinfo='text',
            hovertext=hover_text,
            marker=dict(size=6),
            line=dict(width=2)
        ))
    
    # Add traces for secondary axis variables
    for i, var in enumerate(secondary_vars):
        # Create hover text with date and value
        hover_text = [f"Date: {date.strftime('%Y-%m-%d')}<br>{var}: {value:.2f}" 
                     for date, value in zip(data.index, data[var])]
        
        fig.add_trace(go.Scatter(
            x=data.index,
            y=data[var],
            mode='lines+markers',
            name=var,
            hoverinfo='text',
            hovertext=hover_text,
            marker=dict(size=6),
            line=dict(width=2),
            yaxis="y2"
        ))
    
    # Add residuals if requested
    if show_residuals and model is not None and model.results is not None:
        residuals = model.results.resid
        if not residuals.empty:
            # Get the overlap between residuals index and data index
            common_idx = data.index.intersection(residuals.index)
            if len(common_idx) > 0:
                res_data = pd.Series(residuals).loc[common_idx]
                
                # Create hover text for residuals
                hover_text = [f"Date: {date.strftime('%Y-%m-%d')}<br>Residual: {value:.2f}" 
                             for date, value in zip(common_idx, res_data)]
                
                fig.add_trace(go.Scatter(
                    x=common_idx,
                    y=res_data,
                    mode='lines+markers',
                    name='Residuals',
                    hoverinfo='text',
                    hovertext=hover_text,
                    marker=dict(size=6, color='black'),
                    line=dict(width=2, color='black'),
                    opacity=0.7,
                    yaxis="y2" if use_secondary_y and dual_scale and show_residuals else "y"
                ))
    
    # Set chart layout
    layout = dict(
        title=dict(
            text=title if title else "Variable Comparison",
            x=0.5,  # Center title
            xanchor='center'
        ),
        xaxis=dict(
            title="Date",
            tickangle=45,
            type='date',
            tickformat='%b %Y',
            showgrid=True,
            gridcolor='lightgray'
        ),
        yaxis=dict(
            title=kpi if show_dependent and kpi else "Value",
            showgrid=True,
            gridcolor='lightgray'
        ),
        hovermode='closest',
        plot_bgcolor='white',
        paper_bgcolor='white',
        width=1000,
        height=600,
        margin=dict(t=80, b=100, l=80, r=80)
    )
    
    # Add secondary y-axis if needed
    if use_secondary_y:
        layout['yaxis2'] = dict(
            title="Secondary Axis", 
            overlaying='y',
            side='right',
            showgrid=False
        )
    
    # Add legend
    layout['legend'] = dict(
        orientation="h",
        yanchor="bottom",
        y=-0.2,
        xanchor="center",
        x=0.5
    )
    
    # Update layout
    fig.update_layout(layout)
    
    return fig

def chart_to_base64(fig):
    """
    Convert a matplotlib figure to a base64 encoded string.
    
    Parameters:
    -----------
    fig : matplotlib.figure.Figure
        Figure to convert
    
    Returns:
    --------
    str
        Base64 encoded string of the figure
    """
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return img_str

def get_chart_html(fig):
    """
    Convert a matplotlib figure to an HTML img tag.
    
    Parameters:
    -----------
    fig : matplotlib.figure.Figure
        Figure to convert
    
    Returns:
    --------
    str
        HTML string with the image
    """
    img_str = chart_to_base64(fig)
    return f'<img src="data:image/png;base64,{img_str}" />'

def copy_data_to_clipboard(data, variables):
    """
    Copy data to clipboard in a format that can be pasted into Excel.
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data
    variables : list
        List of variable names to copy
    
    Returns:
    --------
    str
        Data in clipboard format
    """
    valid_vars = [var for var in variables if var in data.columns]
    if not valid_vars:
        return "No valid variables to copy."
    
    # Create a DataFrame with the date as the first column
    df_to_copy = pd.DataFrame(index=data.index)
    df_to_copy['Date'] = df_to_copy.index.strftime('%Y-%m-%d')
    
    # Add each variable
    for var in valid_vars:
        df_to_copy[var] = data[var]
    
    # Use pyperclip if available
    try:
        import pyperclip
        clipboard_data = df_to_copy.to_csv(sep='\t', index=False)
        pyperclip.copy(clipboard_data)
        
        return """
        <div style="padding: 10px; background-color: #dff0d8; color: #3c763d; border: 1px solid #d6e9c6; border-radius: 4px;">
        Data copied to clipboard! You can now paste it into Excel.
        </div>
        """
    except:
        # Use JavaScript to copy to clipboard
        js_code = f"""
        <script>
        const el = document.createElement('textarea');
        el.value = `{df_to_copy.to_csv(sep='\t', index=False)}`;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        </script>
        <div style="padding: 10px; background-color: #dff0d8; color: #3c763d; border: 1px solid #d6e9c6; border-radius: 4px;">
        Data copied to clipboard! You can now paste it into Excel.
        </div>
        """
        return js_code

def create_interactive_chart(data, variables, model=None):
    """
    Create an interactive chart with buttons to toggle features.
    
    Parameters:
    -----------
    data : pandas.DataFrame
        DataFrame containing the data
    variables : list
        List of variable names to plot
    model : LinearModel, optional
        Model to get KPI and residuals from
    
    Returns:
    --------
    None
    """
    # Check if plotly is available
    use_plotly = PLOTLY_AVAILABLE
    
    # Create widgets for buttons
    dual_scale_btn = widgets.ToggleButton(
        value=False,
        description='Dual Scale',
        button_style='',
        tooltip='Toggle dual y-axis scale',
        icon='exchange-alt'
    )
    
    copy_data_btn = widgets.Button(
        description='Copy Data',
        button_style='',
        tooltip='Copy data to clipboard',
        icon='copy'
    )
    
    add_depvar_btn = widgets.ToggleButton(
        value=False,
        description='Add KPI',
        button_style='',
        tooltip='Add dependent variable to chart',
        icon='chart-line',
        disabled=(model is None or model.kpi is None)
    )
    
    add_residuals_btn = widgets.ToggleButton(
        value=False,
        description='Add Residuals',
        button_style='',
        tooltip='Add model residuals to chart',
        icon='chart-bar',
        disabled=(model is None or model.results is None)
    )
    
    # Create output area for the chart
    chart_output = widgets.Output()
    message_output = widgets.Output()
    
    # Function to update the chart
    def update_chart():
        with chart_output:
            clear_output(wait=True)
            
            fig = create_chart(
                data, 
                variables, 
                dual_scale=dual_scale_btn.value, 
                show_dependent=add_depvar_btn.value, 
                show_residuals=add_residuals_btn.value,
                kpi=model.kpi if model else None,
                model=model
            )
            
            if use_plotly:
                # For Plotly figures, we use their display method
                fig.show()
            else:
                # For matplotlib figures, use plt.show()
                plt.show()
    
    # Handle button clicks
    def on_dual_scale_clicked(b):
        update_chart()
    
    def on_copy_data_clicked(b):
        with message_output:
            clear_output(wait=True)
            vars_to_copy = variables + ([model.kpi] if add_depvar_btn.value and model and model.kpi else [])
            js_code = copy_data_to_clipboard(data, vars_to_copy)
            display(HTML(js_code))
    
    def on_add_depvar_clicked(b):
        update_chart()
    
    def on_add_residuals_clicked(b):
        # If residuals are being added, make sure dual scale is on to show residuals clearly
        if b.value and not dual_scale_btn.value:
            dual_scale_btn.value = True
        update_chart()
    
    # Connect button events
    dual_scale_btn.observe(on_dual_scale_clicked, names='value')
    copy_data_btn.on_click(on_copy_data_clicked)
    add_depvar_btn.observe(on_add_depvar_clicked, names='value')
    add_residuals_btn.observe(on_add_residuals_clicked, names='value')
    
    # Create button row
    button_box = widgets.HBox([dual_scale_btn, copy_data_btn, add_depvar_btn, add_residuals_btn])
    
    # Layout the widgets
    display(widgets.VBox([button_box, chart_output, message_output]))
    
    # Show initial chart
    update_chart()

def get_transformed_variables(model):
    """
    Get all transformed variables from a model.
    
    Parameters:
    -----------
    model : LinearModel
        The model to extract transformed variables from
        
    Returns:
    --------
    list
        List of transformed variable names
    """
    transformed_vars = []
    
    # Check model data
    if not hasattr(model, 'model_data') or model.model_data is None:
        return transformed_vars
    
    # Get all variables with transformations
    all_variables = model.model_data.columns
    
    # Look for SPLIT variables
    split_vars = [var for var in all_variables if '|SPLIT' in var]
    transformed_vars.extend(split_vars)
    
    # Look for MULT variables
    mult_vars = [var for var in all_variables if '|MULT' in var]
    transformed_vars.extend(mult_vars)
    
    # Look for EDIT variables (backwards compatibility)
    edit_vars = [var for var in all_variables if '|EDIT' in var]
    transformed_vars.extend(edit_vars)
    
    # Look for adstock variables
    adstock_vars = [var for var in all_variables if '_adstock_' in var]
    transformed_vars.extend(adstock_vars)
    
    return transformed_vars