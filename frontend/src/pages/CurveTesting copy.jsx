import React, { useState, useEffect, useRef } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Page,
  Sort,
  Filter,
  Toolbar,
  Search,
} from '@syncfusion/ej2-react-grids';
import {
  DropDownListComponent,
} from '@syncfusion/ej2-react-dropdowns';
import {
  ButtonComponent,

  RadioButtonComponent } from '@syncfusion/ej2-react-buttons';

import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject as ChartInject,
  Legend,
  Category,
  Tooltip,
  DataLabel,
  LineSeries,
} from '@syncfusion/ej2-react-charts';
import { FiSettings, FiRefreshCw, FiBarChart2, FiPlus, FiDatabase } from 'react-icons/fi';
import { MdOutlineShowChart, MdOutlineTimeline } from 'react-icons/md';
import { AiOutlineCurve } from 'react-icons/ai';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

const CurveTesting = () => {
  const { currentColor } = useStateContext();

  // States for models and variables
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [variables, setVariables] = useState([]);
  const [availableVariables, setAvailableVariables] = useState([]);
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [curveType, setCurveType] = useState('ICP');

  // States for curve test results
  const [curveResults, setCurveResults] = useState([]);
  const [selectedCurves, setSelectedCurves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testPerformed, setTestPerformed] = useState(false);

  // State for chart data
  const [chartData, setChartData] = useState([]);
  const [showChart, setShowChart] = useState(false);

  // Reference for the grid component
  const gridRef = useRef(null);

  // Fetch models and variables on component mount
  useEffect(() => {
    fetchModels();
    fetchVariables();
  }, []);

  // Fetch all available models
  const fetchModels = async () => {
    try {
      const response = await apiService.listModels();
      if (response.success) {
        setModels(response.models);
        if (response.activeModel && response.models.length > 0) {
          const activeModel = response.models.find((m) => m.name === response.activeModel);
          if (activeModel) {
            setSelectedModel(activeModel.name);
          }
        }
      } else {
        console.error('Failed to load models:', response.error);
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

        // Filter variables for testing (typically numeric, not already in model)
        const testableVars = response.variables.filter((v) => v.type === 'NUMERIC' && !v.isTransformed);

        setAvailableVariables(testableVars);
      } else {
        console.error('Failed to load variables:', response.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching variables:', error);
      setLoading(false);
    }
  };

  // Handle model selection change
  const handleModelChange = (e) => {
    setSelectedModel(e.value);
    // Reset curve results and selected curves
    setCurveResults([]);
    setSelectedCurves([]);
    setTestPerformed(false);
    setShowChart(false);
  };

  useEffect(() => {
    if (testPerformed && !loading && curveResults.length > 0) {
    // Add event listeners for sorting after the component updates with results
      const headers = document.querySelectorAll('.sortable-header');
      headers.forEach((header) => {
        header.addEventListener('click', () => handleSort(header.dataset.column));
      });

      return () => {
      // Cleanup event listeners
        headers.forEach((header) => {
          header.removeEventListener('click', () => handleSort(header.dataset.column));
        });
      };
    }
  }, [testPerformed, loading, curveResults.length]);

  // Add this function to handle sorting
  const handleSort = (column) => {
    const headers = document.querySelectorAll('.sortable-header');
    let sortDirection = 'asc';

    // Check if we're already sorting by this column
    const header = document.querySelector(`[data-column="${column}"]`);
    if (header.classList.contains('sort-asc')) {
      sortDirection = 'desc';
      header.classList.remove('sort-asc');
      header.classList.add('sort-desc');
    } else if (header.classList.contains('sort-desc')) {
      sortDirection = 'asc';
      header.classList.remove('sort-desc');
      header.classList.add('sort-asc');
    } else {
    // Reset all headers
      headers.forEach((h) => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      header.classList.add('sort-asc');
    }

    // Sort the data
    const sorted = [...curveResults].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];

      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    // Update the results
    setCurveResults(sorted);
  };

  // Handle variable selection change
  const handleVariableChange = (e) => {
    setSelectedVariable(e.value);
    // Reset curve results and selected curves
    setCurveResults([]);
    setSelectedCurves([]);
    setTestPerformed(false);
    setShowChart(false);
  };

  // Handle curve type change
  const handleCurveTypeChange = (e) => {
    setCurveType(e.target.value);
    // Reset curve results and selected curves
    setCurveResults([]);
    setSelectedCurves([]);
    setTestPerformed(false);
    setShowChart(false);
  };

  // Test curves for the selected variable
  const handleTestCurves = async () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    if (!selectedVariable) {
      alert('Please select a variable to test');
      return;
    }

    try {
      setLoading(true);

      // Call API to test curves
      const response = await apiService.testCurves(
        selectedModel,
        selectedVariable,
        curveType,
      );

      if (response.success) {
        setCurveResults(response.results);
        setTestPerformed(true);
        setSelectedCurves([]);
        setShowChart(false);
      } else {
        alert(`Failed to test curves: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error testing curves:', error);
      setLoading(false);
      alert('Error testing curves');
    }
  };

  // Handle curve selection
  const handleCurveSelect = (curveId) => {
    setSelectedCurves((prev) => {
      if (prev.includes(curveId)) {
        return prev.filter((id) => id !== curveId);
      }
      return [...prev, curveId];
    });
  };

  // Generate chart from selected curves
  const handleGenerateChart = async () => {
    if (selectedCurves.length === 0) {
      alert('Please select at least one curve to visualize');
      return;
    }

    try {
      setLoading(true);

      // Call API to get curve data for visualization
      const response = await apiService.getCurveData(
        selectedModel,
        selectedVariable,
        curveType,
        selectedCurves.map((id) => curveResults[id]),
      );

      if (response.success) {
        setChartData(response.chartData);
        setShowChart(true);
      } else {
        alert(`Failed to generate chart: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error generating chart:', error);
      setLoading(false);
      alert('Error generating chart');
    }
  };

  // Function to create variables
  const handleCreateVariable = async () => {
    if (selectedCurves.length === 0) {
      alert('Please select at least one curve to create as a variable');
      return;
    }

    try {
      setLoading(true);

      // Call API to create curve variables
      const response = await apiService.createCurveVariables(
        selectedModel,
        selectedVariable,
        curveType,
        selectedCurves.map((id) => curveResults[id]),
      );

      if (response.success) {
        alert(`Successfully created ${response.createdVariables.length} curve variables`);
        // Refresh variables list
        fetchVariables();
      } else {
        alert(`Failed to create curve variables: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error creating curve variables:', error);
      setLoading(false);
      alert('Error creating curve variables');
    }
  };

  // Add selected curves to model
  const handleAddToModel = async () => {
    if (selectedCurves.length === 0) {
      alert('Please select at least one curve to add to the model');
      return;
    }

    try {
      setLoading(true);

      // Call API to add curves to model
      const response = await apiService.addCurvesToModel(
        selectedModel,
        selectedVariable,
        curveType,
        selectedCurves.map((id) => curveResults[id]),
      );

      if (response.success) {
        alert(`Successfully added ${response.addedCurves.length} curve variables to the model`);
      } else {
        alert(`Failed to add curves to model: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error adding curves to model:', error);
      setLoading(false);
      alert('Error adding curves to model');
    }
  };

  // Format cell value for the curve results grid
  const formatResultCell = (field, value) => {
    // Coefficient formatting
    if (field === 'coefficient') {
      const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
      return <span className={colorClass}>{value.toFixed(4)}</span>;
    }

    // T-stat formatting
    if (field === 'tStat') {
      let colorClass = '';
      const absValue = Math.abs(value);
      const isSignificant = absValue >= 1.96;
      const isPositive = value > 0;

      if (isSignificant) {
        colorClass = isPositive ? 'font-bold text-green-600' : 'font-bold text-red-600';
      } else {
        colorClass = isPositive ? 'text-green-600' : 'text-red-600';
      }

      return <span className={colorClass}>{value.toFixed(4)}</span>;
    }

    // R-squared increase formatting
    if (field === 'rSquaredIncrease') {
      const percentValue = value * 100;
      return <span>{percentValue.toFixed(4)}%</span>;
    }

    // Default formatting for numbers
    if (typeof value === 'number') {
      return value.toFixed(2);
    }

    // Default - return value as is
    return value;
  };

  // Render results grid
  const renderResultsGrid = () => {
    if (!testPerformed) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <MdOutlineShowChart className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No curve tests performed yet</p>
          <p className="text-gray-400 text-sm">
            Select a model and variable, then click "Test Curves" to see results
          </p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
            style={{ borderColor: currentColor }}
          />
          <p className="ml-2">Loading curve results...</p>
        </div>
      );
    }

    if (curveResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <MdOutlineShowChart className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No curve results available</p>
          <p className="text-gray-400 text-sm">
            Try testing with different parameters
          </p>
        </div>
      );
    }

    // Format data for the grid
    const formattedResults = curveResults.map((curve, index) => ({
      id: index,
      curveName: curve.curveName || `${curveType} ${index + 1}`,
      alpha: curve.alpha,
      beta: curve.beta,
      gamma: curve.gamma,
      coefficient: curve.coefficient,
      tStat: curve.tStat,
      rSquaredIncrease: curve.rSquaredIncrease,
      switchPoint: curve.switchPoint,
    }));

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200" id="curve-results-table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Select
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="curveName">
                Curve Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="alpha">
                Alpha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="beta">
                Beta
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="gamma">
                Gamma
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="coefficient">
                Coefficient
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="tStat">
                T-Stat
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="rSquaredIncrease">
                R² Increase
              </th>
              {curveType === 'ICP' && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-column="switchPoint">
                  Switch Point
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {formattedResults.map((curve) => (
              <tr key={curve.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600"
                    checked={selectedCurves.includes(curve.id)}
                    onChange={() => handleCurveSelect(curve.id)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{curve.curveName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{curve.alpha.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{curve.beta.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{curve.gamma.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatResultCell('coefficient', curve.coefficient)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatResultCell('tStat', curve.tStat)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatResultCell('rSquaredIncrease', curve.rSquaredIncrease)}
                </td>
                {curveType === 'ICP' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{curve.switchPoint?.toFixed(2) || 'N/A'}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          <div>
            <p className="text-sm text-gray-500">{curveResults.length} curves tested</p>
          </div>
          <div className="flex gap-2">
            <ButtonComponent
              cssClass="e-info"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={handleGenerateChart}
              disabled={selectedCurves.length === 0 || loading}
            >
              <div className="flex items-center gap-1">
                <MdOutlineTimeline className="mr-1" />
                View Curves
              </div>
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-warning"
              style={{ backgroundColor: '#ff9800', borderColor: '#ff9800' }}
              onClick={handleCreateVariable}
              disabled={selectedCurves.length === 0 || loading}
            >
              <div className="flex items-center gap-1">
                <FiDatabase className="mr-1" />
                Create Variable
              </div>
            </ButtonComponent>
          </div>
        </div>
        {/* Add JavaScript for sorting */}
        <style jsx>{`
      .sortable-header {
        cursor: pointer;
        position: relative;
      }
      .sortable-header:hover {
        background-color: #f1f1f1;
      }
      .sortable-header.sort-asc::after {
        content: '▲';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
      }
      .sortable-header.sort-desc::after {
        content: '▼';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
      }
    `}
        </style>
      </div>
    );
  };

  // Render curve chart
  const renderCurveChart = () => {
    if (!showChart || chartData.length === 0) {
      return null;
    }

    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Curve Visualization</h3>
        <div className="h-96">
          <ChartComponent
            id="curve-chart"
            primaryXAxis={{
              title: `Original ${selectedVariable} Value`,
              titleStyle: { size: '14px', fontWeight: '500' },
              labelStyle: { size: '12px' },
              majorGridLines: { width: 0 },
            }}
            primaryYAxis={{
              title: 'Transformed Value',
              titleStyle: { size: '14px', fontWeight: '500' },
              labelStyle: { size: '12px' },
              minimum: 0,
              maximum: 1.05,
              interval: 0.2,
            }}
            chartArea={{ border: { width: 0 } }}
            tooltip={{ enable: true }}
            title={`${curveType} Curve Transformations for ${selectedVariable}`}
            legendSettings={{ visible: true }}
            width="100%"
            height="100%"
          >
            <ChartInject services={[LineSeries, Legend, Tooltip, Category]} />
            <SeriesCollectionDirective>
              {chartData.map((curve, index) => (
                <SeriesDirective
                  key={index}
                  dataSource={curve.data}
                  xName="x"
                  yName="y"
                  name={curve.name}
                  type="Line"
                  width={2}
                  marker={{ visible: false }}
                />
              ))}
            </SeriesCollectionDirective>
          </ChartComponent>
        </div>
        {/* Optional switch point markers for ICP curves */}
        {curveType === 'ICP' && (
          <div className="mt-4">
            <h4 className="text-md font-semibold mb-2">Switch Points</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {chartData.map((curve, index) => (
                curve.switchPoint ? (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">{curve.name}:</span>{' '}
                      x = {curve.switchPoint.x.toFixed(2)}, y = {curve.switchPoint.y.toFixed(2)}
                    </p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <ErrorBoundary>
        <Header category="Modeling" title="Curve Testing" />

        {/* Control Panel */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Model Selection */}
            <div className="md:col-span-4">
              <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Model
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

            {/* Variable Selection */}
            <div className="md:col-span-4">
              <label htmlFor="variable-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Variable
              </label>
              <DropDownListComponent
                id="variable-select"
                dataSource={availableVariables.map((v) => ({ text: v.name, value: v.name }))}
                fields={{ text: 'text', value: 'value' }}
                value={selectedVariable}
                change={handleVariableChange}
                placeholder="Select variable"
                style={{ width: '100%' }}
              />
            </div>

            {/* Curve Type Selection */}
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Curve Type
              </label>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center">
                  <input
                    id="icp-curve"
                    type="radio"
                    name="curve-type"
                    value="ICP"
                    checked={curveType === 'ICP'}
                    onChange={handleCurveTypeChange}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label htmlFor="icp-curve" className="ml-2 text-sm text-gray-700">
                    ICP (S-Curve)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="adbug-curve"
                    type="radio"
                    name="curve-type"
                    value="ADBUG"
                    checked={curveType === 'ADBUG'}
                    onChange={handleCurveTypeChange}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label htmlFor="adbug-curve" className="ml-2 text-sm text-gray-700">
                    ADBUG (Diminishing Returns)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Test Button */}
          <div className="mt-4 flex justify-end">
            <ButtonComponent
              cssClass="e-primary"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={handleTestCurves}
              disabled={!selectedModel || !selectedVariable || loading}
            >
              <div className="flex items-center gap-1">
                <FiSettings className="mr-1" />
                Test Curves
              </div>
            </ButtonComponent>
          </div>
        </div>

        {/* Results Panel */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Curve Test Results</h3>
          {renderResultsGrid()}
        </div>

        {/* Chart Panel */}
        {renderCurveChart()}
      </ErrorBoundary>
    </div>
  );
};

export default CurveTesting;
