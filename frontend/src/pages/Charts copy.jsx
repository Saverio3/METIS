import React, { useState, useEffect, useRef } from 'react';
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  Legend,
  Category,
  Tooltip,
  DataLabel,
  LineSeries,
  ScatterSeries,
  ColumnSeries,
  AreaSeries,
  SplineSeries,
  StackingColumnSeries,
  Zoom,
  Crosshair,
  DateTime,
  ScrollBar } from '@syncfusion/ej2-react-charts';
import { ButtonComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { FiBarChart2, FiPieChart, FiTrendingUp, FiScatterPlot, FiGrid } from 'react-icons/fi';
import { MdStackedBarChart, MdOutlineMultilineChart } from 'react-icons/md';
import { AiOutlineDotChart, AiOutlineAreaChart } from 'react-icons/ai';
import { Header } from '../components';
import ErrorBoundary from '../components/ErrorBoundary';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import '../chartStyles.css';

// Import the chart data transformation utilities
import {
  transformForSyncfusion,
  transformForBarChart,
  transformForAreaChart,
  transformForStackedChart,
  transformForScatterChart,
} from '../utils/DataTransform';

const ChartTypes = {
  LINE: 'line',
  SCATTER: 'scatter',
  COLUMN: 'column',
  CORRELATION: 'correlation',
  STACKED: 'stacked',
};

const Charts = () => {
  const { currentColor } = useStateContext();
  const [variables, setVariables] = useState([]);
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [chartType, setChartType] = useState(ChartTypes.LINE);
  const [includeKPI, setIncludeKPI] = useState(false);
  const [useDualAxis, setUseDualAxis] = useState(false);
  const [kpiVariable, setKpiVariable] = useState('');
  const [correlationData, setCorrelationData] = useState(null);
  const [chartTitle, setChartTitle] = useState('Variable Visualization');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  // Ref for chart container to get dimensions
  const chartContainerRef = useRef(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

  // Chart color palette
  const chartColorPalette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  ];

  // Add a resize effect to update chart dimensions when the container resizes
  useEffect(() => {
    const updateChartDimensions = () => {
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        setChartDimensions({ width, height });
      }
    };

    // Initial measurement
    updateChartDimensions();

    // Set up resize listener
    window.addEventListener('resize', updateChartDimensions);

    // Clean up listener on unmount
    return () => {
      window.removeEventListener('resize', updateChartDimensions);
    };
  }, []);

  // Function to fetch models
  const fetchModels = async () => {
    try {
      const response = await apiService.listModels();
      if (response.success) {
        setModels(response.models);
        if (response.activeModel) {
          setSelectedModel(response.activeModel);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Fetch all available variables
  const fetchVariables = async () => {
    try {
      setLoading(true);
      const response = await apiService.getVariables();
      if (response.success) {
        setVariables(response.variables);

        // Find a likely KPI variable
        const kpi = response.variables.find((v) => v.name.toLowerCase().includes('kpi')
          || v.name.toLowerCase().includes('sales')
          || v.name.toLowerCase().includes('revenue'));
        if (kpi) {
          setKpiVariable(kpi.name);
        } else if (response.variables.length > 0) {
          setKpiVariable(response.variables[0].name);
        }
      } else {
        console.error('Failed to load variables:', response.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching variables:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariables();
    fetchModels();
  }, []);

  // Filter variables based on search term
  const filteredVariables = variables.filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Handle checkbox selection
  const handleCheckboxClick = (variableName) => {
    setSelectedVariables((prev) => {
      if (prev.includes(variableName)) {
        return prev.filter((v) => v !== variableName);
      }
      return [...prev, variableName];
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVariables(filteredVariables.map((v) => v.name));
    } else {
      setSelectedVariables([]);
    }
  };

  // Fetch chart data when variables are selected
  const fetchChartData = async () => {
    if (selectedVariables.length === 0) {
      alert('Please select at least one variable to chart');
      return;
    }

    setLoading(true);
    try {
      // Get variables to chart
      const variablesToChart = [...selectedVariables];

      // Add KPI if option is selected
      if (includeKPI && kpiVariable && !variablesToChart.includes(kpiVariable)) {
        variablesToChart.push(kpiVariable);
      }

      console.log('Sending to API:', { modelName: selectedModel, variables: variablesToChart });
      const response = await apiService.chartVariables(selectedModel, variablesToChart);

      if (response.success) {
        console.log('Chart data received:', response.chartData);

        if (!response.chartData || response.chartData.length === 0) {
          console.error('No chart data returned');
          alert('No data available for the selected variables');
          setLoading(false);
          return;
        }

        // Store the raw chart data
        setChartData(response.chartData);

        // Set chart title
        if (variablesToChart.length === 1) {
          setChartTitle(`${variablesToChart[0]} Over Time`);
        } else if (variablesToChart.length === 2) {
          setChartTitle(`${variablesToChart[0]} vs ${variablesToChart[1]}`);
        } else {
          setChartTitle('Multiple Variables Comparison');
        }
      } else {
        console.error('Failed to fetch chart data:', response.error);
        alert('Failed to load chart data');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      alert('Error loading chart data');
      setLoading(false);
    }
  };

  // Calculate correlation matrix
  const calculateCorrelation = async () => {
    if (selectedVariables.length < 2) {
      alert('Please select at least two variables for correlation');
      return;
    }

    setLoading(true);
    try {
      // First, fetch the data explicitly for all selected variables
      const response = await apiService.chartVariables(selectedModel, selectedVariables);

      if (!response.success || !response.chartData) {
        alert('Failed to get data for correlation calculation');
        setLoading(false);
        return;
      }

      // Update the chart data with the fetched data
      setChartData(response.chartData);

      // Create correlation matrix
      const correlationMatrix = {};

      // Initialize the matrix with self-correlations
      selectedVariables.forEach((variable1) => {
        correlationMatrix[variable1] = {};
        selectedVariables.forEach((variable2) => {
          correlationMatrix[variable1][variable2] = variable1 === variable2 ? 1 : null;
        });
      });

      // Get the data series for each variable
      const seriesMap = {};
      response.chartData.forEach((series) => {
        if (series && series.name) {
          seriesMap[series.name] = series.data || [];
        }
      });

      // Calculate correlations between all pairs of variables
      for (const variable1 of selectedVariables) {
        for (const variable2 of selectedVariables) {
          // Skip self-correlations and already calculated pairs
          if (variable1 === variable2 || correlationMatrix[variable1][variable2] !== null) {
            continue;
          }

          const data1 = seriesMap[variable1] || [];
          const data2 = seriesMap[variable2] || [];

          if (data1.length === 0 || data2.length === 0) {
            correlationMatrix[variable1][variable2] = 0;
            correlationMatrix[variable2][variable1] = 0;
            continue;
          }

          // Match data points by date
          const matchedPairs = [];
          const dateMap = {};

          // Create a map of dates to values for the first variable
          data1.forEach((point) => {
            if (point && point.x) {
              const dateStr = typeof point.x === 'string' ? point.x
                : point.x instanceof Date ? point.x.toISOString()
                  : String(point.x);
              dateMap[dateStr] = point.y;
            }
          });

          // Find matching points for the second variable
          data2.forEach((point) => {
            if (point && point.x) {
              const dateStr = typeof point.x === 'string' ? point.x
                : point.x instanceof Date ? point.x.toISOString()
                  : String(point.x);
              if (dateMap[dateStr] !== undefined) {
                matchedPairs.push([dateMap[dateStr], point.y]);
              }
            }
          });

          // Calculate Pearson correlation coefficient
          if (matchedPairs.length > 1) {
            let sumX = 0; let sumY = 0; let sumXY = 0; let sumX2 = 0; let
              sumY2 = 0;

            for (const [x, y] of matchedPairs) {
              sumX += x;
              sumY += y;
              sumXY += x * y;
              sumX2 += x * x;
              sumY2 += y * y;
            }

            const n = matchedPairs.length;
            const numerator = n * sumXY - sumX * sumY;
            const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

            let correlation = 0;
            if (denominator !== 0) {
              correlation = numerator / denominator;
              // Round to 2 decimal places
              correlation = Math.round(correlation * 100) / 100;
            }

            correlationMatrix[variable1][variable2] = correlation;
            correlationMatrix[variable2][variable1] = correlation;
          } else {
            correlationMatrix[variable1][variable2] = 0;
            correlationMatrix[variable2][variable1] = 0;
          }
        }
      }

      // Set the correlation data and switch to correlation view
      setCorrelationData(correlationMatrix);
      setChartTitle('Correlation Matrix');
      setChartType(ChartTypes.CORRELATION);
    } catch (error) {
      console.error('Error calculating correlation:', error);
      alert(`Error calculating correlation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for correlation heatmap
  const prepareCorrelationData = () => {
    if (!correlationData) return [];

    const heatmapData = [];
    const vars = Object.keys(correlationData);

    vars.forEach((row, i) => {
      vars.forEach((col, j) => {
        heatmapData.push({
          x: col,
          y: row,
          value: correlationData[row][col],
        });
      });
    });

    return heatmapData;
  };
  // Render appropriate chart based on type
  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" style={{ borderColor: currentColor }} />
          <p className="ml-2">Loading chart data...</p>
        </div>
      );
    }

    if (chartData.length === 0 && chartType !== ChartTypes.CORRELATION) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <FiBarChart2 className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No chart data</p>
          <p className="text-gray-400 text-sm">Select variables and click "Generate Chart" to visualize data</p>
        </div>
      );
    }

    switch (chartType) {
      case ChartTypes.SCATTER:
        return renderScatterChart();
      case ChartTypes.COLUMN:
        return renderColumnChart();
      case ChartTypes.CORRELATION:
        return renderCorrelationMatrix();
      case ChartTypes.STACKED:
        return renderStackedChart();
      case ChartTypes.LINE:
      default:
        return renderLineChart();
    }
  };

  // Render line chart
  const renderLineChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <FiBarChart2 className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No chart data</p>
          <p className="text-gray-400 text-sm">Select variables and click "Generate Chart" to visualize data</p>
        </div>
      );
    }

    // Transform the data for line chart
    const transformedData = [];

    // Ensure we have data points with valid structure
    chartData.forEach((series) => {
      if (series && series.data && Array.isArray(series.data) && series.data.length > 0) {
        const validData = series.data.filter((point) => point && typeof point.x !== 'undefined' && typeof point.y !== 'undefined');

        if (validData.length > 0) {
          transformedData.push({
            dataSource: validData.map((point) => ({
              x: typeof point.x === 'string' ? new Date(point.x) : point.x,
              y: point.y,
            })),
            xName: 'x',
            yName: 'y',
            name: series.name,
            type: 'Line',
            width: 2,
            marker: { visible: true },
            fill: chartColorPalette[transformedData.length % chartColorPalette.length],
          });
        }
      }
    });

    // If no transformed data, show empty state
    if (transformedData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <FiBarChart2 className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No valid data points</p>
          <p className="text-gray-400 text-sm">The selected variables don't have any valid data points</p>
        </div>
      );
    }

    // Calculate Y-axis ranges separately for each axis
    let primaryMinY = Number.MAX_VALUE;
    let primaryMaxY = Number.MIN_VALUE;
    let secondaryMinY = Number.MAX_VALUE;
    let secondaryMaxY = Number.MIN_VALUE;

    transformedData.forEach((series, index) => {
    // Determine if this series should use the secondary axis
      const useSecondary = useDualAxis && index >= Math.ceil(transformedData.length / 2);

      if (series.dataSource && Array.isArray(series.dataSource)) {
        series.dataSource.forEach((point) => {
          if (point && typeof point.y === 'number') {
            if (useSecondary) {
              secondaryMinY = Math.min(secondaryMinY, point.y);
              secondaryMaxY = Math.max(secondaryMaxY, point.y);
            } else {
              primaryMinY = Math.min(primaryMinY, point.y);
              primaryMaxY = Math.max(primaryMaxY, point.y);
            }
          }
        });
      }
    });

    // Add padding to both axes
    const primaryPadding = (primaryMaxY - primaryMinY) * 0.1;
    primaryMinY = primaryMinY === Number.MAX_VALUE ? 0 : Math.max(0, primaryMinY - primaryPadding);
    primaryMaxY = primaryMaxY === Number.MIN_VALUE ? 100 : primaryMaxY + primaryPadding;

    const secondaryPadding = (secondaryMaxY - secondaryMinY) * 0.1;
    secondaryMinY = secondaryMinY === Number.MAX_VALUE ? 0 : Math.max(0, secondaryMinY - secondaryPadding);
    secondaryMaxY = secondaryMaxY === Number.MIN_VALUE ? 100 : secondaryMaxY + secondaryPadding;

    // Ensure valid axis intervals
    const primaryYInterval = Math.ceil((primaryMaxY - primaryMinY) / 5);
    const secondaryYInterval = Math.ceil((secondaryMaxY - secondaryMinY) / 5);

    return (
      <div className="chart-container">
        <ChartComponent
          id="line-chart"
          height="100%"
          width="100%"
          primaryXAxis={{
            valueType: 'DateTime',
            labelFormat: 'dd MMM yyyy',
            majorGridLines: { width: 0 },
            intervalType: 'Months',
            edgeLabelPlacement: 'Shift',
            labelStyle: { size: '14px' },
          }}
          primaryYAxis={{
            minimum: primaryMinY,
            maximum: primaryMaxY,
            interval: primaryYInterval > 0 ? primaryYInterval : 1,
            labelFormat: '{value}',
            lineStyle: { width: 0 },
            majorTickLines: { width: 0 },
            minorTickLines: { width: 0 },
            labelStyle: { size: '14px' },
            title: 'Primary Axis',
            titleStyle: { fontWeight: '600', size: '14px' },
          }}
        // Add secondary Y-axis
          axes={useDualAxis ? [{
            name: 'secondaryAxis',
            opposedPosition: true,
            minimum: secondaryMinY,
            maximum: secondaryMaxY,
            interval: secondaryYInterval > 0 ? secondaryYInterval : 1,
            labelFormat: '{value}',
            title: 'Secondary Axis',
            titleStyle: { fontWeight: '600', size: '14px' },
            majorGridLines: { width: 0 },
            lineStyle: { width: 1 },
            majorTickLines: { width: 1 },
          }] : []}
          chartArea={{ border: { width: 0 } }}
          tooltip={{
            enable: true }}
          legendSettings={{ visible: true }}
          title={chartTitle}
          zoomSettings={{
            enableMouseWheelZooming: true,
            enablePinchZooming: true,
            enableSelectionZooming: true,
            enableScrollbar: true,
            enablePan: true,
            mode: 'X',
            toolbarItems: ['Zoom', 'ZoomIn', 'ZoomOut', 'Pan', 'Reset'],
            showToolbar: true,
            toolbarPosition: 'TopRight',
          }}
        >
          <Inject services={[LineSeries, DateTime, Legend, Tooltip, Zoom]} />
          <SeriesCollectionDirective>
            {transformedData.map((series, index) => {
            // Determine if this series should use the secondary axis
              const useSecondary = useDualAxis && index >= Math.ceil(transformedData.length / 2);

              return (
                <SeriesDirective
                  key={index}
                  dataSource={series.dataSource}
                  xName="x"
                  yName="y"
                  name={series.name}
                  type="Line"
                  width={2}
                  marker={series.marker}
                  fill={series.fill || chartColorPalette[index % chartColorPalette.length]}
                // Set yAxisName for secondary axis series
                  yAxisName={useSecondary ? 'secondaryAxis' : null}
                />
              );
            })}
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  // Render scatter chart
  const renderScatterChart = () => {
    if (chartData.length < 2) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <AiOutlineDotChart className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">Need at least two variables</p>
          <p className="text-gray-400 text-sm">Please select at least two variables for a scatter plot</p>
        </div>
      );
    }

    // Transform the data for scatter chart
    const seriesData = transformForScatterChart(chartData);

    if (!seriesData || seriesData.length === 0 || !seriesData[0].dataSource || seriesData[0].dataSource.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <AiOutlineDotChart className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No valid data points</p>
          <p className="text-gray-400 text-sm">The selected variables don't have matching data points</p>
        </div>
      );
    }

    // Calculate min and max values for both axes with some padding
    const xValues = seriesData[0].dataSource.map((point) => point.x);
    const yValues = seriesData[0].dataSource.map((point) => point.y);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const xPadding = (maxX - minX) * 0.1;

    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const yPadding = (maxY - minY) * 0.1;

    return (
      <div className="chart-container scatter-chart-container">
        <ChartComponent
          id="scatter-chart"
          height="100%"
          width="100%"
          primaryXAxis={{
            title: chartData[0].name,
            titleStyle: { size: '14px', fontWeight: '500' },
            minimum: minX - xPadding,
            maximum: maxX + xPadding,
            interval: Math.ceil((maxX - minX) / 5),
            labelStyle: { size: '14px' },
          }}
          primaryYAxis={{
            title: chartData[1].name,
            titleStyle: { size: '14px', fontWeight: '500' },
            minimum: minY - yPadding,
            maximum: maxY + yPadding,
            interval: Math.ceil((maxY - minY) / 5),
            labelStyle: { size: '14px' },
          }}
          chartArea={{ border: { width: 0 } }}
          tooltip={{
            enable: true }}
          title={chartTitle || `${chartData[0].name} vs ${chartData[1].name}`}
          legendSettings={{ visible: false }}
          // Add zoom settings for scatter chart
          zoomSettings={{
            enableMouseWheelZooming: true,
            enablePinchZooming: true,
            enableSelectionZooming: true,
            enableScrollbar: true,
            enablePan: true,
            mode: 'XY', // Allow zooming in both directions for scatter plot
            toolbarItems: ['Zoom', 'ZoomIn', 'ZoomOut', 'Pan', 'Reset'],
            showToolbar: true,
            toolbarPosition: 'TopRight',
          }}
          margin={{ left: 15, right: 15, top: 15, bottom: 15 }}
        >
          <Inject services={[ScatterSeries, Legend, Tooltip, Zoom]} />
          <SeriesCollectionDirective>
            {seriesData.map((series, index) => (
              <SeriesDirective
                key={index}
                dataSource={series.dataSource}
                xName="x"
                yName="y"
                name={series.name || `Series ${index + 1}`}
                type="Scatter"
                marker={{
                  visible: true,
                  height: 10,
                  width: 10,
                  shape: 'Circle',
                  fill: '#00b7c3',
                }}
              />
            ))}
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  // Render column chart
  const renderColumnChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <FiBarChart2 className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No chart data</p>
          <p className="text-gray-400 text-sm">Select variables and click "Generate Chart" to visualize data</p>
        </div>
      );
    }

    // Transform the data for bar chart
    const seriesData = transformForBarChart(chartData);

    if (!seriesData || seriesData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <FiBarChart2 className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No valid data points</p>
          <p className="text-gray-400 text-sm">The selected variables don't have any valid data points</p>
        </div>
      );
    }

    // Calculate the maximum value for the y-axis for each series individually
    let maxYValue = 0;
    seriesData.forEach((series) => {
    // Find max value in this series
      const seriesMax = Math.max(...series.dataSource.map((point) => point.y));
      // Update overall max if this series has a higher value
      maxYValue = Math.max(maxYValue, seriesMax);
    });

    // Add generous padding to the max value (20%)
    maxYValue = Math.ceil(maxYValue * 1.2);

    return (
      <div className="chart-container">
        <ChartComponent
          id="column-chart"
          height="100%"
          width="100%"
          primaryXAxis={{
            valueType: 'DateTime',
            labelFormat: 'dd MMM yyyy',
            majorGridLines: { width: 0 },
            intervalType: 'Months',
            edgeLabelPlacement: 'Shift',
            labelStyle: { size: '14px' },
            skeleton: 'MMM',
            intervalType: 'Months',
            interval: 1,
            minimum: new Date(new Date(Math.min(...seriesData[0].dataSource.map((p) => new Date(p.x)))).getFullYear(), new Date(Math.min(...seriesData[0].dataSource.map((p) => new Date(p.x)))).getMonth() - 1, 1),
            maximum: new Date(new Date(Math.max(...seriesData[0].dataSource.map((p) => new Date(p.x)))).getFullYear(), new Date(Math.max(...seriesData[0].dataSource.map((p) => new Date(p.x)))).getMonth() + 1, 0),
          }}
          primaryYAxis={{
            minimum: 0,
            maximum: maxYValue,
            interval: Math.ceil(maxYValue / 5),
            majorGridLines: { width: 1 },
            majorTickLines: { width: 0 },
            lineStyle: { width: 0 },
            labelStyle: { size: '14px' },
            title: 'Primary Axis',
            titleStyle: { fontWeight: '600', size: '14px' },
          }}
        // Add secondary Y-axis for column chart as well
          axes={useDualAxis ? [{
            name: 'secondaryAxis',
            opposedPosition: true,
            minimum: 0,
            maximum: maxYValue,
            interval: Math.ceil(maxYValue / 5),
            labelFormat: '{value}',
            title: 'Secondary Axis',
            titleStyle: { fontWeight: '600', size: '14px' },
            majorGridLines: { width: 0 },
            lineStyle: { width: 1 },
            majorTickLines: { width: 1 },
          }] : []}
          chartArea={{ border: { width: 0 } }}
          tooltip={{
            enable: true }}
          title={chartTitle}
          legendSettings={{ visible: true }}
          zoomSettings={{
            enableMouseWheelZooming: true,
            enablePinchZooming: true,
            enableSelectionZooming: true,
            enableScrollbar: true,
            enablePan: true,
            mode: 'X',
            toolbarItems: ['Zoom', 'ZoomIn', 'ZoomOut', 'Pan', 'Reset'],
            showToolbar: true,
            toolbarPosition: 'TopRight',
          }}
          margin={{ left: 15, right: 15, top: 15, bottom: 15 }}
        >
          <Inject services={[ColumnSeries, DateTime, Legend, Tooltip, Category, DataLabel, Zoom]} />
          <SeriesCollectionDirective>
            {seriesData.map((series, index) => {
            // Determine if this series should use the secondary axis
              const useSecondary = useDualAxis && index >= Math.ceil(seriesData.length / 2);

              return (
                <SeriesDirective
                  key={index}
                  dataSource={series.dataSource}
                  xName="x"
                  yName="y"
                  name={series.name}
                  type="Column"
                  width={2}
                  opacity={0.8}
                  fill={series.fill || chartColorPalette[index % chartColorPalette.length]}
                // Set yAxisName for secondary axis series
                  yAxisName={useSecondary ? 'secondaryAxis' : null}
                />
              );
            })}
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  // Render stacked chart
  const renderStackedChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <MdStackedBarChart className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No chart data</p>
          <p className="text-gray-400 text-sm">Select variables and click "Generate Chart" to visualize data</p>
        </div>
      );
    }

    // Transform the data for stacked chart
    const seriesData = transformForStackedChart(chartData);

    if (!seriesData || seriesData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <MdStackedBarChart className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No valid data points</p>
          <p className="text-gray-400 text-sm">The selected variables don't have any valid data points</p>
        </div>
      );
    }

    // Calculate cumulative values for each x position
    const cumulativeValues = {};
    seriesData.forEach((series) => {
      series.dataSource.forEach((point) => {
        const xKey = point.x.toString();
        if (!cumulativeValues[xKey]) {
          cumulativeValues[xKey] = 0;
        }
        cumulativeValues[xKey] += point.y;
      });
    });

    // Find the maximum cumulative value for the y-axis
    const maxYValue = Math.max(...Object.values(cumulativeValues));

    // Add padding to the max value
    const yMax = Math.ceil(maxYValue * 1.1);

    return (
      <div className="chart-container">
        <ChartComponent
          id="stacked-chart"
          height="100%"
          width="100%"
          primaryXAxis={{
            valueType: 'DateTime',
            labelFormat: 'dd MMM yyyy',
            majorGridLines: { width: 0 },
            intervalType: 'Months',
            edgeLabelPlacement: 'Shift',
            labelStyle: { size: '14px' },
            skeleton: 'MMM',
            intervalType: 'Months',
            interval: 1,
            minimum: new Date(new Date(Math.min(...Object.keys(cumulativeValues).map((x) => new Date(x)))).getFullYear(), new Date(Math.min(...Object.keys(cumulativeValues).map((x) => new Date(x)))).getMonth() - 1, 1),
            maximum: new Date(new Date(Math.max(...Object.keys(cumulativeValues).map((x) => new Date(x)))).getFullYear(), new Date(Math.max(...Object.keys(cumulativeValues).map((x) => new Date(x)))).getMonth() + 1, 0),
          }}
          primaryYAxis={{
            minimum: 0,
            maximum: yMax,
            interval: Math.ceil(yMax / 5),
            majorGridLines: { width: 1 },
            majorTickLines: { width: 0 },
            lineStyle: { width: 0 },
            labelStyle: { size: '14px' },
          }}
          chartArea={{ border: { width: 0 } }}
          tooltip={{
            enable: true }}
          title={chartTitle}
          legendSettings={{ visible: true }}
        // Add zoom settings
          zoomSettings={{
            enableMouseWheelZooming: true,
            enablePinchZooming: true,
            enableSelectionZooming: true,
            enableScrollbar: true,
            enablePan: true,
            mode: 'X',
            toolbarItems: ['Zoom', 'ZoomIn', 'ZoomOut', 'Pan', 'Reset'],
            showToolbar: true,
            toolbarPosition: 'TopRight',
          }}
          margin={{ left: 15, right: 15, top: 15, bottom: 15 }}
          enableSideBySidePlacement={false}
        >
          <Inject services={[StackingColumnSeries, DateTime, Legend, Tooltip, Category, DataLabel, Zoom]} />
          <SeriesCollectionDirective>
            {seriesData.map((series, index) => (
              <SeriesDirective
                key={index}
                dataSource={series.dataSource}
                xName="x"
                yName="y"
                name={series.name}
                type="StackingColumn"
                fill={series.fill || chartColorPalette[index % chartColorPalette.length]}
                cornerRadius={{ topLeft: 0, topRight: 0 }}
                marker={{ visible: false }}
              />
            ))}
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  // Render correlation matrix
  const renderCorrelationMatrix = () => {
    if (!correlationData) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
          <FiGrid className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No correlation data</p>
          <p className="text-gray-400 text-sm">Click "Calculate Correlation" to generate a correlation matrix</p>
        </div>
      );
    }

    const variables = Object.keys(correlationData);

    // Custom cell rendering with coloring based on correlation value
    const cellRender = (args) => {
      const value = parseFloat(args.value);
      let colorClass = 'bg-gray-100';

      if (value === 1) {
        colorClass = 'bg-blue-200'; // Self-correlation
      } else if (value > 0.7) {
        colorClass = 'bg-green-600 text-white'; // Strong positive
      } else if (value > 0.3) {
        colorClass = 'bg-green-400'; // Moderate positive
      } else if (value > 0) {
        colorClass = 'bg-green-200'; // Weak positive
      } else if (value > -0.3) {
        colorClass = 'bg-red-200'; // Weak negative
      } else if (value > -0.7) {
        colorClass = 'bg-red-400'; // Moderate negative
      } else {
        colorClass = 'bg-red-600 text-white'; // Strong negative
      }

      return (
        <div className={`w-full h-full flex items-center justify-center ${colorClass}`}>
          {value.toFixed(2)}
        </div>
      );
    };

    // Create a manual table for the correlation matrix
    return (
      <div className="overflow-x-auto">
        <h3 className="text-center font-semibold text-xl mb-2">Correlation Matrix</h3>
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border bg-gray-50" />
              {variables.map((variable) => (
                <th key={variable} className="py-2 px-4 border bg-gray-50 font-medium text-sm">
                  {variable}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map((row) => (
              <tr key={row}>
                <th className="py-2 px-4 border bg-gray-50 font-medium text-sm text-left">
                  {row}
                </th>
                {variables.map((col) => {
                  const value = correlationData[row][col];
                  return (
                    <td key={`${row}-${col}`} className="py-2 px-4 border text-center">
                      {cellRender({ value })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <Header category="Data Management" title=" Variable Charts" />

      <div className="flex flex-wrap gap-2 mb-4">
        <ButtonComponent
          cssClass={`e-info ${chartType === ChartTypes.LINE ? 'e-active' : ''}`}
          style={{ backgroundColor: chartType === ChartTypes.LINE ? currentColor : currentColor, borderColor: currentColor }}
          onClick={() => setChartType(ChartTypes.LINE)}
        >
          <div className="flex items-center gap-1">
            <FiTrendingUp className="mr-1" />
            Line Chart
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass={`e-info ${chartType === ChartTypes.SCATTER ? 'e-active' : ''}`}
          style={{ backgroundColor: chartType === ChartTypes.SCATTER ? currentColor : currentColor, borderColor: currentColor }}
          onClick={() => setChartType(ChartTypes.SCATTER)}
        >
          <div className="flex items-center gap-1">
            <AiOutlineDotChart className="mr-1" />
            Scatter Plot
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass={`e-info ${chartType === ChartTypes.COLUMN ? 'e-active' : ''}`}
          style={{ backgroundColor: chartType === ChartTypes.COLUMN ? currentColor : currentColor, borderColor: currentColor }}
          onClick={() => setChartType(ChartTypes.COLUMN)}
        >
          <div className="flex items-center gap-1">
            <FiBarChart2 className="mr-1" />
            Column Chart
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass={`e-info ${chartType === ChartTypes.STACKED ? 'e-active' : ''}`}
          style={{ backgroundColor: chartType === ChartTypes.STACKED ? currentColor : currentColor, borderColor: currentColor }}
          onClick={() => setChartType(ChartTypes.STACKED)}
        >
          <div className="flex items-center gap-1">
            <MdStackedBarChart className="mr-1" />
            Stacked Chart
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass={`e-info ${chartType === ChartTypes.CORRELATION ? 'e-active' : ''}`}
          style={{ backgroundColor: chartType === ChartTypes.CORRELATION ? currentColor : currentColor, borderColor: currentColor }}
          onClick={() => setChartType(ChartTypes.CORRELATION)}
        >
          <div className="flex items-center gap-1">
            <FiGrid className="mr-1" />
            Correlation Matrix
          </div>
        </ButtonComponent>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        {/* Left Panel - Variable Selection */}
        <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Variables</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search variables..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600"
                checked={filteredVariables.length > 0 && selectedVariables.length === filteredVariables.length}
                onChange={handleSelectAll}
                id="select-all-vars"
              />
              <label htmlFor="select-all-vars" className="ml-2 text-sm font-medium">
                Select All
              </label>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
              {filteredVariables.length === 0 ? (
                <div className="p-3 text-center text-gray-500">No variables found</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredVariables.map((variable) => (
                    <div key={variable.name} className="p-2 hover:bg-gray-100 flex items-center">
                      <input
                        type="checkbox"
                        id={`var-${variable.name}`}
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={selectedVariables.includes(variable.name)}
                        onChange={() => handleCheckboxClick(variable.name)}
                      />
                      <label htmlFor={`var-${variable.name}`} className="ml-2 text-sm cursor-pointer flex-1 truncate">
                        {variable.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Options</h3>

            <div className="mb-3">
              <label htmlFor="model-select" className="block text-sm font-medium mb-1">Select Model (Optional)</label>
              <DropDownListComponent
                id="model-select"
                dataSource={[{ text: 'No Model (Raw Data)', value: '' }, ...models.map((m) => ({ text: m.name, value: m.name }))]}
                fields={{ text: 'text', value: 'value' }}
                value={selectedModel}
                change={(e) => setSelectedModel(e.value)}
                placeholder="Select model (optional)"
                style={{ width: '100%' }}
              />
            </div>

            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="include-kpi"
                className="form-checkbox h-4 w-4 text-blue-600"
                checked={includeKPI}
                onChange={() => setIncludeKPI(!includeKPI)}
              />
              <label htmlFor="include-kpi" className="ml-2 text-sm font-medium">
                Include KPI
              </label>
            </div>

            {includeKPI && (
              <div className="mb-3">
                <label htmlFor="kpi-select" className="block text-sm font-medium mb-1">Select KPI</label>
                <DropDownListComponent
                  id="kpi-select"
                  dataSource={variables.map((v) => ({ text: v.name, value: v.name }))}
                  fields={{ text: 'text', value: 'value' }}
                  value={kpiVariable}
                  change={(e) => setKpiVariable(e.value)}
                  placeholder="Select KPI variable"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="dual-axis"
                className="form-checkbox h-4 w-4 text-blue-600"
                checked={useDualAxis}
                onChange={() => setUseDualAxis(!useDualAxis)}
              />
              <label htmlFor="dual-axis" className="ml-2 text-sm font-medium">
                Use Dual Y-Axis
              </label>
            </div>
          </div>

          <div className="mt-4">
            <ButtonComponent
              cssClass="e-success"
              style={{ backgroundColor: currentColor, borderColor: currentColor, width: '100%' }}
              onClick={chartType === ChartTypes.CORRELATION ? calculateCorrelation : fetchChartData}
              disabled={selectedVariables.length === 0}
            >
              {chartType === ChartTypes.CORRELATION ? 'Calculate Correlation' : 'Generate Chart'}
            </ButtonComponent>
          </div>
        </div>

        {/* Right Panel - Chart Display */}
        <div
          ref={chartContainerRef}
          className="md:col-span-9 bg-white p-0 rounded-lg shadow-sm relative w-full"
          style={{ minHeight: '600px', width: '100%', margin: 0, padding: 0 }}
        >
          <div className="mb-2 px-4 pt-4">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder="Chart Title"
            />
          </div>

          <div className="h-full w-full" style={{ width: '100%' }}>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;
