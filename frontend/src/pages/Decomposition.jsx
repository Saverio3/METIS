import React, { useState, useEffect } from 'react';
import {
  DropDownListComponent,
} from '@syncfusion/ej2-react-dropdowns';
import {
  ButtonComponent,
} from '@syncfusion/ej2-react-buttons';
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  Legend,
  Category,
  StackingColumnSeries,
  LineSeries,
  Tooltip,
  DataLabel,
  DateTime,
  ColumnSeries,
  Zoom,
} from '@syncfusion/ej2-react-charts';
import { FiBarChart2, FiActivity, FiDownload, FiFilter } from 'react-icons/fi';
import { Header } from '../components';
import ErrorBoundary from '../components/ErrorBoundary';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import '../chartStyles.css';

const Decomposition = () => {
  const { currentColor } = useStateContext();

  // States for models
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelDetails, setModelDetails] = useState(null);

  // States for decomposition data
  const [decompositionData, setDecompositionData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [stackedData, setStackedData] = useState([]);
  const [contributionGroups, setContributionGroups] = useState([]);

  // New states for group decomposition
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupDecompositionData, setGroupDecompositionData] = useState(null);
  const [groupVariables, setGroupVariables] = useState([]);
  const [groupTimeSeriesData, setGroupTimeSeriesData] = useState([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showGroupChart, setShowGroupChart] = useState(false);
  const [error, setError] = useState(null);
  const [groupError, setGroupError] = useState(null);

  // Load models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Fetch models
  const fetchModels = async () => {
    try {
      const response = await apiService.listModels();
      if (response.success) {
        setModels(response.models);
        if (response.activeModel) {
          setSelectedModel(response.activeModel);
          fetchModelDetails(response.activeModel);
        }
      } else {
        setError('Failed to load models');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Error loading models');
    }
  };

  // Fetch model details
  const fetchModelDetails = async (modelName) => {
    try {
      if (!modelName) return;

      setLoading(true);

      // Get model variables to determine KPI and features
      const response = await apiService.getModelVariables(modelName);

      if (response.success) {
        setModelDetails({
          name: modelName,
          variables: response.variables,
          kpi: response.variables.find((v) => v.type === 'KPI')?.name || '',
        });
      } else {
        setError('Failed to load model details');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching model details:', error);
      setError('Error loading model details');
      setLoading(false);
    }
  };

  // Handle model selection change
  const handleModelChange = (e) => {
    const modelName = e.value;
    setSelectedModel(modelName);
    setShowCharts(false);
    setShowGroupChart(false);
    setDecompositionData(null);
    setGroupDecompositionData(null);
    setSelectedGroup('');
    fetchModelDetails(modelName);
  };

  // Handle group selection change
  const handleGroupChange = (e) => {
    setSelectedGroup(e.value);
    setShowGroupChart(false);
    setGroupDecompositionData(null);
  };

  // Run decomposition
  const runDecomposition = async () => {
    if (!selectedModel) {
      setError('Please select a model first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the API to run decomposition
      const response = await apiService.runDecomposition(selectedModel);

      if (response.success) {
        setDecompositionData(response.data);

        // Process data for charts
        processChartData(response.data);

        setShowCharts(true);
      } else {
        setError(response.error || 'Failed to run decomposition');
      }
    } catch (error) {
      console.error('Error running decomposition:', error);
      setError('Error running decomposition');
    } finally {
      setLoading(false);
    }
  };

  // Run group decomposition
  const runGroupDecomposition = async () => {
    if (!selectedModel) {
      setGroupError('Please select a model first');
      return;
    }

    if (!selectedGroup) {
      setGroupError('Please select a group to decompose');
      return;
    }

    setGroupLoading(true);
    setGroupError(null);

    try {
      // Call the API to run group decomposition
      const response = await apiService.runGroupDecomposition(selectedModel, selectedGroup);

      if (response.success) {
        setGroupDecompositionData(response.data);

        // Process data for group chart
        processGroupChartData(response.data);

        setShowGroupChart(true);
      } else {
        setGroupError(response.error || 'Failed to run group decomposition');
      }
    } catch (error) {
      console.error('Error running group decomposition:', error);
      setGroupError('Error running group decomposition');
    } finally {
      setGroupLoading(false);
    }
  };

  // Process data for charts
  const processChartData = (data) => {
    // Process time series data for line chart
    const timeSeriesData = processTimeSeriesData(data);
    setTimeSeriesData(timeSeriesData);

    // Process stacked data for stacked bar chart
    const { stackedData, groups } = processStackedData(data);
    setStackedData(stackedData);
    setContributionGroups(groups);
  };

  // Process data for group decomposition chart
  const processGroupChartData = (data) => {
    const dates = data.dates || [];
    const variables = data.variables || [];
    const contributions = data.contributions || {};
    const total = data.total || [];

    setGroupVariables(variables);

    // Create time series data for group chart
    const timeSeriesData = dates.map((date, index) => {
      const dataPoint = { x: new Date(date) };

      // Add each variable's contribution
      variables.forEach((variable) => {
        dataPoint[variable] = contributions[variable][index];
      });

      // Add the total contribution
      dataPoint.total = total[index];

      return dataPoint;
    });

    setGroupTimeSeriesData(timeSeriesData);
  };

  // Process time series data for line chart
  const processTimeSeriesData = (data) => {
    const dates = data.dates || [];
    const actual = data.actual || [];
    const predicted = data.predicted || [];

    return dates.map((date, index) => ({
      x: new Date(date),
      actual: actual[index],
      predicted: predicted[index],
    }));
  };

  // Process stacked data for stacked bar chart
  const processStackedData = (data) => {
    const dates = data.dates || [];
    const contributions = data.contributions || {};

    // Get unique contribution groups
    const groups = Object.keys(contributions).filter((group) => group !== 'actual' && group !== 'predicted');

    // Create stacked data
    const stackedData = dates.map((date, index) => {
      const dataPoint = { x: new Date(date) };

      // Add each group's contribution
      groups.forEach((group) => {
        dataPoint[group] = contributions[group][index];
      });

      return dataPoint;
    });

    return { stackedData, groups };
  };

  // Get color for a contribution group
  const getGroupColor = (group) => {
    // Standard color mapping for common groups
    const colorMap = {
      Base: '#b3b3b3',
      Pricing: '#f44336',
      Price: '#f44336',
      Promotions: '#673ab7',
      Promotion: '#673ab7',
      Promo: '#673ab7',
      Offer: '#009688',
      Offers: '#009688',
      Media: '#03a9f4',
      Competition: '#000000',
      Competitor: '#000000',
      Weather: '#b97407',
      Seasonality: '#ffeb3b',
      Distribution: '#f48fb1',
      Other: '#666666',
    };

    // Return mapped color or fallback color
    return colorMap[group] || `#${((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')}`;
  };

  // Get color for a variable within a group
  const getVariableColor = (variable, index) => {
    // Create a lighter/darker variation of the group color
    const baseColor = getGroupColor(selectedGroup);

    // Set of coordinated colors for variables within the same group
    const colorSet = [
      baseColor,
      '#4287f5', // Blue
      '#42c5f5', // Light blue
      '#41f5c0', // Teal
      '#41f569', // Green
      '#b0f541', // Lime
      '#f5da41', // Yellow
      '#f59541', // Orange
      '#f55641', // Red
      '#f541b9', // Pink
      '#9741f5', // Purple
    ];

    return colorSet[index % colorSet.length];
  };

  // NEW CODE FOR COLOURS
  // Add a useEffect to load group colors when the model changes
  useEffect(() => {
    if (selectedModel) {
      fetchGroupColors(selectedModel);
    }
  }, [selectedModel]);

  // Add state for group colors
  const [groupColors, setGroupColors] = useState({});

  // Add function to fetch group colors
  const fetchGroupColors = async (modelName) => {
    try {
      const response = await apiService.getGroupColors(modelName);
      if (response.success) {
        setGroupColors(response.colors || {});
      }
    } catch (error) {
      console.error('Error fetching group colors:', error);
    }
  };

  const getDefaultGroupColor = (group) => {
    const defaultColors = {
      Base: '#CCCCCC', // Gray
      Media: '#4682B4', // Steel Blue
      Price: '#FF0000', // Red
      Promotion: '#FFA500', // Orange
      Seasonality: '#9370DB', // Medium Purple
      Weather: '#8B4513', // Brown
      Competition: '#000000', // Black
      Other: '#808080', // Dark Gray
    };

    return defaultColors[group] || `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  };

  // Download decomposition data
  const handleDownloadData = () => {
    if (!decompositionData) return;

    try {
      // Convert decomposition data to CSV
      const dates = decompositionData.dates || [];
      const actual = decompositionData.actual || [];
      const predicted = decompositionData.predicted || [];
      const contributions = decompositionData.contributions || {};

      // Create CSV header
      const csv = ['Date,Actual,Predicted'];

      // Add each contribution group
      Object.keys(contributions).forEach((group) => {
        if (group !== 'actual' && group !== 'predicted') {
          csv[0] += `,${group}`;
        }
      });

      // Add data rows
      dates.forEach((date, index) => {
        let row = `${date},${actual[index]},${predicted[index]}`;

        // Add each contribution group's value
        Object.keys(contributions).forEach((group) => {
          if (group !== 'actual' && group !== 'predicted') {
            row += `,${contributions[group][index]}`;
          }
        });

        csv.push(row);
      });

      // Create download link
      const csvContent = csv.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedModel}_decomposition.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading data:', error);
      setError('Error downloading data');
    }
  };

  // Download group decomposition data
  const handleDownloadGroupData = () => {
    if (!groupDecompositionData) return;

    try {
      // Convert group decomposition data to CSV
      const dates = groupDecompositionData.dates || [];
      const variables = groupDecompositionData.variables || [];
      const contributions = groupDecompositionData.contributions || {};
      const total = groupDecompositionData.total || [];

      // Create CSV header
      const csv = ['Date'];

      // Add each variable
      variables.forEach((variable) => {
        csv[0] += `,${variable}`;
      });

      // Add total
      csv[0] += ',Total';

      // Add data rows
      dates.forEach((date, index) => {
        let row = `${date}`;

        // Add each variable's value
        variables.forEach((variable) => {
          row += `,${contributions[variable][index]}`;
        });

        // Add total
        row += `,${total[index]}`;

        csv.push(row);
      });

      // Create download link
      const csvContent = csv.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedModel}_${selectedGroup}_decomposition.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading group data:', error);
      setGroupError('Error downloading group data');
    }
  };

  // Render the line chart
  const renderLineChart = () => {
    if (!timeSeriesData || timeSeriesData.length === 0) return null;

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
          }}
          primaryYAxis={{
            labelFormat: '{value}',
            title: modelDetails?.kpi || 'Value',
            titleStyle: { fontWeight: '600' },
            majorGridLines: { width: 1 },
            minorGridLines: { width: 0 },
            lineStyle: { width: 0 },
            majorTickLines: { width: 0 },
          }}
          tooltip={{ enable: true }}
          legendSettings={{ visible: true, position: 'Top' }}
          title="Actual vs Modeled"
          titleStyle={{ fontWeight: 'bold', textAlignment: 'Center', size: '16px' }}
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
          chartArea={{ border: { width: 0 } }}
        >
          <Inject services={[LineSeries, DateTime, Legend, Tooltip, Zoom]} />
          <SeriesCollectionDirective>
            <SeriesDirective
              dataSource={timeSeriesData}
              xName="x"
              yName="actual"
              name="Actual"
              type="Line"
              width={2}
              marker={{ visible: true }}
              legendShape="Circle"
              fill="#000000"
            />
            <SeriesDirective
              dataSource={timeSeriesData}
              xName="x"
              yName="predicted"
              name="Modeled"
              type="Line"
              width={2}
              marker={{ visible: true }}
              legendShape="Circle"
              fill="#FF0000"
              dashArray="5,5"
            />
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  // Render the stacked bar chart
  const renderStackedChart = () => {
    if (!stackedData || stackedData.length === 0 || !contributionGroups || contributionGroups.length === 0) {
      return null;
    }

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
            interval: 1,
            edgeLabelPlacement: 'Shift',
            skeleton: 'MMM',
            minimum: stackedData.length > 0 ? new Date(new Date(stackedData[0].x).getFullYear(), new Date(stackedData[0].x).getMonth(), 1) : null,
            maximum: stackedData.length > 0 ? new Date(new Date(stackedData[stackedData.length - 1].x).getFullYear(), new Date(stackedData[stackedData.length - 1].x).getMonth(), 13) : null,
          }}
          primaryYAxis={{
            labelFormat: '{value}',
            title: modelDetails?.kpi || 'Value',
            titleStyle: { fontWeight: '600' },
            majorGridLines: { width: 1 },
            minorGridLines: { width: 0 },
            lineStyle: { width: 0 },
            majorTickLines: { width: 0 },
          }}
          tooltip={{ enable: true }}
          legendSettings={{ visible: true, position: 'Bottom' }}
          title="Contribution Breakdown"
          titleStyle={{ fontWeight: 'bold', textAlignment: 'Center', size: '16px' }}
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
          chartArea={{ border: { width: 0 } }}
        >
          <Inject services={[StackingColumnSeries, DateTime, Legend, Tooltip, DataLabel, Zoom]} />
          <SeriesCollectionDirective>
            {contributionGroups.map((group, index) => (
              <SeriesDirective
                key={index}
                dataSource={stackedData}
                xName="x"
                yName={group}
                name={group}
                type="StackingColumn"
                legendShape="Rectangle"
                fill={groupColors[group] || getDefaultGroupColor(group)} // Use custom or default color
                opacity={1}
                border={{ width: 0.5, color: '#ffffff' }}
                cornerRadius={{ topLeft: 0, topRight: 0 }}
              />
            ))}
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  // Render the group decomposition chart
  const renderGroupChart = () => {
    if (!groupTimeSeriesData || groupTimeSeriesData.length === 0 || !groupVariables || groupVariables.length === 0) {
      return null;
    }

    return (
      <div className="chart-container">
        <ChartComponent
          id="group-chart"
          height="100%"
          width="100%"
          primaryXAxis={{
            valueType: 'DateTime',
            labelFormat: 'dd MMM yyyy',
            majorGridLines: { width: 0 },
            intervalType: 'Months',
            interval: 1,
            edgeLabelPlacement: 'Shift',
            skeleton: 'MMM',
            minimum: groupTimeSeriesData.length > 0 ? new Date(new Date(groupTimeSeriesData[0].x).getFullYear(), new Date(groupTimeSeriesData[0].x).getMonth(), 1) : null,
            maximum: groupTimeSeriesData.length > 0 ? new Date(new Date(groupTimeSeriesData[groupTimeSeriesData.length - 1].x).getFullYear(), new Date(groupTimeSeriesData[groupTimeSeriesData.length - 1].x).getMonth(), 13) : null,
          }}
          primaryYAxis={{
            labelFormat: '{value}',
            title: modelDetails?.kpi || 'Value',
            titleStyle: { fontWeight: '600' },
            majorGridLines: { width: 1 },
            minorGridLines: { width: 0 },
            lineStyle: { width: 0 },
            majorTickLines: { width: 0 },
          }}
          tooltip={{ enable: true }}
          legendSettings={{ visible: true, position: 'Bottom' }}
          title={`${selectedGroup} Group Decomposition`}
          titleStyle={{ fontWeight: 'bold', textAlignment: 'Center', size: '16px' }}
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
          chartArea={{ border: { width: 0 } }}
        >
          <Inject services={[StackingColumnSeries, LineSeries, DateTime, Legend, Tooltip, DataLabel, Zoom]} />
          <SeriesCollectionDirective>
            {/* Change from ColumnSeries to StackingColumnSeries */}
            {groupVariables.map((variable, index) => (
              <SeriesDirective
                key={index}
                dataSource={groupTimeSeriesData}
                xName="x"
                yName={variable}
                name={variable}
                type="StackingColumn"
                legendShape="Rectangle"
                fill={getVariableColor(variable, index)}
                opacity={0.8}
                border={{ width: 0.5, color: '#ffffff' }}
                cornerRadius={{ topLeft: 0, topRight: 0 }}
              />
            ))}

            {/* Total line */}
            <SeriesDirective
              dataSource={groupTimeSeriesData}
              xName="x"
              yName="total"
              name="Total"
              type="Line"
              width={2}
              marker={{ visible: true }}
              legendShape="Circle"
              fill="#000000"
            />
          </SeriesCollectionDirective>
        </ChartComponent>
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <ErrorBoundary>
        <Header category="Analysis" title="Decomposition" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          {/* Model Selection Panel */}
          <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Model Selection</h3>

              <div className="mb-3">
                <label htmlFor="model-select" className="block text-sm font-medium mb-1">
                  Select a Model
                </label>
                <DropDownListComponent
                  id="model-select"
                  dataSource={models.map((m) => ({ text: m.name, value: m.name }))}
                  fields={{ text: 'text', value: 'value' }}
                  value={selectedModel}
                  change={handleModelChange}
                  placeholder="Select model"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {modelDetails && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Model Details</h3>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm"><span className="font-medium">KPI:</span> {modelDetails.kpi}</p>
                  <p className="text-sm mt-1"><span className="font-medium">Variables:</span> {modelDetails.variables?.length || 0}</p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <ButtonComponent
                cssClass="e-success"
                style={{
                  backgroundColor: currentColor,
                  borderColor: currentColor,
                  width: '100%',
                }}
                onClick={runDecomposition}
                disabled={!selectedModel || loading}
              >
                {loading ? 'Processing...' : 'Run Decomposition'}
              </ButtonComponent>
            </div>

            {decompositionData && (
              <div className="mt-4">
                <ButtonComponent
                  cssClass="e-outline e-info"
                  style={{
                    borderColor: currentColor,
                    color: currentColor,
                    width: '100%',
                  }}
                  onClick={handleDownloadData}
                  disabled={loading}
                >
                  <div className="flex items-center justify-center">
                    <FiDownload className="mr-2" />
                    Download Data
                  </div>
                </ButtonComponent>
              </div>
            )}

            {/* Group Decomposition Panel */}
            {showCharts && contributionGroups && contributionGroups.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Group Decomposition</h3>

                <div className="mb-3">
                  <label htmlFor="group-select" className="block text-sm font-medium mb-1">
                    Select a Group
                  </label>
                  <DropDownListComponent
                    id="group-select"
                    dataSource={contributionGroups.map((g) => ({ text: g, value: g }))}
                    fields={{ text: 'text', value: 'value' }}
                    value={selectedGroup}
                    change={handleGroupChange}
                    placeholder="Select group"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="mt-4">
                  <ButtonComponent
                    cssClass="e-success"
                    style={{
                      backgroundColor: currentColor,
                      borderColor: currentColor,
                      width: '100%',
                    }}
                    onClick={runGroupDecomposition}
                    disabled={!selectedGroup || groupLoading}
                  >
                    <div className="flex items-center justify-center">
                      <FiFilter className="mr-2" />
                      {groupLoading ? 'Processing...' : 'Run Group Decomposition'}
                    </div>
                  </ButtonComponent>
                </div>

                {groupDecompositionData && (
                  <div className="mt-4">
                    <ButtonComponent
                      cssClass="e-outline e-info"
                      style={{
                        borderColor: currentColor,
                        color: currentColor,
                        width: '100%',
                      }}
                      onClick={handleDownloadGroupData}
                      disabled={groupLoading}
                    >
                      <div className="flex items-center justify-center">
                        <FiDownload className="mr-2" />
                        Download Group Data
                      </div>
                    </ButtonComponent>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Charts Panel */}
          <div className="md:col-span-9 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
                  style={{ borderColor: currentColor }}
                />
                <p className="ml-2">Processing decomposition...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-lg text-red-800 flex items-start">
                <FiActivity className="mt-1 mr-2" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            ) : !showCharts ? (
              <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
                <FiBarChart2 className="text-5xl mb-3 text-gray-400" />
                <p className="text-gray-500 mb-2">No decomposition data</p>
                <p className="text-gray-400 text-sm">Select a model and click "Run Decomposition" to analyze contributions</p>
              </div>
            ) : (
              <div className="space-y-8">
                {renderLineChart()}
                {renderStackedChart()}

                {/* Group Decomposition Chart */}
                {groupLoading ? (
                  <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <div
                      className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
                      style={{ borderColor: currentColor }}
                    />
                    <p className="ml-2">Processing group decomposition...</p>
                  </div>
                ) : groupError ? (
                  <div className="bg-red-50 p-4 rounded-lg text-red-800 flex items-start">
                    <FiActivity className="mt-1 mr-2" />
                    <div>
                      <p className="font-medium">Group Decomposition Error</p>
                      <p>{groupError}</p>
                    </div>
                  </div>
                ) : showGroupChart ? (
                  renderGroupChart()
                ) : selectedGroup ? (
                  <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
                    <FiFilter className="text-5xl mb-3 text-gray-400" />
                    <p className="text-gray-500 mb-2">No group decomposition data</p>
                    <p className="text-gray-400 text-sm">
                      Click "Run Group Decomposition" to analyze variables in the "{selectedGroup}" group
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default Decomposition;
