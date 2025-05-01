// Create this as a utility file: src/utils/chartFormatter.js

/**
 * Formats data from the API to be compatible with Syncfusion charts
 * @param {Array} chartData - Raw chart data from the API
 * @returns {Object} Formatted data for Syncfusion charts
 */
export const formatChartData = (chartData) => {
 if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
  return { 
        formattedData: [],
        dateFormat: {}
      };
    }
  
    // Format dates and prepare data structure
    const allDates = new Set();
    const seriesMap = {};
  
    // First, collect all unique dates and initialize series data
    chartData.forEach(series => {
      if (!series.data || !Array.isArray(series.data)) return;
      
      series.data.forEach(point => {
        if (!point || !point.x) return;
        
        // Convert date string to Date object
        let dateStr;
        if (typeof point.x === 'string') {
          // Handle date format - ensure it's consistent
          const dateParts = point.x.split('T')[0].split('-');
          if (dateParts.length === 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
            const day = parseInt(dateParts[2]);
            const dateObj = new Date(year, month, day);
            dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
            allDates.add(dateStr);
          }
        }
      });
      
      // Initialize series data in the map
      seriesMap[series.name] = {
        name: series.name,
        type: 'Line',
        dataSource: [],
        xName: 'x',
        yName: 'y',
        marker: {
          visible: true,
          width: 8,
          height: 8
        }
      };
    });
  
    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort();
    
    // Now populate each series with data points
    chartData.forEach(series => {
      if (!series.data || !Array.isArray(series.data)) return;
      
      // Create a map of date -> value for this series
      const dateValueMap = {};
      
      series.data.forEach(point => {
        if (!point || !point.x || point.y === undefined) return;
        
        // Get date string in consistent format
        let dateStr;
        if (typeof point.x === 'string') {
          dateStr = point.x.split('T')[0]; // Get YYYY-MM-DD part
        } else {
          const dateObj = new Date(point.x);
          dateStr = dateObj.toISOString().split('T')[0];
        }
        
        dateValueMap[dateStr] = point.y;
      });
      
      // For each date in our sorted array, create a data point
      sortedDates.forEach(dateStr => {
        const value = dateValueMap[dateStr] !== undefined ? dateValueMap[dateStr] : null;
        
        // Only add non-null values to prevent chart errors
        if (value !== null) {
          seriesMap[series.name].dataSource.push({
            x: new Date(dateStr),
            y: value
          });
        }
      });
    });
  
    // Convert the series map to an array
    const formattedSeries = Object.values(seriesMap).filter(
      series => series.dataSource && series.dataSource.length > 0
    );
  
    // Prepare date format settings for x-axis
    const dateFormat = {
      // Default format for most date ranges
      format: 'MMM yyyy',
      interval: 1,
      intervalType: 'Months',
      
      // If we have many years of data, adjust to show years only
      yearFormat: sortedDates.length > 36 ? {
        format: 'yyyy',
        interval: 1,
        intervalType: 'Years'
      } : null,
      
      // If we have only a few days/weeks, show more detailed format
      dayFormat: sortedDates.length <= 14 ? {
        format: 'dd MMM',
        interval: 1,
        intervalType: 'Days'
      } : null
    };
  
    return {
      formattedData: formattedSeries,
      dateFormat
    };
  };
  
  /**
   * Formats data for bar charts
   * @param {Array} chartData - Raw chart data from the API
   * @returns {Object} Formatted data for bar charts
   */
  export const formatBarChartData = (chartData) => {
    // Similar logic as above but formatted specifically for bar charts
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      return { 
        formattedData: [],
        categories: []
      };
    }
    
    // For bar charts, we'll use categories on the x-axis
    const allCategories = new Set();
    const seriesMap = {};
    
    // First pass: collect all categories and initialize series
    chartData.forEach(series => {
      if (!series.data || !Array.isArray(series.data)) return;
      
      // Initialize series entry
      seriesMap[series.name] = {
        name: series.name,
        type: 'Column',
        dataSource: [],
        xName: 'x',
        yName: 'y',
        columnWidth: 0.7,
        cornerRadius: { topLeft: 5, topRight: 5 }
      };
      
      // Collect categories from data points
      series.data.forEach(point => {
        if (!point || !point.x) return;
        allCategories.add(point.x.toString());
      });
    });
    
    // Sort categories (assume they might be dates or numbers)
    const sortedCategories = Array.from(allCategories).sort();
    
    // Second pass: populate series data
    chartData.forEach(series => {
      if (!series.data || !Array.isArray(series.data)) return;
      
      // Create map of category -> value
      const categoryValueMap = {};
      series.data.forEach(point => {
        if (!point || !point.x || point.y === undefined) return;
        categoryValueMap[point.x.toString()] = point.y;
      });
      
      // For each category, add a data point
      sortedCategories.forEach(category => {
        const value = categoryValueMap[category] !== undefined ? categoryValueMap[category] : null;
        
        if (value !== null) {
          seriesMap[series.name].dataSource.push({
            x: category,
            y: value
          });
        }
      });
    });
    
    // Convert series map to array
    const formattedSeries = Object.values(seriesMap).filter(
      series => series.dataSource && series.dataSource.length > 0
    );
    
    return {
      formattedData: formattedSeries,
      categories: sortedCategories
    };
  };
  
  /**
   * Formats data for area charts
   * @param {Array} chartData - Raw chart data from the API
   * @returns {Object} Formatted data for area charts
   */
  export const formatAreaChartData = (chartData) => {
    // Use the same base logic as line charts
    const { formattedData, dateFormat } = formatChartData(chartData);
    
    // Modify for area chart type
    const areaSeriesData = formattedData.map(series => ({
      ...series,
      type: 'SplineArea', // Use SplineArea for smooth curves
      opacity: 0.6,       // Add some transparency
      border: { width: 2 }
    }));
    
    return {
      formattedData: areaSeriesData,
      dateFormat
    };
  };
  
  /**
   * Formats data for stacked charts
   * @param {Array} chartData - Raw chart data from the API
   * @returns {Object} Formatted data for stacked charts
   */
  export const formatStackedChartData = (chartData) => {
    // Similar to bar chart but with stacking
    const { formattedData, categories } = formatBarChartData(chartData);
    
    // Modify for stacked column type
    const stackedSeriesData = formattedData.map(series => ({
      ...series,
      type: 'StackingColumn',
      columnWidth: 0.6
    }));
    
    return {
      formattedData: stackedSeriesData,
      categories
    };
  };
  
  /**
   * Formats data for scatter charts
   * @param {Array} chartData - Raw chart data from the API 
   * @returns {Object} Formatted data for scatter charts
   */
  export const formatScatterChartData = (chartData) => {
    if (chartData.length < 2) {
      return { 
        formattedData: [], 
        axisInfo: {} 
      };
    }
    
    // For scatter plot, first series is X, second is Y
    const xSeries = chartData[0];
    const ySeries = chartData[1];
    
    if (!xSeries || !xSeries.data || !ySeries || !ySeries.data) {
      return { formattedData: [], axisInfo: {} };
    }
    
    // Combine the two series into scatter points
    const scatterPoints = [];
    const dates = []; // Store dates for tooltips
    
    for (let i = 0; i < xSeries.data.length; i++) {
      if (i < ySeries.data.length && 
          xSeries.data[i] && ySeries.data[i] && 
          xSeries.data[i].y !== undefined && ySeries.data[i].y !== undefined) {
        
        // Get date for tooltip (if available)
        let date = null;
        if (xSeries.data[i].x) {
          date = typeof xSeries.data[i].x === 'string' 
            ? xSeries.data[i].x 
            : new Date(xSeries.data[i].x).toISOString();
        }
        
        scatterPoints.push({
          x: xSeries.data[i].y,  // Use y value from first series as x
          y: ySeries.data[i].y,  // Use y value from second series as y
          date: date             // Store date for tooltip
        });
        
        if (date) dates.push(date);
      }
    }
    
    // Create the scatter series
    const scatterSeries = {
      name: `${xSeries.name} vs ${ySeries.name}`,
      type: 'Scatter',
      dataSource: scatterPoints,
      xName: 'x',
      yName: 'y',
      marker: {
        visible: true,
        width: 10,
        height: 10,
        opacity: 0.7
      }
    };
    
    // Axis information for the chart
    const axisInfo = {
      xAxisTitle: xSeries.name,
      yAxisTitle: ySeries.name,
      dates: dates
    };
    
    return {
      formattedData: [scatterSeries],
      axisInfo
    };
  };