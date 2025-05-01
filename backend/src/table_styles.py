"""
Common table styling functions for econometric tool.
"""

import pandas as pd

def get_results_table_html(df, initial_columns=None, detail_columns=None, table_id="results-table", max_rows=20):
    """
    Convert DataFrame to a custom HTML table with expandable details.
    
    Parameters:
    -----------
    df : pandas.DataFrame
        DataFrame containing results
    initial_columns : list, optional
        Columns to show initially (if None, all columns shown)
    detail_columns : list, optional
        Columns to show when details expanded (if None, no expanding functionality)
    table_id : str, optional
        ID for the HTML table
    max_rows : int, optional
        Maximum number of rows to display before adding scrolling (default: 20)
        
    Returns:
    --------
    str
        HTML string for the table with styling and sorting
    """
    # Reset index to make sure it's sequential
    df = df.reset_index(drop=True)
    
    # Define columns to show initially
    if initial_columns is None:
        initial_columns = df.columns
    
    # Ensure detail_columns is a list (even if empty)
    if detail_columns is None:
        detail_columns = []
    
    # Check if columns should be expandable
    expandable = len(detail_columns) > 0
    all_columns = list(initial_columns)
    if expandable:
        all_columns += [col for col in detail_columns if col not in initial_columns]
    
    # Make sure specified columns exist in the DataFrame
    initial_columns = [col for col in initial_columns if col in df.columns]
    detail_columns = [col for col in detail_columns if col in df.columns]
    
    # Start building the HTML
    html = f"""
    <style>
    #{table_id}-container {{
        max-width: 100%;
        overflow-x: auto;
        position: relative;
    }}
    
    #{table_id}-wrapper {{
        max-height: {max_rows * 39}px; /* Approx. row height * max rows */
        overflow-y: auto;
        margin-bottom: 10px;
    }}
    
    #{table_id} {{
        border-collapse: collapse;
        width: 100%;
        font-family: Arial, sans-serif;
        table-layout: fixed;
    }}
    
    #{table_id} th, #{table_id} td {{
        padding: 8px 12px;
        text-align: right;
        border-bottom: 1px solid #ddd;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }}
    
    #{table_id} thead {{
        position: sticky;
        top: 0;
        z-index: 10;
    }}
    
    #{table_id} th {{
        background-color: #444;
        color: white;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
        position: relative;
    }}
    
    #{table_id} th .resizer {{
        position: absolute;
        top: 0;
        right: 0;
        width: 5px;
        height: 100%;
        background-color: transparent;
        cursor: col-resize;
        z-index: 10;
    }}
    
    #{table_id} .variable-col {{
        text-align: left;
        min-width: 200px;
        word-wrap: break-word;
        position: sticky;
        left: 0;
        background-color: #444;
        color: white;
        white-space: normal;
        z-index: 5;
    }}
    
    #{table_id} th.variable-col {{
        background-color: #444;
        color: white;
        z-index: 15;
    }}
    
    #{table_id} td.variable-col {{
        background-color: #444;
        color: white;
    }}
    
    #{table_id} tr:nth-child(even) td:not(.variable-col):not(.significant-positive):not(.significant-negative) {{
        background-color: #f9f9f9;
    }}
    
    #{table_id} tr:nth-child(odd) td:not(.variable-col):not(.significant-positive):not(.significant-negative) {{
        background-color: white;
    }}
    
    #{table_id} .positive-coef {{
        color: #28a745;
    }}
    
    #{table_id} .negative-coef {{
        color: #dc3545;
    }}
    
    #{table_id} .significant-positive {{
        background-color: #d4edda !important;
        color: #155724;
    }}
    
    #{table_id} .significant-negative {{
        background-color: #f8d7da !important;
        color: #721c24;
    }}
    
    .details-button {{
        margin: 10px 0;
        padding: 8px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }}
    
    .details-button:hover {{
        background-color: #0069d9;
    }}
    
    .detail-column {{
        display: none;
    }}
    </style>
    
    <div id="{table_id}-container">
    """
    
    # Add details toggle button if expandable
    if expandable:
        html += f"""
        <button id="{table_id}-toggle" class="details-button">Show Details</button>
        """
    
    # Table wrapper for scrolling
    html += f"""
    <div id="{table_id}-wrapper">
    <table id="{table_id}">
    <thead>
        <tr>
    """
    
    # Add table headers
    for col in initial_columns:
        var_class = ' class="variable-col"' if col == 'Variable' else ''
        html += f'<th{var_class}>{col}<div class="resizer"></div></th>\n'
    
    # Add detail column headers (hidden initially) - only if there are any
    if detail_columns:
        for col in detail_columns:
            html += f'<th class="detail-column">{col}<div class="resizer"></div></th>\n'
    
    html += """
        </tr>
    </thead>
    <tbody>
    """
    
    # Add each row
    for i, row in df.iterrows():
        # Start the row
        html += f'<tr>\n'
        
        # Add visible columns
        for col in initial_columns:
            if col not in row:
                continue
                
            cell_value = row[col]
            
            # Format numeric values
            if isinstance(cell_value, (int, float)):
                cell_display = f"{cell_value:.4f}"
            else:
                cell_display = str(cell_value)
            
            # Determine cell classes
            cell_class = ""
            
            # Variable column special handling
            if col == 'Variable':
                cell_class = 'class="variable-col"'
            # Coefficient coloring
            elif col == 'Coefficient':
                if cell_value is not None and cell_value > 0:
                    cell_class = 'class="positive-coef"'
                elif cell_value is not None and cell_value < 0:
                    cell_class = 'class="negative-coef"'
            # T-stat significance highlighting
            elif col == 'T-stat':
                # Use the absolute value for significance testing
                is_significant = cell_value is not None and abs(cell_value) > 1.645  # 90% confidence level
                if is_significant:
                    # Check if coefficient is positive or negative
                    coef_value = row.get('Coefficient', 0)
                    if coef_value > 0:
                        cell_class = 'class="significant-positive"'
                    else:
                        cell_class = 'class="significant-negative"'
            
            html += f'<td {cell_class}>{cell_display}</td>\n'
        
        # Add detail columns (hidden initially) - only if there are any
        if detail_columns:
            for col in detail_columns:
                if col not in row:
                    continue
                    
                cell_value = row[col]
                
                # Format numeric values
                if isinstance(cell_value, (int, float)):
                    cell_display = f"{cell_value:.4f}"
                else:
                    cell_display = str(cell_value)
                
                html += f'<td class="detail-column">{cell_display}</td>\n'
        
        # Close the row
        html += '</tr>\n'
    
    # Close the table
    html += """
    </tbody>
    </table>
    </div>
    </div>
    
    <script>
    (function() {
        // Add sorting functionality to table headers
        var tableId = '""" + table_id + """';
        var table = document.getElementById(tableId);
        var headers = table.querySelectorAll('th');
        var tableBody = table.querySelector('tbody');
        
        // Column resizing functionality
        var resizers = table.querySelectorAll('.resizer');
        var currentResizer;
        
        // Set up column resizing
        [].forEach.call(resizers, function(resizer) {
            resizer.addEventListener('mousedown', function(e) {
                currentResizer = e.target;
                var th = e.target.parentElement;
                
                // Get the current width
                var currentWidth = th.offsetWidth;
                
                // Calculate the starting position
                var startX = e.pageX;
                
                // Add event listeners for mousemove and mouseup
                document.addEventListener('mousemove', mousemove);
                document.addEventListener('mouseup', mouseup);
                
                function mousemove(e) {
                    if (currentResizer) {
                        // Calculate the width change
                        var newWidth = currentWidth + (e.pageX - startX);
                        
                        // Set a minimum width to prevent columns from disappearing
                        if (newWidth > 50) {
                            th.style.width = newWidth + 'px';
                        }
                    }
                }
                
                function mouseup() {
                    currentResizer = null;
                    document.removeEventListener('mousemove', mousemove);
                    document.removeEventListener('mouseup', mouseup);
                }
                
                // Prevent text selection while resizing
                e.preventDefault();
            });
        });
        
        // Sorting functionality
        headers.forEach(function(header, i) {
            header.addEventListener('click', function(e) {
                // Make sure we're not clicking on the resizer
                if (e.target.className === 'resizer') {
                    return;
                }
                
                var sortDirection = this.getAttribute('data-sort-direction') === 'asc' ? 'desc' : 'asc';
                
                // Reset all headers
                headers.forEach(function(h) {
                    h.removeAttribute('data-sort-direction');
                });
                
                // Set current header as sorted
                this.setAttribute('data-sort-direction', sortDirection);
                
                // Get rows and sort them
                var rows = Array.from(tableBody.rows);
                rows.sort(function(rowA, rowB) {
                    var cellA = rowA.cells[i].textContent.trim();
                    var cellB = rowB.cells[i].textContent.trim();
                    
                    // Convert to numbers if possible
                    var numA = parseFloat(cellA);
                    var numB = parseFloat(cellB);
                    
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return sortDirection === 'asc' ? numA - numB : numB - numA;
                    } else {
                        return sortDirection === 'asc' ? 
                            cellA.localeCompare(cellB) : 
                            cellB.localeCompare(cellA);
                    }
                });
                
                // Rearrange rows based on sort
                rows.forEach(function(row) {
                    tableBody.appendChild(row);
                });
            });
        });
    """
    
    # Add details toggle functionality if expandable
    if expandable:
        html += f"""
        // Toggle detail columns
        var toggleButton = document.getElementById('{table_id}-toggle');
        var detailColumns = document.querySelectorAll('.detail-column');
        
        if (toggleButton) {{
            toggleButton.addEventListener('click', function() {{
                var isHidden = detailColumns[0].style.display === 'none' || detailColumns[0].style.display === '';
                
                detailColumns.forEach(function(element) {{
                    element.style.display = isHidden ? 'table-cell' : 'none';
                }});
                
                toggleButton.textContent = isHidden ? 'Hide Details' : 'Show Details';
            }});
        }}
        """
    
    html += """
    })();
    </script>
    """
    
    return html


def get_comparison_table_html(df, table_id="comparison-table"):
    """
    Convert DataFrame to a custom HTML table with color-coded changes for model comparisons.
    
    Parameters:
    -----------
    df : pandas.DataFrame
        DataFrame containing model comparison results
    table_id : str, optional
        ID for the HTML table
        
    Returns:
    --------
    str
        HTML string for the styled comparison table
    """
    # Import needed libraries
    import pandas as pd
    import numpy as np
    
    # Reset index to make sure it's sequential
    df = df.reset_index(drop=True)
    
    # Define columns to show
    columns = ["Variable", "Coefficient", "T-statistic", "New Coefficient", "New T-statistic", 
               "Coef Change %", "T-stat Change %"]
    
    # Check which columns actually exist
    existing_columns = [col for col in columns if col in df.columns or 
                      (col == "Coef Change %" and "Coef Change" in df.columns) or
                      (col == "T-stat Change %" and "T-stat Change" in df.columns)]
    
    # Convert raw change to percentage change if needed
    if "Coef Change" in df.columns and "Coef Change %" not in df.columns:
        df["Coef Change %"] = df.apply(
            lambda row: (row["New Coefficient"] / row["Coefficient"] - 1) * 100 
            if row["Coefficient"] != 0 and pd.notnull(row["Coefficient"]) and pd.notnull(row["New Coefficient"]) 
            else None, 
            axis=1
        )
    
    if "T-stat Change" in df.columns and "T-stat Change %" not in df.columns:
        df["T-stat Change %"] = df.apply(
            lambda row: (row["New T-statistic"] / row["T-statistic"] - 1) * 100 
            if row["T-statistic"] != 0 and pd.notnull(row["T-statistic"]) and pd.notnull(row["New T-statistic"]) 
            else None, 
            axis=1
        )
    
    # Start building the HTML
    html = f"""
    <style>
    #{table_id}-container {{
        max-width: 100%;
        overflow-x: auto;
        position: relative;
    }}
    
    #{table_id}-wrapper {{
        max-height: 600px; /* Limit height with scrolling */
        overflow-y: auto;
        margin-bottom: 10px;
    }}
    
    #{table_id} {{
        border-collapse: collapse;
        width: 100%;
        font-family: Arial, sans-serif;
        table-layout: fixed;
    }}
    
    #{table_id} th, #{table_id} td {{
        padding: 8px 12px;
        text-align: right;
        border-bottom: 1px solid #ddd;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }}
    
    #{table_id} thead {{
        position: sticky;
        top: 0;
        z-index: 10;
    }}
    
    #{table_id} th {{
        background-color: #444;
        color: white;
        font-weight: bold;
        position: relative;
    }}
    
    #{table_id} .variable-col {{
        text-align: left;
        min-width: 200px;
        word-wrap: break-word;
        position: sticky;
        left: 0;
        background-color: #444;
        color: white;
        white-space: normal;
        z-index: 5;
    }}
    
    #{table_id} td.variable-col {{
        background-color: #444;
        color: white;
    }}
    
    #{table_id} tr:nth-child(even) td:not(.variable-col):not(.significant-positive):not(.significant-negative) {{
        background-color: #f9f9f9;
    }}
    
    #{table_id} tr:nth-child(odd) td:not(.variable-col):not(.significant-positive):not(.significant-negative) {{
        background-color: white;
    }}
    
    #{table_id} .positive-coef {{
        color: #28a745;
    }}
    
    #{table_id} .negative-coef {{
        color: #dc3545;
    }}
    
    #{table_id} .significant-positive {{
        background-color: #d4edda !important;
        color: #155724;
    }}
    
    #{table_id} .significant-negative {{
        background-color: #f8d7da !important;
        color: #721c24;
    }}
    
    /* Color coding for percent changes */
    #{table_id} .change-major-increase {{
        background-color: #d4edda !important;
        color: #155724;
        font-weight: bold;
    }}
    
    #{table_id} .change-major-decrease {{
        background-color: #f8d7da !important;
        color: #721c24;
        font-weight: bold;
    }}
    
    #{table_id} .change-moderate {{
        background-color: #fff3cd !important;
        color: #856404;
    }}
    
    #{table_id} .change-minimal {{
        /* No special styling for minimal changes */
    }}
    
    /* Button styling */
    .model-change-buttons {{
        display: flex;
        justify-content: flex-end;
        margin-top: 15px;
        gap: 10px;
    }}
    
    .model-change-btn {{
        padding: 8px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    }}
    
    .model-change-btn-cancel {{
        background-color: #f8d7da;
        color: #721c24;
    }}
    
    .model-change-btn-confirm {{
        background-color: #d4edda;
        color: #155724;
    }}
    </style>
    
    <div id="{table_id}-container">
    <div id="{table_id}-wrapper">
    <table id="{table_id}">
    <thead>
        <tr>
    """
    
    # Add table headers
    for col in existing_columns:
        display_name = col
        if col == "Coef Change %":
            display_name = "Coef Change %"
        elif col == "T-stat Change %":
            display_name = "T-stat Change %"
        
        var_class = ' class="variable-col"' if col == "Variable" else ''
        html += f'<th{var_class}>{display_name}</th>\n'
    
    html += """
        </tr>
    </thead>
    <tbody>
    """
    
    # Add each row
    for i, row in df.iterrows():
        # Start the row
        html += f'<tr>\n'
        
        # Add each cell
        for col in existing_columns:
            if col not in row and col == "Coef Change %":
                col = "Coef Change"
            if col not in row and col == "T-stat Change %":
                col = "T-stat Change"
                
            if col not in row:
                continue
                
            cell_value = row[col]
            
            # Format numeric values
            if pd.notnull(cell_value) and isinstance(cell_value, (int, float)):
                if "Change %" in col:
                    cell_display = f"{cell_value:.2f}%"
                else:
                    cell_display = f"{cell_value:.4f}"
            else:
                cell_display = "" if pd.isnull(cell_value) else str(cell_value)
            
            # Determine cell classes
            cell_class = ""
            
            # Variable column special handling
            if col == "Variable":
                cell_class = 'class="variable-col"'
            
            # Coefficient coloring for both original and new
            elif col == "Coefficient" or col == "New Coefficient":
                if pd.notnull(cell_value) and cell_value > 0:
                    cell_class = 'class="positive-coef"'
                elif pd.notnull(cell_value) and cell_value < 0:
                    cell_class = 'class="negative-coef"'
            
            # T-stat significance highlighting for both original and new
            elif col == "T-statistic" or col == "New T-statistic":
                # Use the absolute value for significance testing
                is_significant = pd.notnull(cell_value) and abs(cell_value) > 1.96  # 95% confidence level
                if is_significant:
                    # Check if coefficient is positive or negative
                    coef_col = "Coefficient" if col == "T-statistic" else "New Coefficient"
                    coef_value = row.get(coef_col, 0)
                    if pd.notnull(coef_value) and coef_value > 0:
                        cell_class = 'class="significant-positive"'
                    else:
                        cell_class = 'class="significant-negative"'
            
            # Coefficient change percentage coloring
            elif col == "Coef Change %" or col == "Coef Change":
                if pd.notnull(cell_value):
                    pct_value = cell_value
                    if col == "Coef Change":
                        # Calculate percentage if we have both values
                        old_coef = row.get("Coefficient", 0)
                        new_coef = row.get("New Coefficient", 0)
                        if pd.notnull(old_coef) and pd.notnull(new_coef) and old_coef != 0:
                            pct_value = (new_coef / old_coef - 1) * 100
                        else:
                            pct_value = 0
                    
                    if abs(pct_value) >= 50:
                        if pct_value > 0:
                            cell_class = 'class="change-major-increase"'
                        else:
                            cell_class = 'class="change-major-decrease"'
                    elif abs(pct_value) >= 15:
                        cell_class = 'class="change-moderate"'
                    else:
                        cell_class = 'class="change-minimal"'
            
            # T-statistic change percentage coloring
            elif col == "T-stat Change %" or col == "T-stat Change":
                if pd.notnull(cell_value):
                    pct_value = cell_value
                    if col == "T-stat Change":
                        # Calculate percentage if we have both values
                        old_tstat = row.get("T-statistic", 0)
                        new_tstat = row.get("New T-statistic", 0)
                        if pd.notnull(old_tstat) and pd.notnull(new_tstat) and old_tstat != 0:
                            pct_value = (new_tstat / old_tstat - 1) * 100
                        else:
                            pct_value = 0
                    
                    if abs(pct_value) >= 50:
                        if pct_value > 0:
                            cell_class = 'class="change-major-increase"'
                        else:
                            cell_class = 'class="change-major-decrease"'
                    elif abs(pct_value) >= 15:
                        cell_class = 'class="change-moderate"'
                    else:
                        cell_class = 'class="change-minimal"'
            
            html += f'<td {cell_class}>{cell_display}</td>\n'
        
        # Close the row
        html += '</tr>\n'
    
    # Close the table
    html += """
    </tbody>
    </table>
    </div>
    """
    
    # Add buttons for confirmation/cancellation
    html += f"""
    <div class="model-change-buttons">
        <button id="{table_id}-cancel" class="model-change-btn model-change-btn-cancel">Cancel</button>
        <button id="{table_id}-confirm" class="model-change-btn model-change-btn-confirm">Confirm</button>
    </div>
    
    <script>
        // Set up button handlers
        document.getElementById("{table_id}-cancel").onclick = function() {{
            IPython.notebook.kernel.execute('_model_change_choice = "cancel"');
        }};
        
        document.getElementById("{table_id}-confirm").onclick = function() {{
            IPython.notebook.kernel.execute('_model_change_choice = "confirm"');
        }};
    </script>
    """
    
    return html