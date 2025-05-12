import React, { useState, useEffect } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Page, Sort, Filter, Inject, Toolbar, Search } from '@syncfusion/ej2-react-grids';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { FiDatabase, FiSearch, FiCheck } from 'react-icons/fi';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

const VariableTesting = () => {
  const { currentColor } = useStateContext();

  // States for variables and models
  const [variables, setVariables] = useState([]);
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // States for test results
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testPerformed, setTestPerformed] = useState(false);

  // Optional states for advanced features
  const [selectedAdstockRates, setSelectedAdstockRates] = useState([]);
  const [showAdstockOptions, setShowAdstockOptions] = useState(false);
  const adstockOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

  // Fetch variables and models on component mount
  useEffect(() => {
    fetchVariables();
    fetchModels();
  }, []);

  // Fetch all available variables
  const fetchVariables = async () => {
    try {
      setLoading(true);
      const response = await apiService.getVariables();
      if (response.success) {
        setVariables(response.variables);
      } else {
        console.error('Failed to load variables:', response.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching variables:', error);
      setLoading(false);
    }
  };

  // Fetch all available models
  const fetchModels = async () => {
    try {
      const response = await apiService.listModels();
      if (response.success) {
        setModels(response.models);
        if (response.activeModel) {
          setSelectedModel(response.activeModel);
        }
      } else {
        console.error('Failed to load models:', response.error);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Filter variables based on search term
  const filteredVariables = variables.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle checkbox selection
  const handleCheckboxClick = (variableName) => {
    setSelectedVariables(prev => {
      if (prev.includes(variableName)) {
        return prev.filter(v => v !== variableName);
      } else {
        return [...prev, variableName];
      }
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedVariables(filteredVariables.map(v => v.name));
    } else {
      setSelectedVariables([]);
    }
  };

  // Handle testing variables with multiple adstock rates
  const handleTestVariables = async () => {
    if (selectedVariables.length === 0) {
      alert('Please select at least one variable to test');
      return;
    }

    if (!selectedModel) {
      alert('Please select a model to test against');
      return;
    }

    if (selectedAdstockRates.length === 0) {
      // Default to 0% adstock if none selected
      setSelectedAdstockRates([0]);
    }

    setLoading(true);
    try {
      // For each selected variable and each selected adstock rate, create a test entry
      let allResults = [];
      let allPromises = [];

      // Convert percentages to decimals
      const decimalAdstockRates = selectedAdstockRates.map(rate => rate / 100);

      // Test each variable with each adstock rate
      for (const variable of selectedVariables) {
        for (const adstockRate of decimalAdstockRates) {
          // Create a descriptive name for variables with adstock
          const variableName = adstockRate > 0 ?
            `${variable} (Adstock ${adstockRate * 100}%)` :
            variable;

          // Test this variable with this adstock rate
          const promise = apiService.testVariables(
            selectedModel,
            [variable],
            [adstockRate]
          ).then(response => {
            if (response.success && response.results && response.results.length > 0) {
              // Rename the variable to include adstock information
              const result = response.results[0];
              result.Variable = variableName;
              allResults.push(result);
            }
            return response;
          });

          allPromises.push(promise);
        }
      }

      // Wait for all tests to complete
      await Promise.all(allPromises);

      // Sort results by absolute T-stat value
      allResults.sort((a, b) => Math.abs(b['T-stat']) - Math.abs(a['T-stat']));

      setTestResults(allResults);
      setTestPerformed(true);
    } catch (error) {
      console.error('Error testing variables:', error);
      alert('An error occurred while testing variables');
    } finally {
      setLoading(false);
    }
  };

  // Handle toggling adstock rate selection
  const handleAdstockRateToggle = (rate) => {
    setSelectedAdstockRates(prev => {
      if (prev.includes(rate)) {
        return prev.filter(r => r !== rate);
      } else {
        return [...prev, rate].sort((a, b) => a - b);
      }
    });
  };

  // Render variable list with checkboxes
  const renderVariableList = () => {
    return (
      <div>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600"
            checked={filteredVariables.length > 0 &&
                    selectedVariables.length === filteredVariables.length}
            onChange={handleSelectAll}
            id="select-all-vars"
          />
          <label htmlFor="select-all-vars" className="ml-2 text-sm font-medium">
            Select All
          </label>
        </div>

        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
          {filteredVariables.length === 0 ? (
            <div className="p-3 text-center text-gray-500">No variables found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredVariables.map(variable => (
                <div key={variable.name} className="p-2 hover:bg-gray-100 flex items-center">
                  <input
                    type="checkbox"
                    id={`var-${variable.name}`}
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={selectedVariables.includes(variable.name)}
                    onChange={() => handleCheckboxClick(variable.name)}
                  />
                  <label
                    htmlFor={`var-${variable.name}`}
                    className="ml-2 text-sm cursor-pointer flex-1 truncate"
                  >
                    {variable.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Format a grid cell based on value
const formatCell = (field, value) => {
    // Coefficient formatting
    if (field === 'Coefficient') {
      const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
      return <span className={colorClass}>{value.toFixed(4)}</span>;
    }

    // T-stat formatting with enhanced color coding
    if (field === 'T-stat') {
      let colorClass = '';
      const absValue = Math.abs(value);
      const isSignificant = absValue >= 1.96;
      const isPositive = value > 0;

      if (isSignificant) {
        // Significant values: bold with color based on sign
        colorClass = isPositive ? 'font-bold text-green-600' : 'font-bold text-red-600';
      } else {
        // Non-significant values: not bold but still colored based on sign
        colorClass = isPositive ? 'text-green-600' : 'text-red-600';
      }

      return <span className={colorClass}>{value.toFixed(4)}</span>;
    }

    // VIF formatting
    if (field === 'VIF') {
      let colorClass = '';

      if (value > 10) {
        colorClass = 'font-bold text-red-600'; // High multicollinearity
      } else if (value > 5) {
        colorClass = 'text-orange-500'; // Moderate multicollinearity
      }

      return <span className={colorClass}>{value.toFixed(2)}</span>;
    }

    // R-squared increase formatting
    if (field === 'R-squared Increase') {
      return <span>{(value * 100).toFixed(2)}%</span>;
    }

    // Correlation with residuals formatting as percentage with 2 decimal points
    if (field === 'Correlation with Residuals') {
      return <span>{(value * 100).toFixed(2)}%</span>;
    }

    // Default formatting
    return value;
  }

  // Render test results grid
  const renderTestResultsGrid = () => {
    if (!testPerformed) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiCheck className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No test results yet</p>
          <p className="text-gray-400 text-sm">
            Select variables and a model, then click "Test Variables" to see results
          </p>
        </div>
      );
    }

    if (testResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiCheck className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No test results available</p>
          <p className="text-gray-400 text-sm">
            No data was returned for the selected variables
          </p>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <GridComponent
          dataSource={testResults}
          allowPaging={true}
          allowSorting={true}
          pageSettings={{ pageSize: 10 }}
          toolbar={['Search']}
          width="100%"
        >
          <ColumnsDirective>
            <ColumnDirective
              field="Variable"
              headerText="Variable"
              width="200"
              textAlign="Left"
            />
            <ColumnDirective
              field="Coefficient"
              headerText="Coefficient"
              width="120"
              format="N4"
              textAlign="Right"
              template={(props) => formatCell('Coefficient', props.Coefficient)}
            />
            <ColumnDirective
              field="T-stat"
              headerText="T-statistic"
              width="120"
              format="N4"
              textAlign="Right"
              template={(props) => formatCell('T-stat', props['T-stat'])}
            />
            <ColumnDirective
              field="P-value"
              headerText="P-value"
              width="120"
              format="N4"
              textAlign="Right"
            />
            <ColumnDirective
              field="VIF"
              headerText="VIF"
              width="100"
              format="N2"
              textAlign="Right"
              template={(props) => formatCell('VIF', props.VIF)}
            />
            <ColumnDirective
              field="Rsquared_Increase"
              headerText="R² Increase"
              width="120"
              textAlign="Right"
              template={(props) => formatCell('R-squared Increase', props.Rsquared_Increase)}
            />
            <ColumnDirective
              field="Correlation_with_Residuals"
              headerText="Corr. w/ Residuals"
              width="150"
              format="N4"
              textAlign="Right"
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Toolbar, Search]} />
        </GridComponent>
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <ErrorBoundary>
        <Header category="Modeling" title="Variable Testing" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          {/* Left Panel - Variable Selection */}
          <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Variables</h3>

              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search variables..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {renderVariableList()}
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Model Selection</h3>
              <div className="mb-3">
                <label htmlFor="model-select" className="block text-sm font-medium mb-1">
                  Select a Model to Test Against
                </label>
                <DropDownListComponent
                  id="model-select"
                  dataSource={models.map(m => ({ text: m.name, value: m.name }))}
                  fields={{ text: 'text', value: 'value' }}
                  value={selectedModel}
                  change={(e) => setSelectedModel(e.value)}
                  placeholder="Select model"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="mb-4">
  <div className="flex items-center mb-2">
    <input
      type="checkbox"
      id="show-adstock"
      className="form-checkbox h-4 w-4 text-blue-600"
      checked={showAdstockOptions}
      onChange={() => setShowAdstockOptions(!showAdstockOptions)}
    />
    <label htmlFor="show-adstock" className="ml-2 text-sm font-medium">
      Show Adstock Options
    </label>
  </div>

  {showAdstockOptions && (
    <div className="mt-2 p-3 border border-gray-200 rounded-md bg-white">
      <p className="text-sm font-medium mb-2">Select Adstock Rates to Test:</p>
      <div className="flex flex-wrap gap-2">
        {adstockOptions.map(rate => (
          <div key={rate} className="flex items-center">
            <input
              type="checkbox"
              id={`adstock-${rate}`}
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={selectedAdstockRates.includes(rate)}
              onChange={() => handleAdstockRateToggle(rate)}
            />
            <label htmlFor={`adstock-${rate}`} className="ml-1 text-sm">
              {rate}%
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Each variable will be tested with all selected adstock rates
      </p>
    </div>
  )}
</div>

            <div className="mt-4">
              <ButtonComponent
                cssClass="e-success"
                style={{
                  backgroundColor: currentColor,
                  borderColor: currentColor,
                  width: '100%'
                }}
                onClick={handleTestVariables}
                disabled={selectedVariables.length === 0 || !selectedModel || loading}
              >
                {loading ? 'Testing...' : 'Test Variables'}
              </ButtonComponent>
            </div>
          </div>

          {/* Right Panel - Test Results */}
          <div className="md:col-span-9 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Test Results</h3>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
                  style={{ borderColor: currentColor }}
                ></div>
                <p className="ml-2">Testing variables...</p>
              </div>
            ) : (
              renderTestResultsGrid()
            )}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default VariableTesting;