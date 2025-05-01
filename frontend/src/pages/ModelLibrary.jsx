// src/pages/ModelLibrary.jsx - Fixed version

import React, { useState, useEffect, useRef } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Inject,
  Toolbar,
  Edit,
  Sort,
  Filter
} from '@syncfusion/ej2-react-grids';
import {
  DropDownListComponent
} from '@syncfusion/ej2-react-dropdowns';
import {
  ButtonComponent
} from '@syncfusion/ej2-react-buttons';
import {
  DialogComponent
} from '@syncfusion/ej2-react-popups';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';
import { FiSave, FiRefreshCw, FiDownload, FiEdit, FiTrash2, FiCopy, FiPlus, FiFilter, FiSearch } from 'react-icons/fi';
import { MdCompareArrows } from 'react-icons/md';

const ModelLibrary = () => {
  const { currentColor } = useStateContext();

  // States for models
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [exportPath, setExportPath] = useState('');

  // State for dialogs
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  // States for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // States for renaming (without dialog)
  const [editingModelName, setEditingModelName] = useState(null);
  const [newModelName, setNewModelName] = useState('');
  const modelNameInputRef = useRef(null);

  // State for comparison data
  const [comparisonData, setComparisonData] = useState([]);

  // State for model creation
  const [newModelNameForCreate, setNewModelNameForCreate] = useState('');
  const [selectedKPI, setSelectedKPI] = useState('');
  const [variables, setVariables] = useState([]);

  // State for date filtering
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reference for the grid
  const gridRef = React.useRef(null);

  // Load models on component mount
  useEffect(() => {
    fetchModels();
    fetchVariables();
  }, []);

  // Focus on input when editing model name
  useEffect(() => {
    if (editingModelName && modelNameInputRef.current) {
      modelNameInputRef.current.focus();
    }
  }, [editingModelName]);

  // Fetch models from API
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await apiService.listModels();
      if (response.success) {
        // No need for notes now
        const enhancedModels = response.models.map(model => ({
          ...model,
          lastModified: model.created || 'Unknown'
        }));

        setModels(enhancedModels);
        setFilteredModels(enhancedModels);
      } else {
        setError('Failed to load models: ' + response.error);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Error loading models: ' + error.message);
      setLoading(false);
    }
  };

  const fetchVariables = async () => {
    try {
      const response = await apiService.getVariables();
      if (response.success) {
        setVariables(response.variables);
      } else {
        console.error('Failed to fetch variables:', response.error);
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  // Function to handle model creation
  const handleCreateModel = async () => {
    if (!newModelNameForCreate) {
      setError('Please enter a model name');
      return;
    }

    if (!selectedKPI) {
      setError('Please select a KPI variable');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.createModel(newModelNameForCreate, selectedKPI);

      if (response.success) {
        setSuccess(`Model "${newModelNameForCreate}" created successfully`);
        setNewModelNameForCreate('');
        setSelectedKPI('');
        fetchModels(); // Refresh the model list
      } else {
        setError(`Failed to create model: ${response.error}`);
      }
    } catch (error) {
      console.error('Error creating model:', error);
      setError(`Error creating model: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Functions for inline model name editing
  const startModelNameEdit = (modelName) => {
    setEditingModelName(modelName);
    setNewModelName(modelName);
  };

  const cancelModelNameEdit = () => {
    setEditingModelName(null);
    setNewModelName('');
  };

  const handleModelNameKeyDown = (e, originalName) => {
    if (e.key === 'Enter') {
      saveModelName(originalName);
    } else if (e.key === 'Escape') {
      cancelModelNameEdit();
    }
  };

  const saveModelName = async (originalName) => {
    if (!newModelName.trim() || newModelName === originalName) {
      cancelModelNameEdit();
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.renameModel(originalName, newModelName);

      if (response.success) {
        setSuccess(`Model renamed from "${originalName}" to "${newModelName}"`);
        await fetchModels(); // Refresh the model list
      } else {
        setError('Failed to rename model: ' + response.error);
      }
    } catch (error) {
      console.error('Error renaming model:', error);
      setError('Error renaming model: ' + error.message);
    } finally {
      setLoading(false);
      setEditingModelName(null);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const text = e.target.value;
    setSearchText(text);

    if (text) {
      const filtered = models.filter(
        model => model.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredModels(filtered);
    } else {
      setFilteredModels(models);
    }
  };

  // Handle model selection
  const handleModelSelect = (model) => {
    setSelectedModels(prev => {
      if (prev.includes(model.name)) {
        return prev.filter(name => name !== model.name);
      } else {
        // Limit to 2 selections for comparison
        if (prev.length < 2) {
          return [...prev, model.name];
        } else {
          // Replace the oldest selection
          return [prev[1], model.name];
        }
      }
    });
  };

  // Compare selected models
  const compareModels = async () => {
    if (selectedModels.length !== 2) {
      setError('Please select exactly two models to compare');
      return;
    }

    try {
      setLoading(true);

      // Get variables for both models
      const model1Resp = await apiService.getModelVariables(selectedModels[0]);
      const model2Resp = await apiService.getModelVariables(selectedModels[1]);

      if (!model1Resp.success || !model2Resp.success) {
        setError('Failed to load model variables');
        setLoading(false);
        return;
      }

      // Combine variables for comparison
      const model1Vars = model1Resp.variables.reduce((acc, v) => {
        acc[v.name] = v;
        return acc;
      }, {});

      const model2Vars = model2Resp.variables.reduce((acc, v) => {
        acc[v.name] = v;
        return acc;
      }, {});

      // Get all unique variable names
      const allVars = new Set([
        ...Object.keys(model1Vars),
        ...Object.keys(model2Vars)
      ]);

      // Create comparison data
      const comparison = Array.from(allVars).map(varName => {
        const var1 = model1Vars[varName];
        const var2 = model2Vars[varName];

        let coefChange = null;
        let tStatChange = null;

        if (var1 && var2 && var1.coefficient && var2.coefficient) {
          // Calculate percentage changes
          if (var1.coefficient !== 0) {
            coefChange = ((var2.coefficient - var1.coefficient) / Math.abs(var1.coefficient)) * 100;
          }

          if (var1.tStat !== 0) {
            tStatChange = ((var2.tStat - var1.tStat) / Math.abs(var1.tStat)) * 100;
          }
        }

        return {
          variableName: varName,
          model1Name: selectedModels[0],
          model2Name: selectedModels[1],
          model1Coef: var1 ? var1.coefficient : null,
          model1TStat: var1 ? var1.tStat : null,
          model2Coef: var2 ? var2.coefficient : null,
          model2TStat: var2 ? var2.tStat : null,
          coefChange: coefChange,
          tStatChange: tStatChange,
          inModel1: !!var1,
          inModel2: !!var2
        };
      });

      // Sort by variable name
      comparison.sort((a, b) => {
        // Put const first
        if (a.variableName === 'const') return -1;
        if (b.variableName === 'const') return 1;
        return a.variableName.localeCompare(b.variableName);
      });

      setComparisonData(comparison);
      setShowCompareDialog(true);
      setLoading(false);
    } catch (error) {
      console.error('Error comparing models:', error);
      setError('Error comparing models: ' + error.message);
      setLoading(false);
    }
  };

  // Export model to Excel - Fixed implementation
  const exportModel = async (modelName) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Find the model to get its export path
      const model = models.find(m => m.name === modelName);
      let modelPath = model?.exportPath || "";

      // If a path is provided, ensure it ends with a filename
      if (modelPath) {
        // Check if the path is a directory (doesn't end with .xlsx)
        if (!modelPath.toLowerCase().endsWith('.xlsx')) {
          // Append a separator if needed
          if (!modelPath.endsWith('\\') && !modelPath.endsWith('/')) {
            modelPath += '\\';
          }
          // Add the filename
          modelPath += `${modelName}.xlsx`;
        }
      }

      console.log(`Exporting model: ${modelName}, Path: ${modelPath}`);

      // Call the API with the model's path
      const response = await apiService.exportModelToExcel(modelName, modelPath);
      console.log("Export response:", response);

      if (response.success) {
        setSuccess(`Model "${modelName}" exported successfully to ${response.filePath || 'downloads'}`);
      } else {
        // Handle API error
        const errorMsg = response.error || 'Unknown error occurred';
        console.error("Export failed:", errorMsg);
        setError(`Export failed: ${errorMsg}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in export function:', error);
      setError(`Export error: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Clone a model
  const cloneModel = async (modelName) => {
    // Prompt for new model name
    const newModelName = prompt(`Enter a name for the cloned model of "${modelName}":`, `${modelName}_clone`);

    if (!newModelName) return;

    try {
      setLoading(true);

      const response = await apiService.cloneModel(modelName, newModelName);

      if (response.success) {
        setSuccess(`Model "${modelName}" cloned successfully as "${newModelName}"`);
        fetchModels(); // Refresh models list
      } else {
        setError('Failed to clone model: ' + response.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error cloning model:', error);
      setError('Error cloning model: ' + error.message);
      setLoading(false);
    }
  };

  // Apply date filter
  const handleApplyDateFilter = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);

      // Convert string dates to Date objects for filtering
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        setError('Start date must be before end date');
        setLoading(false);
        return;
      }

      // Assuming you have a model selected - use the first selected model or ask user
      const modelToFilter = selectedModels.length > 0 ?
                            selectedModels[0] :
                            prompt("Enter the name of the model to filter:");

      if (!modelToFilter) {
        setLoading(false);
        return;
      }

      const response = await apiService.filterModel(modelToFilter, start, end);

      if (response.success) {
        setSuccess(`Model "${modelToFilter}" filtered to date range: ${startDate} to ${endDate}`);
        // Optionally refresh model list to show updated stats
        fetchModels();
      } else {
        setError(`Failed to filter model: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error filtering model dates:', error);
      setError(`Error filtering dates: ${error.message}`);
      setLoading(false);
    }
  };

  // Delete a model (confirmation required)
  const deleteModel = async (modelName) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete model "${modelName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);

      const response = await apiService.deleteModel(modelName);

      if (response.success) {
        setSuccess(`Model "${modelName}" deleted successfully`);
        fetchModels(); // Refresh models list
      } else {
        setError('Failed to delete model: ' + response.error);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error deleting model:', error);
      setError('Error deleting model: ' + error.message);
      setLoading(false);
    }
  };

  // Template for the action buttons column
  const actionsTemplate = (props) => {
    return (
      <div className="flex space-x-2">
        <button
          onClick={() => startModelNameEdit(props.name)}
          className="p-1 text-indigo-600 hover:bg-indigo-100 rounded"
          title="Rename Model"
        >
          <FiEdit size={18} />
        </button>
        <button
          onClick={() => exportModel(props.name)}
          className="p-1 text-green-600 hover:bg-green-100 rounded"
          title="Export Model"
        >
          <FiDownload size={18} />
        </button>
        <button
          onClick={() => cloneModel(props.name)}
          className="p-1 text-purple-600 hover:bg-purple-100 rounded"
          title="Clone Model"
        >
          <FiCopy size={18} />
        </button>
        <button
          onClick={() => deleteModel(props.name)}
          className="p-1 text-red-600 hover:bg-red-100 rounded"
          title="Delete Model"
        >
          <FiTrash2 size={18} />
        </button>
      </div>
    );
  };

  // Custom template for model name column to allow inline editing
  const modelNameTemplate = (props) => {
    if (editingModelName === props.name) {
      return (
        <div className="flex items-center">
          <input
            ref={modelNameInputRef}
            type="text"
            className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            onKeyDown={(e) => handleModelNameKeyDown(e, props.name)}
            onBlur={() => saveModelName(props.name)}
          />
          <button
            className="ml-2 text-green-500"
            onClick={() => saveModelName(props.name)}
          >
            <FiSave size={16} />
          </button>
        </div>
      );
    }
    return <div className="cursor-pointer hover:text-blue-600" onDoubleClick={() => startModelNameEdit(props.name)}>{props.name}</div>;
  };

  // Template for the selection column
  const selectionTemplate = (props) => {
    return (
      <input
        type="checkbox"
        checked={selectedModels.includes(props.name)}
        onChange={() => handleModelSelect(props)}
        className="form-checkbox h-5 w-5 text-blue-600"
      />
    );
  };

  // Format the coefficient or t-stat column for comparison table
  const formatComparisonCell = (value, change = null) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <div className="flex flex-col">
        <span>{parseFloat(value).toFixed(4)}</span>
        {change !== null && (
          <span
            className={`text-xs ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}`}
          >
            {change > 0 ? '↑' : change < 0 ? '↓' : ''} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <ErrorBoundary>
        <Header category="Modeling" title="Model Library" />

        {/* Top section with search, compare and refresh buttons moved to the right */}
        <div className="mb-6 flex justify-end items-center">
          <div className="flex flex-wrap gap-3 items-center">


            {/* Compare button */}
            <ButtonComponent
              cssClass="e-primary"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={compareModels}
              disabled={selectedModels.length !== 2 || loading}
            >
              <div className="flex items-center">
                <MdCompareArrows className="mr-1" />
                Compare Models
              </div>
            </ButtonComponent>

            {/* Refresh button */}
            <ButtonComponent
              cssClass="e-info"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={fetchModels}
              disabled={loading}
            >
              <div className="flex items-center">
                <FiRefreshCw className="mr-1" />
                Refresh
              </div>
            </ButtonComponent>
                        {/* Search box - Now positioned to the right of the buttons */}
                        <div className="relative w-56">
              <input
                type="text"
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search models..."
                value={searchText}
                onChange={handleSearchChange}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            {success}
          </div>
        )}

        {/* Left section boxes - original layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="col-span-1">
            {/* Create New Model */}
            <div className="border rounded-md p-4 bg-gray-50 mb-6">
              <h3 className="text-lg font-semibold mb-3">Create New Model</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter model name"
                  value={newModelNameForCreate}
                  onChange={(e) => setNewModelNameForCreate(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select KPI Variable</label>
                <DropDownListComponent
                  dataSource={variables.map(v => ({ text: v.name, value: v.name }))}
                  fields={{ text: 'text', value: 'value' }}
                  value={selectedKPI}
                  change={(e) => setSelectedKPI(e.value)}
                  placeholder="Select KPI variable"
                  style={{ width: '100%' }}
                />
              </div>
              <ButtonComponent
                cssClass="e-success"
                style={{
                  backgroundColor: currentColor,
                  borderColor: currentColor,
                  width: '100%'
                }}
                onClick={handleCreateModel}
                disabled={!newModelNameForCreate || !selectedKPI || loading}
              >
                <div className="flex items-center justify-center">
                  <FiPlus className="mr-1" />
                  CREATE MODEL
                </div>
              </ButtonComponent>
            </div>

            {/* Modeling Period */}
            <div className="border rounded-md p-4 bg-gray-50 mb-6">
              <h3 className="text-lg font-semibold mb-3">Modeling Period</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-500 mb-4">
                This will filter the selected models to use data only from the specified date range.
              </div>
              <ButtonComponent
                cssClass="e-success"
                style={{
                  backgroundColor: currentColor,
                  borderColor: currentColor,
                  width: '100%'
                }}
                onClick={handleApplyDateFilter}
                disabled={!startDate || !endDate || loading}
              >
                <div className="flex items-center justify-center">
                  <FiFilter className="mr-1" />
                  APPLY DATE FILTER
                </div>
              </ButtonComponent>
            </div>
          </div>

          <div className="col-span-2">
            {/* Models Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
                  style={{ borderColor: currentColor }}
                ></div>
                <p className="ml-2">Loading models...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <GridComponent
                  dataSource={filteredModels}
                  allowPaging={true}
                  allowSorting={true}
                  pageSettings={{ pageSize: 10 }}
                  height="500px"
                  width="100%"
                >
                  <ColumnsDirective>
                    <ColumnDirective
                      field="selection"
                      headerText=""
                      width="50"
                      template={selectionTemplate}
                      textAlign="Center"
                    />
                    <ColumnDirective
                      field="name"
                      headerText="Model Name"
                      width="200"
                      template={modelNameTemplate}
                    />
                    <ColumnDirective field="kpi" headerText="KPI" width="150" />
                    <ColumnDirective field="variables" headerText="Variables" width="100" textAlign="Center" />
                    <ColumnDirective
                      field="rsquared"
                      headerText="R²"
                      width="100"
                      format="P4"
                      textAlign="Right"
                      template={(props) => (
                        <div>{props.rsquared !== null ? (props.rsquared * 100).toFixed(2) + '%' : '-'}</div>
                      )}
                    />
                    <ColumnDirective field="lastModified" headerText="Last Modified" width="150" />
                    <ColumnDirective
  field="exportPath"
  headerText="Export Path"
  width="200"
  template={(props) => (
    <div className="relative">
      <input
        type="text"
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        placeholder="Export path (optional)"
        defaultValue={props.exportPath || ""}
        onChange={(e) => {
          // Update the model's export path in the local state
          const updatedModels = models.map(model =>
            model.name === props.name ? {...model, exportPath: e.target.value} : model
          );
          setModels(updatedModels);

          // Also update filtered models
          const updatedFilteredModels = filteredModels.map(model =>
            model.name === props.name ? {...model, exportPath: e.target.value} : model
          );
          setFilteredModels(updatedFilteredModels);
        }}
      />
    </div>
  )}
/>
                    <ColumnDirective
                      field="actions"
                      headerText="Actions"
                      width="180"
                      template={actionsTemplate}
                    />
                  </ColumnsDirective>
                  <Inject services={[Page, Sort]} />
                </GridComponent>
              </div>
            )}
          </div>
        </div>

        {/* Compare Models Dialog */}
        <DialogComponent
          width="90%"
          height="80%"
          isModal={true}
          showCloseIcon={true}
          visible={showCompareDialog}
          close={() => setShowCompareDialog(false)}
          header="Model Comparison"
        >
          {comparisonData.length > 0 ? (
            <div className="p-4 overflow-y-auto h-full">
              <div className="mb-4 flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Comparing Models:</h3>
                  <p className="text-gray-600">
                    <span className="font-medium">{selectedModels[0]}</span> vs <span className="font-medium">{selectedModels[1]}</span>
                  </p>
                </div>

                <ButtonComponent
                  cssClass="e-success"
                  style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                  onClick={() => {
                    // Implement export to Excel/CSV
                    alert('Export comparison functionality would be implemented here');
                  }}
                >
                  <div className="flex items-center">
                    <FiDownload className="mr-1" />
                    Export Comparison
                  </div>
                </ButtonComponent>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variable
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present In
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedModels[0]} Coefficient
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedModels[0]} T-Stat
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedModels[1]} Coefficient
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedModels[1]} T-Stat
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coef. Change
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        T-Stat Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisonData.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {row.variableName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.inModel1 && row.inModel2 ? 'Both' :
                           row.inModel1 ? selectedModels[0] :
                           row.inModel2 ? selectedModels[1] : 'None'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatComparisonCell(row.model1Coef)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatComparisonCell(row.model1TStat)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatComparisonCell(row.model2Coef)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatComparisonCell(row.model2TStat)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {row.coefChange !== null ? (
                            <span
                              className={row.coefChange > 0 ? 'text-green-600' : row.coefChange < 0 ? 'text-red-600' : 'text-gray-500'}
                            >
                              {row.coefChange > 0 ? '+' : ''}{row.coefChange.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {row.tStatChange !== null ? (
                            <span
                              className={row.tStatChange > 0 ? 'text-green-600' : row.tStatChange < 0 ? 'text-red-600' : 'text-gray-500'}
                            >
                              {row.tStatChange > 0 ? '+' : ''}{row.tStatChange.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p>No comparison data available.</p>
            </div>
          )}
        </DialogComponent>
      </ErrorBoundary>
    </div>
  );
};

export default ModelLibrary;