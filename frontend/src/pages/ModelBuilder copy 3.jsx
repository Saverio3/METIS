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
  TabComponent,
  TabItemDirective,
  TabItemsDirective,
} from '@syncfusion/ej2-react-navigations';
import {
  DatePickerComponent,
  DateRangePickerComponent,
} from '@syncfusion/ej2-react-calendars';
import {
  DropDownListComponent,
} from '@syncfusion/ej2-react-dropdowns';
import {
  ButtonComponent,
} from '@syncfusion/ej2-react-buttons';
import {
  DialogComponent,
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
  FiFilter,
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

  // State to keep track of fixed coefficients
  const [fixedCoefficients, setFixedCoefficients] = useState({});
  const [showFixCoefficientDialog, setShowFixCoefficientDialog] = useState(false);
  const [variablesToFix, setVariablesToFix] = useState([]);
  const [customCoefficients, setCustomCoefficients] = useState({});
  const [fixCoeffPreview, setFixCoeffPreview] = useState(null);
  const [variableCoeffTypes, setVariableCoeffTypes] = useState({});
  const [variableCoeffValues, setVariableCoeffValues] = useState({});

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
          const activeModel = response.models.find((m) => m.name === response.activeModel);
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

        // Fetch fixed coefficients
        fetchFixedCoefficients(modelName);
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
    const selectedModelObj = models.find((m) => m.name === modelName);
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

      const adstockRatesArray = variablesToAdd.map((v) => adstockRates[v] || 0);

      // Get fixed coefficient data for preview
      const fixedCoeffs = {};
      for (const varName of variablesToAdd) {
        if (variableCoeffTypes[varName] === 'fixed' && variableCoeffValues[varName]) {
          // Create the variable name with adstock suffix if needed
          const adstockRate = adstockRates[varName] || 0;
          const finalVarName = adstockRate > 0
            ? `${varName}_adstock_${parseInt(adstockRate * 100)}`
            : varName;

          fixedCoeffs[finalVarName] = parseFloat(variableCoeffValues[varName]);
        }
      }

      // Call the preview API
      const response = await apiService.previewAddVariables(
        selectedModel.name,
        variablesToAdd,
        adstockRatesArray,
        fixedCoeffs, // Pass the fixed coefficients
      );

      if (response.success) {
        setModelComparison(response.comparison);
        setShowComparisonDialog(true);
        setPendingChanges(true);
      } else {
        alert(`Failed to preview changes: ${response.error}`);
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
        variablesToRemove,
      );

      if (response.success) {
        setModelComparison(response.comparison);
        setShowComparisonDialog(true);
        setPendingChanges(true);
      } else {
        alert(`Failed to preview changes: ${response.error}`);
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
      const adstockRatesArray = variablesToAdd.map((v) => adstockRates[v] || 0);

      // Call the API to add variables
      const response = await apiService.addVariables(
        selectedModel.name,
        variablesToAdd,
        adstockRatesArray,
      );

      if (response.success) {
        // If any coefficients should be fixed, handle that separately
        const fixedCoeffs = {};
        let hasFixedCoeffs = false;

        for (const varName of variablesToAdd) {
          if (variableCoeffTypes[varName] === 'fixed' && variableCoeffValues[varName]) {
            // Create the variable name with adstock suffix if needed
            const adstockRate = adstockRates[varName] || 0;
            const finalVarName = adstockRate > 0
              ? `${varName}_adstock_${parseInt(adstockRate * 100)}`
              : varName;

            fixedCoeffs[finalVarName] = parseFloat(variableCoeffValues[varName]);
            hasFixedCoeffs = true;
          }
        }

        // If there are any fixed coefficients, apply them
        if (hasFixedCoeffs) {
          await apiService.fixCoefficients(
            selectedModel.name,
            fixedCoeffs,
            false, // not preview, apply changes
          );
        }

        // Reset state
        setVariablesToAdd([]);
        setShowComparisonDialog(false);
        setPendingChanges(false);
        setModelComparison(null);
        setVariableCoeffTypes({});
        setVariableCoeffValues({});

        // Refresh model variables
        await fetchModelVariables(selectedModel.name);

        alert('Variables added successfully!');
      } else {
        alert(`Failed to add variables: ${response.error || 'Unknown server error'}`);
      }
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error.response
        ? `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : error.message;
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
        variablesToRemove,
      );
      console.log('Remove variables response:', response);
      if (response.success) {
      // Reset selection
        setVariablesToRemove([]);

        // Reset dialog states
        setShowComparisonDialog(false);
        setPendingChanges(false);
        setModelComparison(null);

        // Fetch model variables again to update the UI with the current state
        await fetchModelVariables(selectedModel.name);

        // Success message
        alert('Variables removed successfully!');
      } else {
        alert(`Failed to remove variables: ${response.error || 'Unknown server error'}`);
      }
    } catch (error) {
      console.error('Error details:', error);
      // Get more detailed error information if available
      const errorMessage = error.response
        ? `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : error.message;

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
        variablesToRemove,
      );

      console.log('Remove variables response:', response);

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
      const errorMessage = error.response
        ? `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : error.message;
      alert(`Error removing variables: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    if (previewMode === 'add') {
      await handleApplyAddVariables();
    } else if (previewMode === 'remove') {
      await handleApplyRemoveVariables();
    }
  };

  // Handle cancel changes
  const handleCancelChanges = () => {
    console.log('Cancel button clicked');
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
        newModelName,
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
        alert(`Failed to clone model: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error cloning model:', error);
      setLoading(false);
      alert(`Error cloning model: ${error.message}`);
    }
  };

  // Add this function to fetch fixed coefficients
  const fetchFixedCoefficients = async (modelName) => {
    try {
      const response = await apiService.getFixedCoefficients(modelName);
      if (response.success) {
        setFixedCoefficients(response.fixedCoefficients || {});
      } else {
        console.warn('Failed to load fixed coefficients:', response.error);
        setFixedCoefficients({});
      }
    } catch (error) {
      console.error('Error fetching fixed coefficients:', error);
      setFixedCoefficients({});
    }
  };

  // Add this function to handle showing the fix coefficient dialog
  const handleShowFixCoefficients = () => {
    if (!variablesToRemove || variablesToRemove.length === 0) {
      alert('Please select variables to fix coefficients for');
      return;
    }

    if (!modelVariables || modelVariables.length === 0) {
      alert('No variables in model to fix');
      return;
    }

    try {
    // Initialize custom coefficients with current values
      const initialCustomCoeffs = {};
      variablesToRemove.forEach((varName) => {
      // Find current coefficient from model variables
        const variable = modelVariables.find((v) => v.name === varName);
        if (variable && variable.coefficient !== undefined) {
          initialCustomCoeffs[varName] = variable.coefficient;
        } else {
          initialCustomCoeffs[varName] = 0; // Default to 0 if not found
        }
      });

      // First update all the required state
      setCustomCoefficients(initialCustomCoeffs);
      setVariablesToFix([...variablesToRemove]); // Create a new array to avoid reference issues
      setFixCoeffPreview(null); // Reset preview

      // Then show the dialog, after a slight timeout to ensure state is updated
      setTimeout(() => {
        setShowFixCoefficientDialog(true);
      }, 50);
    } catch (error) {
      console.error('Error preparing fix coefficients dialog:', error);
      alert('An error occurred while preparing the dialog');
    }
  };

  // Add this function to handle coefficient input change
  const handleCoeffInputChange = (varName, value) => {
    try {
    // Safely convert to number, default to 0 if invalid
      const numericValue = parseFloat(value) || 0;

      setCustomCoefficients((prev) => ({
        ...prev,
        [varName]: numericValue,
      }));
    } catch (error) {
      console.error('Error updating coefficient value:', error);
    // If there's an error, keep the previous value but don't crash
    }
  };

  // Add this function to preview fixed coefficients
  const handlePreviewFixedCoefficients = async () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    if (!variablesToFix || variablesToFix.length === 0) {
      alert('No variables selected to fix coefficients');
      return;
    }

    try {
      setLoading(true);

      // Prepare data for API - safely handle missing or invalid state
      const fixedCoeffs = {};
      variablesToFix.forEach((varName) => {
        if (customCoefficients && customCoefficients[varName] !== undefined) {
          fixedCoeffs[varName] = customCoefficients[varName];
        }
      });

      if (Object.keys(fixedCoeffs).length === 0) {
        alert('No valid coefficient values provided');
        setLoading(false);
        return;
      }

      console.log('Sending fixed coefficients preview request:', {
        modelName: selectedModel.name,
        fixedCoefficients: fixedCoeffs,
      });

      // Call API with preview flag
      const response = await apiService.fixCoefficients(
        selectedModel.name,
        fixedCoeffs,
        true, // preview only
      );

      console.log('Preview response:', response);

      if (response && response.success) {
        setFixCoeffPreview(response);
        setPendingChanges(true);
      } else {
        const errorMsg = response ? response.error : 'Unknown error';
        alert(`Failed to preview changes: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error previewing fixed coefficients:', error);
      alert(`Error previewing changes: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to apply fixed coefficients
  const handleApplyFixedCoefficients = async () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    if (!variablesToFix || variablesToFix.length === 0) {
      alert('No variables selected to fix coefficients');
      return;
    }

    try {
      setLoading(true);

      // Prepare data for API - safely handle missing or invalid state
      const fixedCoeffs = {};
      variablesToFix.forEach((varName) => {
        if (customCoefficients && customCoefficients[varName] !== undefined) {
          fixedCoeffs[varName] = customCoefficients[varName];
        }
      });

      if (Object.keys(fixedCoeffs).length === 0) {
        alert('No valid coefficient values provided');
        setLoading(false);
        return;
      }

      console.log('Sending fixed coefficients apply request:', {
        modelName: selectedModel.name,
        fixedCoefficients: fixedCoeffs,
      });

      // Call API to apply changes
      const response = await apiService.fixCoefficients(
        selectedModel.name,
        fixedCoeffs,
        false, // not preview, apply changes
      );

      console.log('Apply response:', response);

      if (response && response.success) {
      // Close the dialog and reset state in the correct order
        setShowFixCoefficientDialog(false);

        // Use setTimeout to prevent state updates on unmounted components
        setTimeout(() => {
          setVariablesToFix([]);
          setCustomCoefficients({});
          setFixCoeffPreview(null);
          setPendingChanges(false);

          // Refresh model variables after a short delay
          setTimeout(() => {
            fetchModelVariables(selectedModel.name);
          }, 100);
        }, 100);

        alert('Coefficients fixed successfully!');
      } else {
        alert(`Failed to apply fixed coefficients: ${response ? response.error : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error applying fixed coefficients:', error);
      alert(`Error applying fixed coefficients: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to unfix coefficients
  const handleUnfixCoefficients = async () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    if (!variablesToFix || variablesToFix.length === 0) {
      alert('No variables selected to unfix coefficients');
      return;
    }

    try {
      setLoading(true);

      console.log('Sending unfix coefficients request:', {
        modelName: selectedModel.name,
        unfixVariables: variablesToFix,
      });

      // Call API to unfix selected variables
      const response = await apiService.fixCoefficients(
        selectedModel.name,
        { unset: variablesToFix },
        false, // not preview, apply changes
      );

      console.log('Unfix response:', response);

      if (response && response.success) {
      // Close the dialog and reset state in the correct order
        setShowFixCoefficientDialog(false);

        // Use setTimeout to prevent state updates on unmounted components
        setTimeout(() => {
          setVariablesToFix([]);
          setCustomCoefficients({});
          setFixCoeffPreview(null);
          setPendingChanges(false);

          // Refresh model variables after a short delay
          setTimeout(() => {
            fetchModelVariables(selectedModel.name);
          }, 100);
        }, 100);

        alert('Coefficients unfixed successfully!');
      } else {
        alert(`Failed to unfix coefficients: ${response ? response.error : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error unfixing coefficients:', error);
      alert(`Error unfixing coefficients: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCoeffTypeChange = (variableName, value) => {
    setVariableCoeffTypes((prev) => ({
      ...prev,
      [variableName]: value,
    }));
  };

  const handleCoeffValueChange = (variableName, value) => {
    setVariableCoeffValues((prev) => ({
      ...prev,
      [variableName]: value,
    }));
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
        endDate,
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
        alert(`Failed to filter model: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error filtering model:', error);
      setLoading(false);
      alert(`Error filtering model: ${error.message}`);
    }
  };

  const fetchAvailableKpis = () => {
    if (allVariables.length === 0) return;

    // Filter variables that are numeric and not transformed
    const kpis = allVariables
      .filter((v) => v.type === 'NUMERIC' && !v.isTransformed)
      .map((v) => v.name);

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
        newModelKpi,
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
        alert(`Failed to create model: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error creating model:', error);
      setLoading(false);
      alert(`Error creating model: ${error.message}`);
    }
  };

  // Handle variable selection for adding
  const handleVariableToAddSelect = (variable) => {
    setVariablesToAdd((prev) => {
      if (prev.includes(variable)) {
        return prev.filter((v) => v !== variable);
      }
      return [...prev, variable];
    });
  };

  // Handle variable selection for removing
  const handleVariableToRemoveSelect = (variable) => {
    setVariablesToRemove((prev) => {
      if (prev.includes(variable)) {
        return prev.filter((v) => v !== variable);
      }
      return [...prev, variable];
    });
  };

  // Handle adstock rate change
  const handleAdstockRateChange = (variable, rate) => {
    setAdstockRates((prev) => ({
      ...prev,
      [variable]: rate / 100,
    }));
  };

  // Filter variables that are not already in the model
  const getAvailableVariables = () => {
    if (!selectedModel || !modelVariables.length) return allVariables;

    const currentVarNames = modelVariables.map((v) => v.name);
    return allVariables.filter((v) => !currentVarNames.includes(v.name));
  };

  // Apply search filter to variables
  const filterVariablesBySearch = (variables) => {
    if (!searchVariablesText) return variables;

    return variables.filter((v) => v.name.toLowerCase().includes(searchVariablesText.toLowerCase()));
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
    // Handle null/undefined values first
    if (value === null || value === undefined) {
      return '-';
    }

    // Coefficient formatting
    if (field === 'coefficient' || field === 'newCoefficient') {
      const colorClass = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
      return <span className={colorClass}>{value.toFixed(4)}</span>;
    }

    // T-stat formatting
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

    // Percentage change formatting
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

  useEffect(
    () =>
    // This cleanup function will run when the component unmounts
      () => {
      // Reset all dialog-related state to prevent updates on unmounted components
        setShowFixCoefficientDialog(false);
        setVariablesToFix([]);
        setCustomCoefficients({});
        setFixCoeffPreview(null);
        setShowComparisonDialog(false);
        setModelComparison(null);
      },
    [],
  );

  // Update the close handler for the dialog
  const handleCloseFixCoefficientDialog = () => {
    // First hide the dialog
    setShowFixCoefficientDialog(false);

    // Wait for the dialog to be removed from DOM before clearing state
    setTimeout(() => {
      setVariablesToFix([]);
      setCustomCoefficients({});
      setFixCoeffPreview(null);
    }, 50);
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
          />
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
                  Coeff Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelVariables
                .filter((variable) => !searchVariablesText || variable.name.toLowerCase().includes(searchVariablesText.toLowerCase()))
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
                      <div className={`text-sm ${fixedCoefficients[variable.name] !== undefined ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                        {fixedCoefficients[variable.name] !== undefined ? 'Fixed' : 'Floating'}
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

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
          <ButtonComponent
            cssClass="e-primary"
            style={{
              backgroundColor: currentColor,
              borderColor: currentColor,
            }}
            onClick={handleShowFixCoefficients}
            disabled={variablesToRemove.length === 0 || loading}
          >
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Fix Coefficients
            </div>
          </ButtonComponent>

          <ButtonComponent
            cssClass="e-primary"
            style={{
              backgroundColor: currentColor,
              borderColor: currentColor,
            }}
            onClick={handleShowRemovePreview}
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coeff Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coeff Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {availableVariables.map((variable) => {
                const isSelected = variablesToAdd.includes(variable.name);
                // Safely access coeffType with fallback to 'floating'
                const coeffType = (variableCoeffTypes && variableCoeffTypes[variable.name]) || 'floating';

                return (
                  <tr key={variable.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-600"
                        checked={isSelected}
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
                            parseInt(e.target.value, 10) || 0,
                          )}
                          disabled={!isSelected}
                        />
                        <span className="ml-1 text-sm">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className="w-full p-1 border border-gray-300 rounded text-sm"
                        value={coeffType}
                        onChange={(e) => handleCoeffTypeChange(variable.name, e.target.value)}
                        disabled={!isSelected}
                      >
                        <option value="floating">Floating</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-24 p-1 border border-gray-300 rounded text-sm"
                        value={variableCoeffValues[variable.name] || ''}
                        onChange={(e) => handleCoeffValueChange(variable.name, e.target.value)}
                        disabled={!isSelected || coeffType !== 'fixed'}
                        step="0.00001"
                      />
                    </td>
                  </tr>
                );
              })}
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
            onClick={handleShowRemovePreview} // Changed from handleRemoveVariables to handleShowRemovePreview
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
                  dataSource={models.map((m) => ({ text: m.name, value: m.name }))}
                  fields={{ text: 'text', value: 'value' }}
                  value={selectedModel ? selectedModel.name : ''}
                  change={handleModelChange}
                  placeholder="Select model"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-8 flex flex-wrap gap-3 items-start" />
        </div>

        {/* Custom styled tabs that work with light/dark theme and respect currentColor */}
        <div className="mt-6">
          <div className="flex border-b dark:border-gray-700">
            <button
              className={`py-3 px-6 font-medium text-sm transition-colors duration-200 relative ${
                activeTab === 0
                  ? 'text-white border-b-2'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(0)}
              style={{
                backgroundColor: activeTab === 0 ? currentColor : '',
                borderColor: activeTab === 0 ? currentColor : '',
              }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Current Variables
              </div>
            </button>
            <button
              className={`py-3 px-6 font-medium text-sm transition-colors duration-200 ${
                activeTab === 1
                  ? 'text-white border-b-2'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setActiveTab(1)}
              style={{
                backgroundColor: activeTab === 1 ? currentColor : '',
                borderColor: activeTab === 1 ? currentColor : '',
              }}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add Variables
              </div>
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-t-0 dark:border-gray-700 rounded-b-lg shadow-sm">
            {activeTab === 0 && renderModelVariablesGrid()}
            {activeTab === 1 && renderAddVariablesGrid()}
          </div>
        </div>

        {/* Clone Model Dialog */}
        <DialogComponent
          width="500px"
          isModal
          visible={showCloneDialog}
          close={() => setShowCloneDialog(false)}
          header="Clone Model"
          showCloseIcon
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

        {/* Fix Coefficient Dialog */}
        {showFixCoefficientDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-lg w-4/5 max-w-6xl h-4/5 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Fix Coefficients</h2>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={handleCloseFixCoefficientDialog}
              >
                <FiXCircle size={24} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Set Fixed Coefficients</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter custom coefficient values for the selected variables. These coefficients will be fixed during model fitting.
                </p>

                <div className="grid grid-cols-1 gap-4 mb-6">
                  {Array.isArray(variablesToFix) && variablesToFix.map((varName) => {
                    const variable = modelVariables.find((v) => v.name === varName);
                    const isCurrentlyFixed = fixedCoefficients[varName] !== undefined;

                    return (
                      <div key={varName} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{varName}</div>
                    <div className={`px-2 py-1 text-xs rounded-full ${isCurrentlyFixed ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {isCurrentlyFixed ? 'Currently Fixed' : 'Currently Floating'}
                    </div>
                  </div>

                        <div className="flex items-center">
                    <div className="mr-3 w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                      <div className="p-2 bg-gray-100 rounded border text-sm">
                        {variable && variable.coefficient !== undefined ? variable.coefficient.toFixed(4) : 'N/A'}
                      </div>
                    </div>

                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Fixed Value</label>
                      <input
                        type="number"
                        className="p-2 border rounded w-full"
                        value={customCoefficients[varName] || ''}
                        onChange={(e) => handleCoeffInputChange(varName, e.target.value)}
                        step="0.00001"
                      />
                    </div>
                  </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center space-x-4 mb-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handlePreviewFixedCoefficients}
                  >
                    Preview Changes
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    onClick={handleUnfixCoefficients}
                  >
                    Unfix Selected Coefficients
                  </button>
                </div>
              </div>

              {/* Preview Results */}
              {fixCoeffPreview && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-4">Preview Changes</h3>

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
                      Status
                    </th>
                  </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fixCoeffPreview.comparison && fixCoeffPreview.comparison.map((row) => (
                    <tr key={row.variable || `row-${Math.random()}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.variable || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.coefficient !== null && row.coefficient !== undefined
                          ? formatComparisonCell('coefficient', row.coefficient, row)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.newCoefficient !== null && row.newCoefficient !== undefined
                          ? formatComparisonCell('newCoefficient', row.newCoefficient, row)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.coefficientPctChange !== null && row.coefficientPctChange !== undefined
                          ? formatComparisonCell('pctChange', row.coefficientPctChange, row)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.tStat !== null && row.tStat !== undefined
                          ? formatComparisonCell('tStat', row.tStat, row)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.newTStat !== null && row.newTStat !== undefined
                          ? formatComparisonCell('newTStat', row.newTStat, row)
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm ${row.fixed ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                          {row.fixed ? 'Fixed' : 'Floating'}
                        </div>
                      </td>
                    </tr>
                  ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">R-squared: {fixCoeffPreview.rsquared?.toFixed(4) || 'N/A'}</p>
                      <p className="text-sm font-medium">Adjusted R-squared: {fixCoeffPreview.rsquared_adj?.toFixed(4) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                    <strong>Note:</strong> Fixed coefficients don't have standard errors or t-statistics.
                  </p>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                onClick={handleCloseFixCoefficientDialog}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                onClick={handleApplyFixedCoefficients}
                disabled={loading || !fixCoeffPreview}
              >
                {loading ? 'Processing...' : 'Apply Fixed Coefficients'}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Date Filter Dialog */}
        <DialogComponent
          width="500px"
          isModal
          visible={showDateFilterDialog}
          close={() => setShowDateFilterDialog(false)}
          header="Filter Date Range"
          showCloseIcon
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
          isModal
          visible={showCreateModelDialog}
          close={() => setShowCreateModelDialog(false)}
          header="Create New Model"
          showCloseIcon
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
                dataSource={availableKpis.map((kpi) => ({ text: kpi, value: kpi }))}
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
                {previewMode === 'add' ? (
                  <p>Adding {variablesToAdd.length} variables</p>
                ) : (
                  <p>Removing {variablesToRemove.length} variables: {variablesToRemove.join(', ')}</p>
                )}
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
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coeff Type
                </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modelComparison.map((row) => {
                      // Determine if variable will be fixed - safely handle potential undefined values
                      let willBeFixed = false;
                      if (previewMode === 'add' && variableCoeffTypes) {
                        // Check if it's a new variable with fixed coefficient
                        const baseVarName = row.variable && row.variable.includes('_adstock_')
                          ? row.variable.split('_adstock_')[0]
                          : row.variable;
                        willBeFixed = variableCoeffTypes[baseVarName] === 'fixed';
                      } else {
                        // For remove, use existing fixed status
                        willBeFixed = fixedCoefficients && row.variable
                          ? fixedCoefficients[row.variable] !== undefined
                          : row.fixed === true;
                      }

                      return (
                        <tr key={row.variable || `row-${Math.random()}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.variable || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('coefficient', row.coefficient, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('newCoefficient', row.newCoefficient, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {row.coefficientPctChange !== null && row.coefficientPctChange !== undefined
                        ? formatComparisonCell('pctChange', row.coefficientPctChange, row)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('tStat', row.tStat, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {formatComparisonCell('newTStat', row.newTStat, row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {row.tStatPctChange !== null && row.tStatPctChange !== undefined
                        ? formatComparisonCell('pctChange', row.tStatPctChange, row)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm ${willBeFixed ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                        {willBeFixed ? 'Fixed' : 'Floating'}
                      </div>
                    </td>
                  </tr>
                      );
                    })}
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
                {loading ? 'Processing...'
                  : previewMode === 'add' ? 'Add Variables' : 'Remove Variables'}
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
