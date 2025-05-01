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
  Search
} from '@syncfusion/ej2-react-grids';
import {
  TabComponent,
  TabItemDirective,
  TabItemsDirective
} from '@syncfusion/ej2-react-navigations';
import {
  DatePickerComponent,
  DateRangePickerComponent
} from '@syncfusion/ej2-react-calendars';
import {
  DropDownListComponent
} from '@syncfusion/ej2-react-dropdowns';
import {
  ButtonComponent
} from '@syncfusion/ej2-react-buttons';
import {
  DialogComponent
} from '@syncfusion/ej2-react-popups';
import {
  FiDatabase,
  FiPlus,
  FiMinus,
  FiRefreshCw,
  FiCopy,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiFilter
} from 'react-icons/fi';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

const ModelBuilder = () => {
  const { currentColor } = useStateContext();

  // States for models
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelVariables, setModelVariables] = useState([]);

  // States for variables
  const [allVariables, setAllVariables] = useState([]);
  const [variablesToAdd, setVariablesToAdd] = useState([]);
  const [variablesToRemove, setVariablesToRemove] = useState([]);
  const [searchVariablesText, setSearchVariablesText] = useState('');
  const [previewMode, setPreviewMode] = useState(null); // 'add' or 'remove'

  // States for comparison data
  const [modelComparison, setModelComparison] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(false);

  // States for dialog visibility
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showDateFilterDialog, setShowDateFilterDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);

  // States for clone/filter operations
  const [newModelName, setNewModelName] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [activeTab, setActiveTab] = useState(0);

  // State variables for creating a new model
  const [showCreateModelDialog, setShowCreateModelDialog] = useState(false);
  const [newModelKpi, setNewModelKpi] = useState('');
  const [newModelNameForCreate, setNewModelNameForCreate] = useState('');
  const [availableKpis, setAvailableKpis] = useState([]);

  // States for adstock
  const [adstockRates, setAdstockRates] = useState({});

  // Loading state
  const [loading, setLoading] = useState(false);

  // Ref for grid
  const gridRef = useRef(null);

  // Fetch models and variables on component mount
  useEffect(() => {
    fetchModels();
    fetchVariables();
  }, []);

  // Fetch all available models
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await apiService.listModels();
      if (response.success) {
        setModels(response.models);
        if (response.activeModel && response.models.length > 0) {
          const activeModel = response.models.find(m => m.name === response.activeModel);
          if (activeModel) {
            setSelectedModel(activeModel);
            fetchModelVariables(activeModel.name);
          }
        }
      } else {
        console.error('Failed to load models:', response.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching models:', error);
      setLoading(false);
    }
  };

  // Fetch all available variables
  const fetchVariables = async () => {
    try {
      const response = await apiService.getVariables();
      if (response.success) {
        setAllVariables(response.variables);
      } else {
        console.error('Failed to load variables:', response.error);
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  // Fetch variables from a specific model
  const fetchModelVariables = async (modelName) => {
    if (!modelName) {
      console.log('No model name provided to fetchModelVariables');
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching variables for model: ${modelName}`);

      // Make API call
      const response = await apiService.getModelVariables(modelName);
      console.log('Model variables API response:', response);

      if (response.success && response.variables) {
        console.log(`Loaded ${response.variables.length} variables`);
        setModelVariables(response.variables);
      } else {
        console.warn('No variables found or error:', response.error);
        setModelVariables([]);
      }
    } catch (error) {
      console.error('Error in fetchModelVariables:', error);
      setModelVariables([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle model selection change
  const handleModelChange = (e) => {
    const modelName = e.value;
    const selectedModelObj = models.find(m => m.name === modelName);
    if (selectedModelObj) {
      setSelectedModel(selectedModelObj);
      fetchModelVariables(modelName);
      // Reset any pending changes
      setVariablesToAdd([]);
      setVariablesToRemove([]);
      setPendingChanges(false);
      setModelComparison(null);
    }
  };

  // Handle add variables
  const handleAddVariables = async () => {
    if (variablesToAdd.length === 0) {
      alert('Please select variables to add');
      return;
    }

    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    try {
      setLoading(true);
      setPreviewMode('add'); // Set mode to 'add'

      const adstockRatesArray = variablesToAdd.map(v => adstockRates[v] || 0);

      const response = await apiService.previewAddVariables(
        selectedModel.name,
        variablesToAdd,
        adstockRatesArray
      );

      if (response.success) {
        setModelComparison(response.comparison);
        setShowComparisonDialog(true);
        setPendingChanges(true);
      } else {
        alert('Failed to preview changes: ' + response.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error previewing add variables:', error);
      setLoading(false);
      alert('Error previewing changes');
    }
  };

  const handleShowRemovePreview = async () => {
    if (variablesToRemove.length === 0) {
      alert('Please select variables to remove');
      return;
    }

    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    try {
      setLoading(true);
      setPreviewMode('remove'); // Set mode to 'remove'

      const response = await apiService.previewRemoveVariables(
        selectedModel.name,
        variablesToRemove
      );

      if (response.success) {
        setModelComparison(response.comparison);
        setShowComparisonDialog(true);
        setPendingChanges(true);
      } else {
        alert('Failed to preview changes: ' + response.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error previewing remove variables:', error);
      setLoading(false);
      alert('Error previewing changes');
    }
  };

  const handleApplyAddVariables = async () => {
    if (variablesToAdd.length === 0) {
      alert('No variables selected for addition');
      return;
    }

    if (!selectedModel) {
      alert('No model selected');
      return;
    }

    try {
      setLoading(true);
      const adstockRatesArray = variablesToAdd.map(v => adstockRates[v] || 0);

      const response = await apiService.addVariables(
        selectedModel.name,
        variablesToAdd,
        adstockRatesArray
      );

      if (response.success) {
        setVariablesToAdd([]);
        setShowComparisonDialog(false);
        setPendingChanges(false);
        setModelComparison(null);
        await fetchModelVariables(selectedModel.name);
        alert('Variables added successfully!');
      } else {
        alert(`Failed to add variables: ${response.error || 'Unknown server error'}`);
      }
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error.response ?
        `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}` :
        error.message;
      alert(`Error adding variables: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

// This is your working function that actually removes variables
const handleRemoveVariables = async () => {
  // Early validation checks
  if (variablesToRemove.length === 0) {
    alert('Please select variables to remove');
    return;
  }
  if (!selectedModel) {
    alert('Please select a model first');
    return;
  }
  try {
    setLoading(true);
    console.log(`Removing variables from model ${selectedModel.name}:`, variablesToRemove);
    // Call API to remove variables
    const response = await apiService.removeVariables(
      selectedModel.name,
      variablesToRemove
    );
    console.log("Remove variables response:", response);
    if (response.success) {
      // Reset selection
      setVariablesToRemove([]);

      // Reset dialog states
      setShowComparisonDialog(false);
      setPendingChanges(false);
      setModelComparison(null);

      // Refresh model variables
      await fetchModelVariables(selectedModel.name);

      // Success message
      alert('Variables removed successfully!');
    } else {
      alert(`Failed to remove variables: ${response.error || 'Unknown server error'}`);
    }
  } catch (error) {
    console.error('Error details:', error);
    // Get more detailed error information if available
    const errorMessage = error.response ?
      `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}` :
      error.message;

    alert(`Error removing variables: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

const handleApplyRemoveVariables = async () => {
  if (variablesToRemove.length === 0) {
    alert('No variables selected for removal');
    return;
  }

  if (!selectedModel) {
    alert('No model selected');
    return;
  }

  try {
    setLoading(true);
    console.log(`Removing variables from model ${selectedModel.name}:`, variablesToRemove);

    const response = await apiService.removeVariables(
      selectedModel.name,
      variablesToRemove
    );

    console.log("Remove variables response:", response);

    if (response.success) {
      setVariablesToRemove([]);
      setShowComparisonDialog(false);
      setPendingChanges(false);
      setModelComparison(null);
      await fetchModelVariables(selectedModel.name);
      alert('Variables removed successfully!');
    } else {
      alert(`Failed to remove variables: ${response.error || 'Unknown server error'}`);
    }
  } catch (error) {
    console.error('Error details:', error);
    const errorMessage = error.response ?
      `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}` :
      error.message;
    alert(`Error removing variables: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

const handleApplyChanges = async () => {
  if (previewMode === 'add') {
    await handleApplyAddVariables();
  } else if (previewMode === 'remove') {
    await handleApplyRemoveVariables(); // This was previously undefined
  }
};

// Handle cancel changes
const handleCancelChanges = () => {
  console.log("Cancel button clicked");
  setShowComparisonDialog(false);
  setPendingChanges(false);
  setModelComparison(null);
};

  // Handle clone model
  const handleCloneModel = async () => {
    if (!selectedModel) {
      alert('Please select a model to clone');
      return;
    }

    if (!newModelName || newModelName.trim() === '') {
      alert('Please enter a name for the new model');
      return;
    }

    try {
      setLoading(true);

      const response = await apiService.cloneModel(
        selectedModel.name,
        newModelName
      );

      if (response.success) {
        // Refresh models list
        await fetchModels();

        // Select the new model
        setSelectedModel({
          name: newModelName,
          kpi: selectedModel.kpi,
        });

        // Fetch variables for the new model
        await fetchModelVariables(newModelName);

        // Close dialog and reset name
        setShowCloneDialog(false);
        setNewModelName('');

        // Show success message
        alert(`Model "${selectedModel.name}" cloned successfully as "${newModelName}"`);
      } else {
        alert('Failed to clone model: ' + response.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error cloning model:', error);
      setLoading(false);
      alert('Error cloning model: ' + error.message);
    }
  };

  // Handle filter date range
  const handleFilterDateRange = async () => {
    if (!selectedModel) {
      alert('Please select a model to filter');
      return;
    }

    if (!dateRange[0] || !dateRange[1]) {
      alert('Please select a valid date range');
      return;
    }

    try {
      setLoading(true);

      // Format dates to ISO string
      const startDate = dateRange[0].toISOString();
      const endDate = dateRange[1].toISOString();

      const response = await apiService.filterModel(
        selectedModel.name,
        startDate,
        endDate
      );

      if (response.success) {
        // Refresh model variables to reflect filtered data
        await fetchModelVariables(selectedModel.name);

        // Close dialog and reset date range
        setShowDateFilterDialog(false);
        setDateRange([null, null]);

        // Show success message
        alert(`Model data filtered to date range: ${startDate.split('T')[0]} to ${endDate.split('T')[0]}`);
      } else {
        alert('Failed to filter model: ' + response.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error filtering model:', error);
      setLoading(false);
      alert('Error filtering model: ' + error.message);
    }
  };

  const fetchAvailableKpis = () => {
    if (allVariables.length === 0) return;

    // Filter variables that are numeric and not transformed
    const kpis = allVariables
      .filter(v => v.type === 'NUMERIC' && !v.isTransformed)
      .map(v => v.name);

    setAvailableKpis(kpis);
  };

  // Add this useEffect
useEffect(() => {
  fetchAvailableKpis();
}, [allVariables]);

// Add this function to create a new model
const handleCreateNewModel = async () => {
  if (!newModelNameForCreate || newModelNameForCreate.trim() === '') {
    alert('Please enter a name for the new model');
    return;
  }

  if (!newModelKpi) {
    alert('Please select a KPI variable');
    return;
  }

  try {
    setLoading(true);

    const response = await apiService.createModel(
      newModelNameForCreate,
      newModelKpi
    );

    if (response.success) {
      // Refresh models list
      await fetchModels();

      // Select the new model
      setSelectedModel({
        name: newModelNameForCreate,
        kpi: newModelKpi,
      });

      // Close dialog and reset inputs
      setShowCreateModelDialog(false);
      setNewModelNameForCreate('');
      setNewModelKpi('');

      // Show success message
      alert(`New model "${newModelNameForCreate}" created successfully with KPI "${newModelKpi}"`);
    } else {
      alert('Failed to create model: ' + response.error);
    }

    setLoading(false);
  } catch (error) {
    console.error('Error creating model:', error);
    setLoading(false);
    alert('Error creating model: ' + error.message);
  }
};

  // Handle variable selection for adding
  const handleVariableToAddSelect = (variable) => {
    setVariablesToAdd(prev => {
      if (prev.includes(variable)) {
        return prev.filter(v => v !== variable);
      } else {
        return [...prev, variable];
      }
    });
  };

  // Handle variable selection for removing
  const handleVariableToRemoveSelect = (variable) => {
    setVariablesToRemove(prev => {
      if (prev.includes(variable)) {
        return prev.filter(v => v !== variable);
      } else {
        return [...prev, variable];
      }
    });
  };

  // Handle adstock rate change
  const handleAdstockRateChange = (variable, rate) => {
    setAdstockRates(prev => ({
      ...prev,
      [variable]: rate / 100
    }));
  };

  // Filter variables that are not already in the model
  const getAvailableVariables = () => {
    if (!selectedModel || !modelVariables.length) return allVariables;

    const currentVarNames = modelVariables.map(v => v.name);
    return allVariables.filter(v => !currentVarNames.includes(v.name));
  };

  // Apply search filter to variables
  const filterVariablesBySearch = (variables) => {
    if (!searchVariablesText) return variables;

    return variables.filter(v =>
      v.name.toLowerCase().includes(searchVariablesText.toLowerCase())
    );
  };

  // Format cell value for the model variables grid
  const formatModelVariableCell = (field, value) => {
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

    // Default formatting
    return value;
  };

  // Format cell for comparison table
  const formatComparisonCell = (field, value, rowData) => {
    if (field === 'pctChange') {
      // Color-code based on magnitude of change
      let colorClass = '';
      const absValue = Math.abs(value);

      if (absValue >= 50) {
        colorClass = value > 0 ? 'font-bold text-green-600' : 'font-bold text-red-600';
      } else if (absValue >= 20) {
        colorClass = value > 0 ? 'text-green-600' : 'text-red-600';
      }

      return <span className={colorClass}>{value.toFixed(2)}%</span>;
    }

    if (field === 'coefficient' || field === 'newCoefficient') {
      const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
      return <span className={colorClass}>{value.toFixed(4)}</span>;
    }

    if (field === 'tStat' || field === 'newTStat') {
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

    return value;
  };

  // Render model variables grid
  const renderModelVariablesGrid = () => {
    if (!selectedModel) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiDatabase className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No model selected</p>
          <p className="text-gray-400 text-sm">
            Please select a model to view its variables
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
          ></div>
          <p className="ml-2">Loading model variables...</p>
        </div>
      );
    }

    if (modelVariables.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiDatabase className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No variables in model</p>
          <p className="text-gray-400 text-sm">
            This model doesn't have any variables yet
          </p>
        </div>
      );
    }

    // Return a table instead of the GridComponent
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Model Variables</h3>
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search variables..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchVariablesText}
                onChange={(e) => setSearchVariablesText(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variable
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coefficient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  T-statistic
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transformation
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelVariables
                .filter(variable => !searchVariablesText || variable.name.toLowerCase().includes(searchVariablesText.toLowerCase()))
                .map((variable) => (
                  <tr key={variable.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600"
                        checked={variablesToRemove.includes(variable.name)}
                        onChange={() => handleVariableToRemoveSelect(variable.name)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{variable.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatModelVariableCell('coefficient', variable.coefficient)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatModelVariableCell('tStat', variable.tStat)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-900">
    {variable.transformation && variable.transformation !== 'None'
      ? variable.transformation
      : '-'}
  </div>
</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{variable.group || 'Other'}</div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
  <ButtonComponent
    cssClass="e-primary"
    style={{
      backgroundColor: currentColor,
      borderColor: currentColor,
    }}
    onClick={handleShowRemovePreview}  // Use the preview function
    disabled={variablesToRemove.length === 0 || loading}
  >
    <div className="flex items-center gap-1">
      <FiMinus className="mr-1" />
      Remove Selected Variables
    </div>
  </ButtonComponent>
</div>
      </div>
    );
  };

  // Render available variables for adding
  const renderAddVariablesGrid = () => {
    const availableVariables = filterVariablesBySearch(getAvailableVariables());

    if (availableVariables.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiDatabase className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No variables available</p>
          <p className="text-gray-400 text-sm">
            All variables are already in the model or no data loaded
          </p>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Available Variables</h3>
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search variables..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchVariablesText}
                onChange={(e) => setSearchVariablesText(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variable
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adstock
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {availableVariables.map((variable) => (
                <tr key={variable.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600"
                      checked={variablesToAdd.includes(variable.name)}
                      onChange={() => handleVariableToAddSelect(variable.name)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{variable.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {variable.type || 'NUMERIC'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="number"
                        className="w-16 p-1 border border-gray-300 rounded text-sm"
                        min="0"
                        max="100"
                        value={(adstockRates[variable.name] || 0) * 100}
                        onChange={(e) => handleAdstockRateChange(
                          variable.name,
                          parseInt(e.target.value, 10) || 0
                        )}
                        disabled={!variablesToAdd.includes(variable.name)}
                      />
                      <span className="ml-1 text-sm">%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <ButtonComponent
            cssClass="e-success"
            style={{ backgroundColor: currentColor, borderColor: currentColor }}
            onClick={handleAddVariables}
            disabled={variablesToAdd.length === 0 || loading}
          >
            <div className="flex items-center gap-1">
              <FiPlus className="mr-1" />
              Add Selected Variables
            </div>
          </ButtonComponent>
        </div>
      </div>
    );
  };

  // Render remove variables grid
  const renderRemoveVariablesGrid = () => {
    if (modelVariables.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiDatabase className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No variables in model</p>
          <p className="text-gray-400 text-sm">
            This model doesn't have any variables to remove
          </p>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Model Variables</h3>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variable
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coefficient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  T-statistic
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelVariables.map((variable) => (
                <tr key={variable.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-600"
                      checked={variablesToRemove.includes(variable.name)}
                      onChange={() => handleVariableToRemoveSelect(variable.name)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{variable.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatModelVariableCell('coefficient', variable.coefficient)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatModelVariableCell('tStat', variable.tStat)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <ButtonComponent
  cssClass="e-danger"
  style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
  onClick={handleShowRemovePreview}  // Changed from handleRemoveVariables to handleShowRemovePreview
  disabled={variablesToRemove.length === 0 || loading}
>
  <div className="flex items-center gap-1">
    <FiMinus className="mr-1" />
    Remove Selected Variables
  </div>
</ButtonComponent>
        </div>
      </div>
    );
  };

  // Render comparison table for model changes
  const renderComparisonTable = () => {
    if (!modelComparison) return null;

    return (
      <div className="max-h-96 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variable
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Coefficient
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                New Coefficient
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Change
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current T-stat
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                New T-stat
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Change
              </th>
            </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {modelComparison.map((row) => (
              <tr key={row.variable} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{row.variable}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {formatComparisonCell('coefficient', row.coefficient, row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {formatComparisonCell('newCoefficient', row.newCoefficient, row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {formatComparisonCell('pctChange', row.coefficientPctChange, row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {formatComparisonCell('tStat', row.tStat, row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {formatComparisonCell('newTStat', row.newTStat, row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {formatComparisonCell('pctChange', row.tStatPctChange, row)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <ErrorBoundary>
        <Header category="Modeling" title="Model Builder" />

        {/* Top section with model selection and actions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
  <div className="md:col-span-4">
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Model Selection</h3>
      <div className="mb-3">
        <DropDownListComponent
          id="model-select"
          dataSource={models.map(m => ({ text: m.name, value: m.name }))}
          fields={{ text: 'text', value: 'value' }}
          value={selectedModel ? selectedModel.name : ''}
          change={handleModelChange}
          placeholder="Select model"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  </div>

  <div className="md:col-span-8 flex flex-wrap gap-3 items-start">
  </div>
</div>

        {/* Tab panel for variable management */}
        <TabComponent
  id="modelTabs"
  selected={activeTab}
  selecting={(e) => {
    try {
      if (typeof e.selectedIndex === 'number') {
        setActiveTab(e.selectedIndex);
      }
    } catch (error) {
      console.log("Tab selection handling error:", error);
      // Silently handle the error
    }
  }}
>
  <TabItemsDirective>
    <TabItemDirective
      header={{ text: 'Current Variables' }}
      content={() => {
        try {
          return renderModelVariablesGrid();
        } catch (error) {
          console.log("Tab content error:", error);
          return <div>Loading content...</div>;
        }
      }}
    />
    <TabItemDirective
      header={{ text: 'Add Variables' }}
      content={() => {
        try {
          return renderAddVariablesGrid();
        } catch (error) {
          console.log("Tab content error:", error);
          return <div>Loading content...</div>;
        }
      }}
    />
  </TabItemsDirective>
</TabComponent>

        {/* Clone Model Dialog */}
        <DialogComponent
          width="500px"
          isModal={true}
          visible={showCloneDialog}
          close={() => setShowCloneDialog(false)}
          header="Clone Model"
          showCloseIcon={true}
        >
          <div className="p-4">
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Create a copy of {selectedModel ? selectedModel.name : 'this model'} with a new name
              </p>
              <label htmlFor="new-model-name" className="block text-sm font-medium mb-1">
                New Model Name
              </label>
              <input
                id="new-model-name"
                type="text"
                className="border-1 border-gray-300 rounded-md p-2 w-full"
                placeholder="Enter new model name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <ButtonComponent onClick={() => setShowCloneDialog(false)}>
                Cancel
              </ButtonComponent>
              <ButtonComponent
  cssClass="e-success"
  style={{ backgroundColor: currentColor, borderColor: currentColor }}
  onClick={handleCloneModel}
  disabled={!newModelName || newModelName.trim() === ''}
>
  Clone Model
</ButtonComponent>
            </div>
          </div>
        </DialogComponent>

        {/* Date Filter Dialog */}
        <DialogComponent
          width="500px"
          isModal={true}
          visible={showDateFilterDialog}
          close={() => setShowDateFilterDialog(false)}
          header="Filter Date Range"
          showCloseIcon={true}
        >
          <div className="p-4">
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Select a date range to filter model data
              </p>
              <label htmlFor="date-range" className="block text-sm font-medium mb-1">
                Date Range
              </label>
              <DateRangePickerComponent
                id="date-range"
                placeholder="Select date range"
                value={dateRange[0] && dateRange[1] ? dateRange : null}
                change={(args) => setDateRange([args.startDate, args.endDate])}
                format="yyyy-MM-dd"
                style={{ width: '100%' }}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <ButtonComponent onClick={() => setShowDateFilterDialog(false)}>
                Cancel
              </ButtonComponent>
              <ButtonComponent
                cssClass="e-success"
                style={{ backgroundColor: currentColor, borderColor: currentColor }}
                onClick={handleFilterDateRange}
                disabled={!dateRange[0] || !dateRange[1]}
              >
                Apply Filter
              </ButtonComponent>
            </div>
          </div>
        </DialogComponent>

{/* Create New Model Dialog */}
<DialogComponent
  width="500px"
  isModal={true}
  visible={showCreateModelDialog}
  close={() => setShowCreateModelDialog(false)}
  header="Create New Model"
  showCloseIcon={true}
>
  <div className="p-4">
    <div className="mb-4">
      <label htmlFor="new-model-name-create" className="block text-sm font-medium mb-1">
        New Model Name
      </label>
      <input
        id="new-model-name-create"
        type="text"
        className="border-1 border-gray-300 rounded-md p-2 w-full"
        placeholder="Enter model name"
        value={newModelNameForCreate}
        onChange={(e) => setNewModelNameForCreate(e.target.value)}
      />
    </div>

    <div className="mb-4">
      <label htmlFor="kpi-select" className="block text-sm font-medium mb-1">
        KPI Variable
      </label>
      <DropDownListComponent
        id="kpi-select"
        dataSource={availableKpis.map(kpi => ({ text: kpi, value: kpi }))}
        fields={{ text: 'text', value: 'value' }}
        value={newModelKpi}
        change={(e) => setNewModelKpi(e.value)}
        placeholder="Select KPI variable"
        style={{ width: '100%' }}
      />
      <p className="text-sm text-gray-500 mt-1">
        This is the dependent variable that your model will predict.
      </p>
    </div>

    <div className="flex justify-end gap-2 mt-6">
      <ButtonComponent onClick={() => setShowCreateModelDialog(false)}>
        Cancel
      </ButtonComponent>
      <ButtonComponent
        cssClass="e-success"
        style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
        onClick={handleCreateNewModel}
        disabled={!newModelNameForCreate || !newModelKpi}
      >
        Create Model
      </ButtonComponent>
    </div>
  </div>
</DialogComponent>

        {/* Model Comparison Dialog - using simple HTML buttons instead of ButtonComponent */}
{showComparisonDialog && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-4/5 h-4/5 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Model Changes Preview</h2>
        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={handleCancelChanges}
        >
          <FiXCircle size={24} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        {/* Debug info */}
        <div className="bg-gray-100 p-2 text-xs mb-4">
          <p>Selected Model: {selectedModel ? selectedModel.name : 'None'}</p>
          <p>Removing {variablesToRemove.length} variables: {variablesToRemove.join(', ')}</p>
          <p>Pending Changes: {pendingChanges ? 'Yes' : 'No'}</p>
        </div>

        <h3 className="text-lg font-semibold mb-4">
          Preview Changes to Model: {selectedModel ? selectedModel.name : ''}
        </h3>

        {/* Comparison table */}
        {modelComparison && (
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variable
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Coefficient
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Coefficient
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Change
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current T-stat
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New T-stat
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modelComparison.map((row) => (
                  <tr key={row.variable} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.variable}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('coefficient', row.coefficient, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('newCoefficient', row.newCoefficient, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('pctChange', row.coefficientPctChange, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('tStat', row.tStat, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('newTStat', row.newTStat, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('pctChange', row.tStatPctChange, row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
  <button
    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
    onClick={handleCancelChanges}
  >
    Cancel
  </button>
  <button
    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
    onClick={handleApplyChanges}
    disabled={loading}
  >
    {loading ? "Processing..." :
     previewMode === 'add' ? "Add Variables" : "Remove Variables"}
  </button>
</div>
    </div>
  </div>
)}
      </ErrorBoundary>
    </div>
  );
};

export default ModelBuilder;