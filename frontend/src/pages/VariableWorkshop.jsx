import React, { useState, useEffect } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { FiDatabase, FiArrowRightCircle, FiArrowLeftCircle } from 'react-icons/fi';
import { MdCallSplit, MdLineWeight } from 'react-icons/md';
import { PiBezierCurve } from 'react-icons/pi';
import { FaXmark } from 'react-icons/fa6';
import { FaWeightHanging } from 'react-icons/fa';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';

const VariableWorkshop = () => {
  const { currentColor } = useStateContext();
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariables, setSelectedVariables] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showMultiplyDialog, setShowMultiplyDialog] = useState(false);
  const [showLeadLagDialog, setShowLeadLagDialog] = useState(false);

  // Split dialog state
  const [splitVariable, setSplitVariable] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [splitIdentifier, setSplitIdentifier] = useState('');

  // Multiply dialog state
  const [multiplyVar1, setMultiplyVar1] = useState('');
  const [multiplyVar2, setMultiplyVar2] = useState('');
  const [multiplyIdentifier, setMultiplyIdentifier] = useState('');

  // Lead/Lag dialog state
  const [leadLagVariable, setLeadLagVariable] = useState('');
  const [leadLagPeriods, setLeadLagPeriods] = useState(1);
  const [leadLagType, setLeadLagType] = useState('LAG');

  // Curves dialog state
  const [showCurveDialog, setShowCurveDialog] = useState(false);
  const [curveType, setCurveType] = useState('ICP');
  const [curveAlpha, setCurveAlpha] = useState(3);
  const [curveBeta, setCurveBeta] = useState(4);
  const [curveGamma, setCurveGamma] = useState(100);
  const [adstockRate, setAdstockRate] = useState(0);
  const [curveIdentifier, setCurveIdentifier] = useState('');

  // Weighted Variables state
  const [showWeightedDialog, setShowWeightedDialog] = useState(false);
  const [weightedName, setWeightedName] = useState('');
  const [weightSignType, setWeightSignType] = useState('mix');
  const [variableWeights, setVariableWeights] = useState({});
  const [weightedResults, setWeightedResults] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingWgtdVar, setEditingWgtdVar] = useState(null);

  // Editing states
  const [editingCell, setEditingCell] = useState({ row: null, column: null });
  const [editValue, setEditValue] = useState('');

  // Transformation options
  const transformOptions = [
    { text: 'None', value: 'NONE' },
    { text: 'Standardize', value: 'STA' },
    { text: 'Subtract Mean', value: 'SUB' },
    { text: 'Divide by KPI Mean', value: 'MDV' },
  ];

  // Get selected variable names
  const getSelectedVariables = () => selectedVariables;

  const fetchVariables = async () => {
    try {
      setLoading(true);
      console.log('Fetching variables from server...');
      const response = await apiService.getVariables();
      console.log('Server response:', response);
      if (response.success) {
        console.log(`Received ${response.variables.length} variables`);
        setVariables(response.variables);
      } else {
        console.error('Failed to load variables:', response.error);
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariables();
  }, []);

  const handleCheckboxClick = (variableName) => {
    setSelectedVariables((prev) => {
      if (prev.includes(variableName)) {
        return prev.filter((v) => v !== variableName);
      }
      return [...prev, variableName];
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Get all visible variables (filtered by search)
      const visibleVariables = variables
        .filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map((v) => v.name);
      setSelectedVariables(visibleVariables);
    } else {
      setSelectedVariables([]);
    }
  };

  const filterVariables = () => {
    if (!searchTerm) return variables;
    return variables.filter((v) => v.name.toLowerCase().includes(searchTerm.toLowerCase())
      || (v.baseVariable && v.baseVariable.toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const handleTransformationChange = async (variableName, newTransformation) => {
    try {
      // If it's a bulk action (more than one variable selected)
      if (selectedVariables.length > 1 && selectedVariables.includes(variableName)) {
        // Apply to all selected variables
        for (const varName of selectedVariables) {
          await apiService.updateVariableTransformation(varName, newTransformation);
        }

        setVariables(variables.map((v) => (selectedVariables.includes(v.name) ? { ...v, transformation: newTransformation } : v)));
      } else {
        // Single variable change
        const response = await apiService.updateVariableTransformation(variableName, newTransformation);
        if (response.success) {
          setVariables(variables.map((v) => (v.name === variableName ? { ...v, transformation: newTransformation } : v)));
        } else {
          console.error('Failed to update transformation:', response.error);
        }
      }
      setEditingCell({ row: null, column: null });
    } catch (error) {
      console.error('Error updating transformation:', error);
    }
  };

  const handleGroupChange = async (variableName, newGroup) => {
    try {
      // If it's a bulk action (more than one variable selected)
      if (selectedVariables.length > 1 && selectedVariables.includes(variableName)) {
        // Apply to all selected variables
        for (const varName of selectedVariables) {
          await apiService.updateVariableGroup(varName, newGroup);
        }

        setVariables(variables.map((v) => (selectedVariables.includes(v.name) ? { ...v, group: newGroup } : v)));
      } else {
        // Single variable change
        const response = await apiService.updateVariableGroup(variableName, newGroup);
        if (response.success) {
          setVariables(variables.map((v) => (v.name === variableName ? { ...v, group: newGroup } : v)));
        } else {
          console.error('Failed to update group:', response.error);
        }
      }
      setEditingCell({ row: null, column: null });
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const handleSaveTransformations = async () => {
    if (!currentDataset) {
      alert('No dataset loaded');
      return;
    }

    try {
      setLoading(true);

      // Prepare transformations object
      const transformations = {};

      variables.forEach((variable) => {
        transformations[variable.name] = {
          transformation: variable.transformation || 'NONE',
          contribution_group: variable.group || 'Other',
          variable_type: variable.type || 'NUMERIC',
          is_transformed: variable.isTransformed || false,
          base_variable: variable.baseVariable || null,
        };
      });

      // Call API to save transformations
      const response = await dbService.saveTransformations(
        currentDataset,
        transformations,
      );

      if (response.success) {
        alert(`Successfully saved transformations for ${response.success_count} variables`);
      } else {
        alert(`Failed to save transformations: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error saving transformations:', error);
      setLoading(false);
      alert(`Error: ${error.message}`);
    }
  };

  // Split variable handler
  const handleSplitVariable = async () => {
    if (selectedVariables.length === 0) {
      alert('Please select at least one variable');
      return;
    }

    try {
      const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : null;
      const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : null;

      console.log('Splitting variables with parameters:', {
        variables: selectedVariables,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        identifier: splitIdentifier,
      });

      const createdVariables = [];

      // Process each selected variable
      for (const variableName of selectedVariables) {
        const response = await apiService.splitVariable(
          variableName,
          formattedStartDate,
          formattedEndDate,
          splitIdentifier,
        );

        if (response.success) {
          createdVariables.push(response.newVariable);
        } else {
          console.error(`Failed to split variable ${variableName}:`, response.error);
        }
      }

      if (createdVariables.length > 0) {
        alert(`Successfully created split variables: ${createdVariables.join(', ')}`);
        fetchVariables();
        setSplitVariable('');
        setStartDate(null);
        setEndDate(null);
        setSplitIdentifier('');
        setShowSplitDialog(false);
      } else {
        alert('Failed to create any split variables');
      }
    } catch (error) {
      console.error('Error splitting variables:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Multiply variables handler
  const handleMultiplyVariables = async () => {
    if (selectedVariables.length !== 2) {
      alert('Please select exactly two variables to multiply');
      return;
    }

    const var1 = selectedVariables[0];
    const var2 = selectedVariables[1];

    try {
      console.log('Multiplying variables with parameters:', {
        var1,
        var2,
        identifier: multiplyIdentifier,
      });

      const response = await apiService.multiplyVariables(
        var1,
        var2,
        multiplyIdentifier,
      );

      if (response.success) {
        alert(`Successfully created new variable: ${response.newVariable}`);
        fetchVariables();
        setMultiplyVar1('');
        setMultiplyVar2('');
        setMultiplyIdentifier('');
        setShowMultiplyDialog(false);
      } else {
        alert(`Failed to multiply variables: ${response.error}`);
      }
    } catch (error) {
      console.error('Error multiplying variables:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Lead/Lag handler
  const handleCreateLeadLag = async () => {
    if (selectedVariables.length === 0) {
      alert('Please select at least one variable');
      return;
    }

    try {
      setLoading(true);

      const createdVariables = [];

      // Process each selected variable
      for (const variableName of selectedVariables) {
        const response = await apiService.createLeadLag(
          variableName,
          leadLagPeriods,
          leadLagType,
        );

        if (response.success) {
          createdVariables.push(response.newVariable);
        } else {
          console.error(`Failed to create ${leadLagType} for ${variableName}:`, response.error);
        }
      }

      if (createdVariables.length > 0) {
        alert(`Successfully created ${leadLagType} variables: ${createdVariables.join(', ')}`);
        fetchVariables();
        setLeadLagVariable('');
        setLeadLagPeriods(1);
        setShowLeadLagDialog(false);
      } else {
        alert(`Failed to create any ${leadLagType} variables`);
      }

      setLoading(false);
    } catch (error) {
      console.error(`Error creating ${leadLagType}:`, error);
      setLoading(false);
      alert(`Error: ${error.message}`);
    }
  };

  // Function to fetch variable coefficients
  const fetchVariableCoefficients = async () => {
    if (selectedVariables.length === 0) {
      alert('Please select at least one variable');
      return;
    }

    try {
      setLoading(true);

      // Get an active model first - you might need to modify this based on your API
      const modelsResponse = await apiService.listModels();
      if (!modelsResponse.success || !modelsResponse.activeModel) {
        alert('No active model found. Please create or load a model first.');
        setLoading(false);
        return;
      }

      const { activeModel } = modelsResponse;

      // Test variables to get coefficients and t-stats
      const response = await apiService.testVariables(
        activeModel,
        selectedVariables,
      );

      if (response.success && response.results) {
      // Transform the results into the format we need
        const results = response.results.map((result) => ({
          variable: result.Variable,
          coefficient: result.Coefficient,
          tStat: result['T-stat'] || result['T-statistic'],
          // Initialize weights based on coefficient sign and sign type
          weight: initializeWeight(result.Coefficient, result['T-stat'] || result['T-statistic'], weightSignType),
        }));

        setWeightedResults(results);

        // Initialize weights object
        const initialWeights = {};
        results.forEach((result) => {
          initialWeights[result.variable] = initializeWeight(
            result.coefficient,
            result.tStat,
            weightSignType,
          );
        });

        setVariableWeights(initialWeights);
      } else {
        alert(`Failed to test variables: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing variables:', error);
      alert(`Error testing variables: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to initialize weights based on coefficient sign and sign type
  const initializeWeight = (coefficient, tStat, signType) => {
  // Only use significant coefficients (t-stat > 1.645)
    const isSignificant = Math.abs(tStat) > 1.645;

    if (!isSignificant) return 0;

    if (signType === 'pos' && coefficient > 0) {
      return coefficient;
    } if (signType === 'neg' && coefficient < 0) {
      return coefficient;
    } if (signType === 'mix') {
      return coefficient;
    }

    return 0;
  };

  // Function to create the weighted variable
  const handleCreateWeightedVariable = async () => {
    if (!weightedName) {
      alert('Please enter a name for the weighted variable');
      return;
    }

    const nonZeroWeights = Object.entries(variableWeights)
      .filter(([_, value]) => value !== 0);

    if (nonZeroWeights.length === 0) {
      alert('Please set at least one non-zero weight');
      return;
    }

    try {
      setLoading(true);

      // Get active model
      const modelsResponse = await apiService.listModels();
      if (!modelsResponse.success || !modelsResponse.activeModel) {
        alert('No active model found. Please create or load a model first.');
        setLoading(false);
        return;
      }

      const { activeModel } = modelsResponse;

      // Create a weighted variable
      const response = await apiService.createWeightedVariable(
        activeModel,
        weightedName,
        variableWeights,
      );

      if (response.success) {
        alert(`Successfully created weighted variable: ${response.newVariable}`);
        setShowWeightedDialog(false);
        setWeightedResults([]);
        setVariableWeights({});
        setWeightedName('');

        // Refresh variables list immediately
        await fetchVariables();

        // Add a small delay and refresh again to ensure the UI updates
        setTimeout(() => {
          fetchVariables();
        }, 1000);
      } else {
        alert(`Failed to create weighted variable: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating weighted variable:', error);
      alert(`Error creating weighted variable: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle editing an existing weighted variable
  const handleEditWeightedVariable = async (wgtdVarName) => {
    try {
      setLoading(true);

      // Get the active model
      const modelsResponse = await apiService.listModels();
      if (!modelsResponse.success || !modelsResponse.activeModel) {
        alert('No active model found.');
        setLoading(false);
        return;
      }

      const { activeModel } = modelsResponse;

      // Get the weighted variable's components
      const response = await apiService.getWeightedVariableComponents(activeModel, wgtdVarName);

      if (response.success) {
      // Set weighted name (remove the |WGTD suffix)
        const baseName = wgtdVarName.split('|WGTD')[0];
        setWeightedName(baseName);

        // Get the component variables and their coefficients
        const components = response.components || {};

        // Set up results for each component variable
        const componentVars = Object.keys(components);

        // Test variables to get their coefficients and t-stats
        const testResponse = await apiService.testVariables(
          activeModel,
          componentVars,
        );

        if (testResponse.success && testResponse.results) {
        // Transform the results into the format we need
          const results = testResponse.results.map((result) => ({
            variable: result.Variable,
            coefficient: result.Coefficient,
            tStat: result['T-stat'] || result['T-statistic'],
          }));

          setWeightedResults(results);

          // Set the weights based on the stored coefficients
          const initialWeights = {};
          results.forEach((result) => {
            initialWeights[result.variable] = components[result.variable] || 0;
          });

          setVariableWeights(initialWeights);

          // Set editing mode to show we're updating, not creating new
          setEditingWgtdVar(wgtdVarName);

          // Show the dialog
          setShowWeightedDialog(true);
        } else {
          alert(`Failed to test component variables: ${testResponse.error || 'Unknown error'}`);
        }
      } else {
        alert(`Failed to get weighted variable components: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error editing weighted variable:', error);
      alert(`Error editing weighted variable: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle updating an existing weighted variable
  const handleUpdateWeightedVariable = async () => {
    if (!editingWgtdVar) {
      alert('No weighted variable selected for update');
      return;
    }

    const nonZeroWeights = Object.entries(variableWeights)
      .filter(([_, value]) => value !== 0);

    if (nonZeroWeights.length === 0) {
      alert('Please set at least one non-zero coefficient');
      return;
    }

    try {
      setLoading(true);

      // Get active model
      const modelsResponse = await apiService.listModels();
      if (!modelsResponse.success || !modelsResponse.activeModel) {
        alert('No active model found.');
        setLoading(false);
        return;
      }

      const { activeModel } = modelsResponse;

      // Update the weighted variable
      const response = await apiService.updateWeightedVariable(
        activeModel,
        editingWgtdVar,
        variableWeights,
      );

      if (response.success) {
        alert(`Successfully updated weighted variable: ${editingWgtdVar}`);
        setShowWeightedDialog(false);
        setWeightedResults([]);
        setVariableWeights({});
        setWeightedName('');
        setEditingWgtdVar(null);

        // Refresh variables
        await fetchVariables();

        // Add a delay and refresh again
        setTimeout(() => {
          fetchVariables();
        }, 1000);
      } else {
        alert(`Failed to update weighted variable: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating weighted variable:', error);
      alert(`Error updating weighted variable: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
    // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
    // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Before mapping over weightedResults, sort them:
  const sortedResults = [...weightedResults].sort((a, b) => {
    if (sortField === '') return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }
    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  });

  // Function to handle curve creation
  const handleCreateCurve = async () => {
    if (selectedVariables.length === 0) {
      alert('Please select at least one variable');
      return;
    }

    try {
      setLoading(true);

      // Process each selected variable
      for (const variableName of selectedVariables) {
      // Create identifier string
        const identifier = curveIdentifier
        || `${curveType}_a${curveAlpha}_b${curveBeta}_g${curveGamma}${adstockRate > 0 ? `_ads${adstockRate}` : ''}`;

        // Call API to create curve
        const response = await apiService.createVariableCurve(
          variableName,
          curveType,
          curveAlpha,
          curveBeta,
          curveGamma,
          adstockRate / 100, // Convert percentage to decimal
          identifier,
        );

        if (!response.success) {
          alert(`Failed to create curve for ${variableName}: ${response.error}`);
          setLoading(false);
          return;
        }
      }

      // Close dialog and reset selection
      setShowCurveDialog(false);

      // Refresh variables
      fetchVariables();

      alert(`Successfully created curves for ${selectedVariables.length} variable(s)`);
      setLoading(false);
    } catch (error) {
      console.error('Error creating curves:', error);
      setLoading(false);
      alert('Error creating curves');
    }
  };

  // Renders a badge-like element for variable types
  const renderTypeBadge = (type) => {
    let bgColor = '';
    const textColor = 'text-white';

    switch (type) {
      case 'NUMERIC':
        bgColor = 'bg-blue-500';
        break;
      case 'CATEGORICAL':
        bgColor = 'bg-purple-500';
        break;
      case 'DATE':
        bgColor = 'bg-green-500';
        break;
      default:
        bgColor = 'bg-gray-500';
    }

    return (
      <span className={`${bgColor} ${textColor} px-2 py-1 rounded-full text-xs inline-block`}>
        {type}
      </span>
    );
  };

  // Renders a transformation badge
  const renderTransformation = (transformation, variableName) => {
    const isEditing = editingCell.row === variableName && editingCell.column === 'transformation';

    if (isEditing) {
      return (
        <DropDownListComponent
          id={`transform-${variableName}`}
          dataSource={transformOptions}
          fields={{ text: 'text', value: 'value' }}
          value={transformation || 'NONE'}
          change={(e) => handleTransformationChange(variableName, e.value)}
          style={{ width: '100%' }}
          autoFocus
          closeOnSelect
        />
      );
    }

    const transformText = transformation || 'NONE';
    const bgColor = transformText === 'NONE' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800';

    return (
      <span
        className={`${bgColor} px-2 py-1 rounded-md text-xs font-medium cursor-pointer`}
        onClick={() => setEditingCell({ row: variableName, column: 'transformation' })}
      >
        {transformText}
      </span>
    );
  };

  // Renders a badge for transformed variables
  const renderTransformedBadge = (isTransformed) => {
    if (isTransformed) {
      return (
        <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs inline-block">
          Transformed
        </span>
      );
    }
    return (
      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs inline-block">
        Original
      </span>
    );
  };

  // Renders an editable group cell
  const renderGroupCell = (group, variableName) => {
    const isEditing = editingCell.row === variableName && editingCell.column === 'group';

    if (isEditing) {
      return (
        <input
          type="text"
          className="border border-gray-300 rounded p-1 w-full"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleGroupChange(variableName, editValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleGroupChange(variableName, editValue);
            } else if (e.key === 'Escape') {
              setEditingCell({ row: null, column: null });
            }
          }}
          autoFocus
        />
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
        onClick={() => {
          setEditingCell({ row: variableName, column: 'group' });
          setEditValue(group || 'Other');
        }}
      >
        {group || 'Other'}
      </span>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <Header category="Data Management" title="Variable Workshop" />

      {/* Transformation Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        <ButtonComponent
          cssClass="e-info"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => {
            console.log('Split by Date button clicked'); // Add this line for debugging
            setShowSplitDialog(true);
          }}
        >
          <div className="flex items-center gap-1">
            <MdCallSplit className="mr-1" />
            Split Variable
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass="e-info"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => setShowMultiplyDialog(true)}
        >
          <div className="flex items-center gap-1">
            <FaXmark className="mr-1" />
            Multiply Variables
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass="e-info"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => { setLeadLagType('LAG'); setShowLeadLagDialog(true); }}
        >
          <div className="flex items-center gap-1">
            <FiArrowLeftCircle className="mr-1" />
            Create Lag
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass="e-info"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => { setLeadLagType('LEAD'); setShowLeadLagDialog(true); }}
        >
          <div className="flex items-center gap-1">
            <FiArrowRightCircle className="mr-1" />
            Create Lead
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass="e-info"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => {
            if (selectedVariables.length === 1 && selectedVariables[0].includes('|WGTD')) {
              // A single weighted variable is selected, load its components
              handleEditWeightedVariable(selectedVariables[0]);
            } else {
              // Normal case - creating a new weighted variable
              setShowWeightedDialog(true);
            }
          }}
        >
          <div className="flex items-center gap-1">
            <MdLineWeight className="mr-1" />
            WEIGHTED VARIABLE
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass="e-info"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => setShowCurveDialog(true)}
        >
          <div className="flex items-center gap-1">
            <PiBezierCurve className="mr-1" />
            CREATE CURVE
          </div>
        </ButtonComponent>

        <div className="ml-auto">
          <ButtonComponent
            onClick={fetchVariables}
            cssClass="e-info"
            style={{ backgroundColor: currentColor, borderColor: currentColor }}
          >
            <div className="flex items-center gap-1">
              <FiDatabase className="mr-1" />
              Refresh Variables
            </div>
          </ButtonComponent>
        </div>
      </div>

      {/* Variables Display */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" style={{ borderColor: currentColor }} />
          <p className="ml-2">Loading variables...</p>
        </div>
      ) : variables.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <FiDatabase className="text-5xl mb-3 text-gray-400" />
          <p className="text-gray-500 mb-2">No variables found</p>
          <p className="text-gray-400 text-sm">Please upload a data file first on the Data Upload page</p>
        </div>
      ) : (
        <div>
          {/* Search Bar */}
          <div className="flex justify-end mb-4">
            <div className="relative w-64">
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600"
                      checked={selectedVariables.length > 0 && selectedVariables.length === filterVariables().length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Variable Name
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Base Variable
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Transformation
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Group
                  </th>
                </tr>
              </thead>
              <tbody>
                {filterVariables().map((variable, index) => (
                  <tr key={variable.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-200 text-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={selectedVariables.includes(variable.name)}
                        onChange={() => handleCheckboxClick(variable.name)}
                      />
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200 font-medium">{variable.name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {renderTypeBadge(variable.type)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {renderTransformedBadge(variable.isTransformed)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">{variable.baseVariable || '-'}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {renderTransformation(variable.transformation, variable.name)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {renderGroupCell(variable.group, variable.name)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Split by Date Dialog */}
      <DialogComponent
        width="500px"
        isModal
        visible={showSplitDialog}
        close={() => setShowSplitDialog(false)}
        header="Split Variable by Date"
        showCloseIcon
        target="#root" // Add this line to ensure dialog appears on top of content
        zIndex={1000} // Add this line to ensure proper stacking
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected Variables
            </label>
            <div className="p-2 border border-gray-300 rounded-md bg-gray-50 min-h-10">
              {selectedVariables.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedVariables.map((v) => (
                    <li key={v} className="text-sm">{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No variables selected</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="split-start-date" className="block text-gray-700 text-sm font-bold mb-2">
              Start Date (Optional)
            </label>
            <DatePickerComponent
              id="split-start-date"
              placeholder="Select Start Date"
              value={startDate}
              change={(args) => setStartDate(args.value)}
              format="yyyy-MM-dd"
              style={{ width: '100%' }}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="split-end-date" className="block text-gray-700 text-sm font-bold mb-2">
              End Date (Optional)
            </label>
            <DatePickerComponent
              id="split-end-date"
              placeholder="Select End Date"
              value={endDate}
              change={(args) => setEndDate(args.value)}
              format="yyyy-MM-dd"
              style={{ width: '100%' }}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="split-identifier" className="block text-gray-700 text-sm font-bold mb-2">
              Identifier (Optional)
            </label>
            <input
              id="split-identifier"
              type="text"
              className="border-1 border-gray-300 rounded-md p-2 w-full"
              placeholder="e.g., 'Summer', 'Q1', etc."
              value={splitIdentifier}
              onChange={(e) => setSplitIdentifier(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <ButtonComponent onClick={() => setShowSplitDialog(false)}>
              Cancel
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-success"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={handleSplitVariable}
            >
              Split Variable
            </ButtonComponent>
          </div>
        </div>
      </DialogComponent>

      {/* Multiply Variables Dialog */}
      <DialogComponent
        width="500px"
        isModal
        visible={showMultiplyDialog}
        close={() => setShowMultiplyDialog(false)}
        header="Multiply Variables"
        showCloseIcon
        target="#root"
        zIndex={1000}
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected Variables
            </label>
            <div className="p-2 border border-gray-300 rounded-md bg-gray-50 min-h-10">
              {selectedVariables.length === 2 ? (
                <div>
                  <p className="text-sm font-medium">Variables to multiply:</p>
                  <ul className="list-disc pl-5">
                    <li className="text-sm">{selectedVariables[0]}</li>
                    <li className="text-sm">{selectedVariables[1]}</li>
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Please select exactly 2 variables to multiply</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="multiply-identifier" className="block text-gray-700 text-sm font-bold mb-2">
              Identifier (Optional)
            </label>
            <input
              id="multiply-identifier"
              type="text"
              className="border-1 border-gray-300 rounded-md p-2 w-full"
              placeholder="e.g., 'Interaction', 'Effect', etc."
              value={multiplyIdentifier}
              onChange={(e) => setMultiplyIdentifier(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <ButtonComponent onClick={() => setShowMultiplyDialog(false)}>
              Cancel
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-success"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={handleMultiplyVariables}
            >
              Multiply Variables
            </ButtonComponent>
          </div>
        </div>
      </DialogComponent>

      {/* Lead/Lag Dialog */}
      <DialogComponent
        width="500px"
        isModal
        visible={showLeadLagDialog}
        close={() => setShowLeadLagDialog(false)}
        header={`Create ${leadLagType}`}
        showCloseIcon
        target="#root"
        zIndex={1000}
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected Variables
            </label>
            <div className="p-2 border border-gray-300 rounded-md bg-gray-50 min-h-10">
              {selectedVariables.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedVariables.map((v) => (
                    <li key={v} className="text-sm">{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No variables selected</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="leadlag-periods" className="block text-gray-700 text-sm font-bold mb-2">
              Number of Periods
            </label>
            <input
              id="leadlag-periods"
              type="number"
              min="1"
              max="12"
              className="border-1 border-gray-300 rounded-md p-2 w-full"
              value={leadLagPeriods}
              onChange={(e) => setLeadLagPeriods(parseInt(e.target.value, 10))}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <ButtonComponent onClick={() => setShowLeadLagDialog(false)}>
              Cancel
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-success"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={handleCreateLeadLag}
            >
              Create {leadLagType}
            </ButtonComponent>
          </div>
        </div>
      </DialogComponent>

      {/* Weighted Variable Dialog */}
      <DialogComponent
        width="700px" // Make it wider to fit the table
        isModal
        visible={showWeightedDialog}
        close={() => setShowWeightedDialog(false)}
        header="Create Weighted Variable"
        showCloseIcon
        target="#root"
        zIndex={1000}
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected Variables
            </label>
            <div className="p-2 border border-gray-300 rounded-md bg-gray-50 min-h-10">
              {selectedVariables.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedVariables.map((v) => (
                    <li key={v} className="text-sm">{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No variables selected</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="weighted-name" className="block text-gray-700 text-sm font-bold mb-2">
                Weighted Variable Name
              </label>
              <input
                id="weighted-name"
                type="text"
                className="border-1 border-gray-300 rounded-md p-2 w-full"
                placeholder="e.g., 'MediaMix', 'PriceIndex'"
                value={weightedName}
                onChange={(e) => setWeightedName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="sign-type" className="block text-gray-700 text-sm font-bold mb-2">
                Coefficient Sign Type
              </label>
              <select
                id="sign-type"
                className="border-1 border-gray-300 rounded-md p-2 w-full"
                value={weightSignType}
                onChange={(e) => setWeightSignType(e.target.value)}
              >
                <option value="pos">Positive Only</option>
                <option value="neg">Negative Only</option>
                <option value="mix">Mixed (Both)</option>
              </select>
            </div>
          </div>

          {weightedResults.length > 0 ? (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Variable Coefficients</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th
                        className="py-2 px-4 border-b text-left cursor-pointer"
                        onClick={() => handleSort('variable')}
                      >
                  Variable
                        {sortField === 'variable' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                      </th>
                      <th
                        className="py-2 px-4 border-b text-right cursor-pointer"
                        onClick={() => handleSort('coefficient')}
                      >
                  Coefficient
                        {sortField === 'coefficient' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                      </th>
                      <th
                        className="py-2 px-4 border-b text-right cursor-pointer"
                        onClick={() => handleSort('tStat')}
                      >
                  T-Stat
                        {sortField === 'tStat' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                      </th>
                      <th className="py-2 px-4 border-b text-right">
                        Coefficient Used
                </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightedResults.map((result, index) => {
                      // Determine colors based on coefficient sign and significance
                      const isSignificant = Math.abs(result.tStat) > 1.645;
                      const coefColor = result.coefficient > 0 ? 'green' : 'red';
                      const tStatColor = isSignificant
                        ? (result.coefficient > 0 ? 'green' : 'red')
                        : 'black';

                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b">{result.variable}</td>
                    <td className="py-2 px-4 border-b text-right">
                      <span style={{ color: coefColor }}>
                        {result.coefficient.toFixed(4)}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-right">
                      <span style={{ color: tStatColor }}>
                        {result.tStat.toFixed(4)}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="border rounded p-1 w-20 text-right"
                        value={variableWeights[result.variable] || 0}
                        onChange={(e) => {
                          const newWeights = { ...variableWeights };
                          newWeights[result.variable] = parseFloat(e.target.value) || 0;
                          setVariableWeights(newWeights);
                        }}
                      />
                    </td>
                  </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <ButtonComponent
                cssClass="e-info"
                style={{ backgroundColor: currentColor, borderColor: currentColor }}
                onClick={fetchVariableCoefficients}
              >
                Test Selected Variables
              </ButtonComponent>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <ButtonComponent onClick={() => {
              setShowWeightedDialog(false);
              setWeightedResults([]);
              setVariableWeights({});
              setWeightedName('');
              setEditingWgtdVar(null);
            }}
            >
              Cancel
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-success"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={editingWgtdVar ? handleUpdateWeightedVariable : handleCreateWeightedVariable}
              disabled={!weightedName || weightedResults.length === 0}
            >
              {editingWgtdVar ? 'Update Weighted Variable' : 'Create Weighted Variable'}
            </ButtonComponent>
          </div>
        </div>
      </DialogComponent>

      {/* Curves Dialog */}
      <DialogComponent
        width="500px"
        isModal
        visible={showCurveDialog}
        close={() => setShowCurveDialog(false)}
        header="Create Curve Transformation"
        showCloseIcon
        target="#root"
        zIndex={1000}
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected Variables
            </label>
            <div className="p-2 border border-gray-300 rounded-md bg-gray-50 min-h-10">
              {selectedVariables.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedVariables.map((v) => (
                    <li key={v} className="text-sm">{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No variables selected</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Curve Type
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="icp-curve"
                  type="radio"
                  name="curve-type"
                  value="ICP"
                  checked={curveType === 'ICP'}
                  onChange={() => setCurveType('ICP')}
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
                  onChange={() => setCurveType('ADBUG')}
                  className="h-4 w-4 text-blue-600 border-gray-300"
                />
                <label htmlFor="adbug-curve" className="ml-2 text-sm text-gray-700">
                  ADBUG (Diminishing Returns)
                </label>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="adstock-rate" className="block text-sm font-medium text-gray-700 mb-1">
              Adstock Rate (0-100%)
            </label>
            <input
              id="adstock-rate"
              type="number"
              min="0"
              max="100"
              className="border-1 border-gray-300 rounded-md p-2 w-full"
              value={adstockRate}
              onChange={(e) => setAdstockRate(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Adstock will be applied first, followed by the curve transformation
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="curve-alpha" className="block text-sm font-medium text-gray-700 mb-1">
                Alpha
              </label>
              <input
                id="curve-alpha"
                type="number"
                step="0.1"
                className="border-1 border-gray-300 rounded-md p-2 w-full"
                value={curveAlpha}
                onChange={(e) => setCurveAlpha(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label htmlFor="curve-beta" className="block text-sm font-medium text-gray-700 mb-1">
                Beta
              </label>
              <input
                id="curve-beta"
                type="number"
                step="0.1"
                className="border-1 border-gray-300 rounded-md p-2 w-full"
                value={curveBeta}
                onChange={(e) => setCurveBeta(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label htmlFor="curve-gamma" className="block text-sm font-medium text-gray-700 mb-1">
                Gamma
              </label>
              <input
                id="curve-gamma"
                type="number"
                step="1"
                className="border-1 border-gray-300 rounded-md p-2 w-full"
                value={curveGamma}
                onChange={(e) => setCurveGamma(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="curve-identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Identifier (Optional)
            </label>
            <input
              id="curve-identifier"
              type="text"
              className="border-1 border-gray-300 rounded-md p-2 w-full"
              placeholder="e.g., 'high_response', 'steep', etc."
              value={curveIdentifier}
              onChange={(e) => setCurveIdentifier(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <ButtonComponent onClick={() => setShowCurveDialog(false)}>
              Cancel
            </ButtonComponent>
            <ButtonComponent
              cssClass="e-success"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={handleCreateCurve}
            >
              Create Curve
            </ButtonComponent>
          </div>
        </div>
      </DialogComponent>

      <style>
        {`
        .e-grid .e-rowcell {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .e-grid .e-headercell {
          background-color: #f8f9fa;
          font-weight: bold;
        }

        .e-grid .e-row:hover {
          background-color: #f1f5fb !important;
        }

        .e-btn.e-info {
          color: white;
        }
        `}
      </style>
    </div>
  );
};

export default VariableWorkshop;
