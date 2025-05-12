// src/pages/ContributionGroups.jsx

import React, { useState, useEffect } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Search,
  Page,
  Inject,
  Toolbar,
  Edit,
  Sort,
  Filter,
} from '@syncfusion/ej2-react-grids';
import {
  DropDownListComponent,
} from '@syncfusion/ej2-react-dropdowns';
import {
  ColorPickerComponent,
} from '@syncfusion/ej2-react-inputs';
import {
  ButtonComponent,
} from '@syncfusion/ej2-react-buttons';
import { FiSave, FiRefreshCw } from 'react-icons/fi';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

const ContributionGroups = () => {
  const { currentColor } = useStateContext();

  // States for models and variables
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [variables, setVariables] = useState([]);
  const [filteredVariables, setFilteredVariables] = useState([]);
  const [selectedVariables, setSelectedVariables] = useState([]);

  // State for colors and unique groups
  const [groupColors, setGroupColors] = useState({});
  const [uniqueGroups, setUniqueGroups] = useState([]);

  // States for UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Reference for the grid
  const gridRef = React.useRef(null);

  // Adjustment options for dropdown
  const adjustmentOptions = [
    { text: 'None', value: '' },
    { text: 'Min', value: 'Min' },
    { text: 'Max', value: 'Max' },
  ];

  // Load models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Extract unique groups
  useEffect(() => {
    if (variables.length > 0) {
      const groups = {};
      variables.forEach((variable) => {
        if (variable.Group) {
          groups[variable.Group] = true;
        }
      });
      setUniqueGroups(Object.keys(groups));
    }
  }, [variables]);

  // Fetch models from API
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await apiService.listModels();
      if (response.success) {
        setModels(response.models);
        if (response.activeModel) {
          setSelectedModel(response.activeModel);
          fetchModelVariables(response.activeModel);
        }
      } else {
        setError(`Failed to load models: ${response.error}`);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(`Error loading models: ${error.message}`);
      setLoading(false);
    }
  };

  // Fetch variables for a specific model
  const fetchModelVariables = async (modelName) => {
    if (!modelName) return;

    try {
      setLoading(true);
      setSelectedVariables([]); // Clear selections when changing model

      // First, try to get the variables from the model
      const response = await apiService.getModelVariables(modelName);

      if (response.success) {
        // Then, try to get the contribution groups for this model
        const groupsResponse = await apiService.getContributionGroups(modelName);

        // Add Group and Adjustment properties if not present
        const variablesWithGroups = response.variables.map((variable) => {
          // Check if we have saved group settings for this variable
          let group = 'Other';
          let adjustment = '';

          if (groupsResponse.success && groupsResponse.groupSettings
              && groupsResponse.groupSettings[variable.name]) {
            group = groupsResponse.groupSettings[variable.name].Group || 'Other';
            adjustment = groupsResponse.groupSettings[variable.name].Adjustment || '';
          }

          return {
            ...variable,
            Group: group,
            Adjustment: adjustment,
            selected: false,
          };
        });

        setVariables(variablesWithGroups);
        setFilteredVariables(variablesWithGroups);

        // Also fetch group colors
        fetchGroupColors(modelName);
      } else {
        setError(`Failed to load model variables: ${response.error}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching model variables:', error);
      setError(`Error loading model variables: ${error.message}`);
      setLoading(false);
    }
  };

  // Fetch existing colors for groups
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

  // Save colors for groups
  const saveGroupColors = async (colorData) => {
    try {
      setSaving(true);
      const response = await apiService.saveGroupColors(selectedModel, colorData);
      if (response.success) {
        setSuccess('Group colors saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Failed to save group colors: ${response.error}`);
      }
      setSaving(false);
    } catch (error) {
      console.error('Error saving group colors:', error);
      setError(`Error saving group colors: ${error.message}`);
      setSaving(false);
    }
  };

  // Handle group color change
  const handleGroupColorChange = (group, color) => {
    const updatedColors = {
      ...groupColors,
      [group]: color,
    };
    setGroupColors(updatedColors);
    saveGroupColors(updatedColors);
  };

  // Handle model selection change
  const handleModelChange = (e) => {
    const modelName = e.value;
    setSelectedModel(modelName);
    setFilteredVariables([]);
    fetchModelVariables(modelName);
  };

  // Handle adjustment dropdown change
  const handleAdjustmentChange = (variableName, value) => {
    if (selectedVariables.includes(variableName) && selectedVariables.length > 1) {
      // Bulk update for selected variables
      const updatedVariables = variables.map((v) => {
        if (selectedVariables.includes(v.name)) {
          return { ...v, Adjustment: value };
        }
        return v;
      });

      setVariables(updatedVariables);
      setFilteredVariables(updatedVariables);
    } else {
      // Single variable update
      const updatedVariables = variables.map((v) => (v.name === variableName ? { ...v, Adjustment: value } : v));

      setVariables(updatedVariables);
      setFilteredVariables(updatedVariables);
    }
  };

  // Handle group field edit
  const handleGroupChange = (variableName, newValue) => {
    if (selectedVariables.includes(variableName) && selectedVariables.length > 1) {
      // Bulk update for selected variables
      const updatedVariables = variables.map((v) => {
        if (selectedVariables.includes(v.name)) {
          return { ...v, Group: newValue };
        }
        return v;
      });

      setVariables(updatedVariables);
      setFilteredVariables(updatedVariables);
    } else {
      // Single variable update
      const updatedVariables = variables.map((v) => (v.name === variableName ? { ...v, Group: newValue } : v));

      setVariables(updatedVariables);
      setFilteredVariables(updatedVariables);
    }
  };

  // Handle checkbox selection
  const handleCheckboxClick = (variableName) => {
    setSelectedVariables((prev) => {
      if (prev.includes(variableName)) {
        return prev.filter((name) => name !== variableName);
      }
      return [...prev, variableName];
    });
  };

  // Handle "Select All" checkbox
  const handleSelectAll = (checked) => {
    if (checked) {
      // Select all visible variables
      setSelectedVariables(filteredVariables.map((v) => v.name));
    } else {
      // Clear selections
      setSelectedVariables([]);
    }
  };

  // Save contribution groups
  const saveContributionGroups = async () => {
    if (!selectedModel) {
      setError('Please select a model first');
      return;
    }

    try {
      setSaving(true);

      // Create groupSettings object to send to API
      const groupSettings = {};

      variables.forEach((variable) => {
        groupSettings[variable.name] = {
          Group: variable.Group || 'Other',
          Adjustment: variable.Adjustment || '',
        };
      });

      const response = await apiService.saveContributionGroups(selectedModel, groupSettings);

      if (response.success) {
        setSuccess('Contribution groups saved successfully');
        setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
      } else {
        setError(`Failed to save contribution groups: ${response.error}`);
      }

      setSaving(false);
    } catch (error) {
      console.error('Error saving contribution groups:', error);
      setError(`Error saving contribution groups: ${error.message}`);
      setSaving(false);
    }
  };

  // Dropdown template for the Adjustment column
  const adjustmentTemplate = (props) => (
    <DropDownListComponent
      id={`adjustment-${props.name}`}
      dataSource={adjustmentOptions}
      fields={{ text: 'text', value: 'value' }}
      value={props.Adjustment}
      change={(e) => handleAdjustmentChange(props.name, e.value)}
      placeholder="Select"
      popupHeight="240px"
      style={{ width: '100%' }}
    />
  );

  // Group column editable cell template
  const groupTemplate = (props) => (
    <div
      className="group-cell-editable cursor-pointer p-2 rounded hover:bg-gray-100"
      onClick={(e) => {
        // Create an editable input field when clicked
        const cell = e.currentTarget;
        cell.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'w-full p-1 border rounded';
        input.value = props.Group;

        input.onblur = () => {
          handleGroupChange(props.name, input.value);
          cell.innerHTML = input.value;
        };

        input.onkeydown = (keyEvent) => {
          if (keyEvent.key === 'Enter') {
            input.blur();
          }
        };

        cell.appendChild(input);
        input.focus();
      }}
    >
      {props.Group}
    </div>
  );

  // Template for selection checkbox column
  const selectionTemplate = (props) => {
    const isSelected = selectedVariables.includes(props.name);

    return (
      <input
        type="checkbox"
        className="form-checkbox h-4 w-4 text-blue-600 rounded"
        checked={isSelected}
        onChange={() => handleCheckboxClick(props.name)}
      />
    );
  };

  // Header template for the selection column (select all checkbox)
  const headerSelectionTemplate = () => {
    const allSelected = filteredVariables.length > 0
                         && filteredVariables.every((v) => selectedVariables.includes(v.name));
    const someSelected = filteredVariables.some((v) => selectedVariables.includes(v.name)) && !allSelected;

    return (
      <input
        type="checkbox"
        className="form-checkbox h-4 w-4 text-blue-600 rounded"
        checked={allSelected}
        ref={(input) => {
          if (input) {
            input.indeterminate = someSelected;
          }
        }}
        onChange={(e) => handleSelectAll(e.target.checked)}
      />
    );
  };

  // Define toolbar items
  const toolbarOptions = ['Search'];

  // Define the grid's search settings
  const searchSettings = {
    fields: ['name'],
    operator: 'contains',
    key: '',
    ignoreCase: true,
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <ErrorBoundary>
        <Header category="Analysis" title="Contribution Groups" />

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="w-full md:w-1/3 mb-4 md:mb-0">
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

          <div className="flex space-x-2">
            <ButtonComponent
              cssClass="e-success"
              iconCss="e-icons e-refresh"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={() => fetchModelVariables(selectedModel)}
              disabled={!selectedModel || loading}
            >
              <div className="flex items-center">
                <FiRefreshCw className="mr-1" />
                REFRESH
              </div>
            </ButtonComponent>

            <ButtonComponent
              cssClass="e-success"
              iconCss="e-icons e-save"
              style={{ backgroundColor: currentColor, borderColor: currentColor }}
              onClick={saveContributionGroups}
              disabled={!selectedModel || loading || saving}
            >
              <div className="flex items-center">
                <FiSave className="mr-1" />
                SAVE GROUPS
              </div>
            </ButtonComponent>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Contribution Groups Table - Takes 3/4 of the space */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
                  style={{ borderColor: currentColor }}
                />
                <p className="ml-2">Loading variables...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <GridComponent
                  ref={gridRef}
                  dataSource={filteredVariables}
                  allowPaging
                  allowSorting
                  pageSettings={{ pageSize: 20 }}
                  toolbar={toolbarOptions}
                  searchSettings={searchSettings}
                  height="500px"
                >
                  <ColumnsDirective>
                    <ColumnDirective
                      field="selection"
                      headerText=""
                      width="50"
                      template={selectionTemplate}
                      headerTemplate={headerSelectionTemplate}
                      textAlign="Center"
                    />
                    <ColumnDirective field="name" headerText="Variable" width="200" isPrimaryKey />
                    <ColumnDirective field="coefficient" headerText="Coefficient" width="110" format="N4" textAlign="Right" />
                    <ColumnDirective field="tStat" headerText="T-Stat" width="110" format="N4" textAlign="Right" />
                    <ColumnDirective field="transformation" headerText="Transform" width="120" />
                    <ColumnDirective
                      field="Group"
                      headerText="Group"
                      width="130"
                      template={groupTemplate}
                    />
                    <ColumnDirective
                      field="Adjustment"
                      headerText="Adjustment"
                      width="130"
                      template={adjustmentTemplate}
                    />
                  </ColumnsDirective>
                  <Inject services={[Page, Sort, Filter, Toolbar, Edit, Search]} />
                </GridComponent>
              </div>
            )}
          </div>

          {/* Group Colors Section - Takes 1/4 of the space */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 h-full">
              <h3 className="text-lg font-semibold mb-4">Group Colors</h3>
              <div className="overflow-y-auto max-h-[448px]"> {/* Match the table height to the grid */}
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Group
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uniqueGroups.map((group, index) => (
                      <tr key={group} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {group}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                    <ColorPickerComponent
                      id={`color-${group}`}
                      value={groupColors[group] || '#cccccc'}
                      mode="Palette"
                      cssClass="e-small-colorpicker"
                      showButtons={false}
                    />
                  </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">About Contribution Groups</h3>
          <p className="text-sm text-gray-600 mb-2">
            Contribution groups help organize variables for decomposition analysis. Variables in the same group will be combined when showing contribution charts.
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Group:</span> Assign a descriptive group name (e.g., "Media", "Price", "Promotion", "Seasonality").
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Adjustment:</span> Optional adjustment to apply during decomposition:
            <ul className="list-disc ml-8 mt-1">
              <li><span className="font-medium">Min:</span> Subtract the minimum contribution from each time period</li>
              <li><span className="font-medium">Max:</span> Subtract the maximum contribution from each time period</li>
              <li><span className="font-medium">None:</span> Use the contribution as is</li>
            </ul>
          </p>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default ContributionGroups;
