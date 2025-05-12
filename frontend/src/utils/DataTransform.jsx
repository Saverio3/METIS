// src/utils/DataTransform.js
// This utility transforms API data into the format expected by Syncfusion charts

/**
 * Transforms API data into the exact format expected by Syncfusion charts
 * @param {Array} apiData - The raw data from the API
 * @returns {Array} - An array of series formatted for Syncfusion charts
 */
export const transformForSyncfusion = (apiData) => {
  if (!apiData || !Array.isArray(apiData) || apiData.length === 0) {
    return [];
  }

  return apiData.map((series) => {
    // Transform the data points for this series
    const transformedData = series.data
      .filter((point) => point && point.x && point.y !== undefined && point.y !== null)
      .map((point) => {
        // Convert string date to Date object
        let xValue;

        if (typeof point.x === 'string') {
          // Handle ISO date strings
          xValue = new Date(point.x);
        } else if (point.x instanceof Date) {
          xValue = point.x;
        } else {
          xValue = point.x;
        }

        // Format date for tooltip
        let formattedDate;
        if (xValue instanceof Date) {
          formattedDate = xValue.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        } else {
          formattedDate = String(xValue);
        }

        // Ensure y is a number
        const yValue = typeof point.y === 'string' ? parseFloat(point.y) : point.y;

        return {
          x: xValue,
          y: yValue,
          formattedDate,
        };
      });

    // Return a properly formatted series object for Syncfusion
    return {
      dataSource: transformedData,
      xName: 'x',
      yName: 'y',
      name: series.name,
      width: '2',
      marker: { visible: true, width: 10, height: 10 },
      type: 'Line', // Default to Line, will be overridden for other chart types
    };
  });
};

/**
   * Transforms API data into the format expected by Syncfusion bar charts
   * @param {Array} apiData - The raw data from the API
   * @returns {Array} - An array of series formatted for Syncfusion bar charts
   */
export const transformForBarChart = (apiData) => {
  const series = transformForSyncfusion(apiData);

  // Modify for bar chart
  return series.map((s) => ({
    ...s,
    type: 'Column',
    cornerRadius: { topLeft: 5, topRight: 5 },
    columnWidth: 0.7,
  }));
};

/**
   * Transforms API data into the format expected by Syncfusion area charts
   * @param {Array} apiData - The raw data from the API
   * @returns {Array} - An array of series formatted for Syncfusion area charts
   */
export const transformForAreaChart = (apiData) => {
  const series = transformForSyncfusion(apiData);

  // Modify for area chart
  return series.map((s) => ({
    ...s,
    type: 'SplineArea',
    opacity: 0.6,
    border: { width: 2 },
  }));
};

/**
   * Transforms API data into the format expected by Syncfusion stacked charts
   * @param {Array} apiData - The raw data from the API
   * @returns {Array} - An array of series formatted for Syncfusion stacked charts
   */
export const transformForStackedChart = (apiData) => {
  const series = transformForSyncfusion(apiData);

  // Modify for stacked chart
  return series.map((s) => ({
    ...s,
    type: 'StackingColumn',
    columnWidth: 0.6,
    marker: { visible: false }, // Explicitly disable markers for stacked charts
  }));
};

/**
   * Transforms API data into the format expected by Syncfusion scatter charts
   * @param {Array} apiData - The raw data from the API
   * @returns {Object} - Formatted data for scatter charts
   */
export const transformForScatterChart = (apiData) => {
  if (!apiData || apiData.length < 2) {
    return [];
  }

  // For scatter plot, first series is X, second is Y
  const xSeries = apiData[0];
  const ySeries = apiData[1];

  if (!xSeries || !xSeries.data || !ySeries || !ySeries.data) {
    return [];
  }

  // Combine the two series into scatter points
  const scatterPoints = [];

  for (let i = 0; i < xSeries.data.length; i++) {
    if (i < ySeries.data.length
          && xSeries.data[i] && ySeries.data[i]
          && xSeries.data[i].y !== undefined && ySeries.data[i].y !== undefined) {
      scatterPoints.push({
        x: xSeries.data[i].y, // X value comes from y value of first series
        y: ySeries.data[i].y, // Y value comes from y value of second series
      });
    }
  }

  if (scatterPoints.length === 0) {
    return [];
  }

  return [{
    dataSource: scatterPoints,
    xName: 'x',
    yName: 'y',
    name: `${xSeries.name} vs ${ySeries.name}`,
    type: 'Scatter',
    marker: {
      visible: true,
      width: 10,
      height: 10,
      shape: 'Circle',
    },
  }];
};
