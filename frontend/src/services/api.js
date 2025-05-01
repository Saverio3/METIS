// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for better debugging
api.interceptors.request.use(config => {
  console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data);
  return config;
}, error => {
  console.error('API Request Error:', error);
  return Promise.reject(error);
});

// Add response interceptor for better debugging
api.interceptors.response.use(response => {
  console.log(`API Response: ${response.status} from ${response.config.url}`, response.data);
  return response;
}, error => {
  console.error('API Response Error:', error);
  if (error.response) {
    console.error('Error Details:', error.response.data);
  }
  return Promise.reject(error);
});

// API service methods
const apiService = {
  // Data management
  uploadData: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importModel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/models/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  filterData: async (startDate, endDate) => {
    const response = await api.post('/data/filter', { startDate, endDate });
    return response.data;
  },

  // Model management
  createModel: async (modelName, kpi) => {
    try {
      console.log(`Creating model: ${modelName} with KPI: ${kpi}`);
      const response = await api.post('/models/create', {
        modelName,
        kpi
      });

      console.log("Create model API response:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating model:', error);
      return { success: false, error: error.message };
    }
  },

  // In api.js - Enhance the addVariables method
addVariables: async (modelName, variables, adstockRates = []) => {
  try {
    console.log(`Adding variables to model: ${modelName}`, variables);
    console.log("Adstock rates:", adstockRates);

    const response = await api.post('/models/add-var', {
      modelName,
      variables,
      adstockRates
    });

    console.log("Add variables API response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding variables:', error);
    // Provide more detailed error information
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
},

  removeVariables: async (modelName, variables) => {
    try {
      console.log(`Removing variables from model: ${modelName}`, variables);

      const response = await api.post('/models/remove-var', {
        modelName,
        variables
      });

      console.log("Remove variables API response:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error removing variables:', error);
      // Provide more detailed error information
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  },

  testVariables: async (modelName, variables, adstockRates = []) => {
    const response = await api.post('/models/test-vars', {
      modelName, variables, adstockRates,
    });
    return response.data;
  },

  testCurves: async (modelName, variableName, curveType) => {
    try {
      const response = await api.post('/models/test-curves', {
        modelName, variableName, curveType });

      return response.data;
    } catch (error) {
      console.error('Error testing curves:', error);
      return { success: false, error: error.message };
    }
  },

  chartVariables: async (modelName, variables) => {
    try {
      const response = await api.post('/models/chart-vars', {
        modelName, variables,
      });

      if (response.data.success && response.data.chartData) {
        // Ensure each series has the correct structure
        const cleanedData = response.data.chartData.map(series => {
          // Make sure the series has a name
          const name = series.name || 'Unnamed Series';

          // Clean up the data points
          const data = Array.isArray(series.data)
            ? series.data
                .filter(point => point && point.x && point.y !== undefined && point.y !== null)
                .map(point => ({
                  x: point.x,
                  y: typeof point.y === 'string' ? parseFloat(point.y) : point.y
                }))
            : [];

          return {
            name,
            data
          };
        });

        // Only return series with data
        const validSeries = cleanedData.filter(series => series.data && series.data.length > 0);

        return {
          success: validSeries.length > 0,
          chartData: validSeries,
          error: validSeries.length === 0 ? 'No valid data points found' : null
        };
      }

      return response.data;
    } catch (error) {
      console.error('Error charting variables:', error);
      return { success: false, error: error.message };
    }
  },

  listModels: async () => {
    const response = await api.get('/models/list');
    return response.data;
  },

  // Variable Workshop endpoints
  getVariables: async () => {
    const response = await api.get('/data/variables');
    return response.data;
  },

  updateVariableTransformation: async (variable, transformation) => {
    const response = await api.post('/data/update-transformation', {
      variable, transformation });
    return response.data;
  },

  updateVariableGroup: async (variable, group) => {
    const response = await api.post('/data/update-group', {
      variable, group });
    return response.data;
  },

  splitVariable: async (variable, startDate, endDate, identifier) => {
    const response = await api.post('/data/split-variable', {
      variable, startDate, endDate, identifier });
    return response.data;
  },

  multiplyVariables: async (var1, var2, identifier) => {
    const response = await api.post('/data/multiply-variables', {
      var1, var2, identifier });
    return response.data;
  },

  createLeadLag: async (variable, periods, type) => {
    const response = await api.post('/data/create-lead-lag', {
      variable, periods, type });
    return response.data;
  },

  createWeightedVariable: async (modelName, baseName, coefficients) => {
    try {
      const response = await api.post('/models/create-weighted-variable', {
        modelName,
        baseName,
        coefficients
      });
      return response.data;
    } catch (error) {
      console.error('Error creating weighted variable:', error);
      return { success: false, error: error.message };
    }
  },

  // Add these methods to apiService.js

getWeightedVariableComponents: async (modelName, variableName) => {
  try {
    const response = await api.post('/models/get-weighted-variable', {
      modelName,
      variableName
    });
    return response.data;
  } catch (error) {
    console.error('Error getting weighted variable components:', error);
    return { success: false, error: error.message };
  }
},

updateWeightedVariable: async (modelName, variableName, coefficients) => {
  try {
    const response = await api.post('/models/update-weighted-variable', {
      modelName,
      variableName,
      coefficients
    });
    return response.data;
  } catch (error) {
    console.error('Error updating weighted variable:', error);
    return { success: false, error: error.message };
  }
},

  // Optional: Add a dedicated correlation calculation endpoint
  calculateCorrelation: async (variables) => {
    try {
      const response = await api.post('/data/correlation', { variables });
      return response.data;
    } catch (error) {
      console.error('Error calculating correlation:', error);
      return { success: false, error: error.message };
    }
  },

  // Preview adding variables to a model
  previewAddVariables: async (modelName, variables, adstockRates = []) => {
    try {
      console.log(`Preview adding variables to model: ${modelName}`);
      console.log('Variables:', variables);
      console.log('Adstock rates:', adstockRates);

      const response = await api.post('/models/preview-add-var', {
        modelName,
        variables,
        adstockRates,
      });

      return response.data;
    } catch (error) {
      console.error('Error previewing variable addition:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  },

// Preview removing variables from a model
previewRemoveVariables: async (modelName, variables) => {
  try {
    const response = await api.post('/models/preview-remove-var', {
      modelName,
      variables,
    });

    return response.data;
  } catch (error) {
    console.error('Error previewing variable removal:', error);
    return { success: false, error: error.message };
  }
},

  // Clone a model
  cloneModel: async (modelName, newModelName) => {
    try {
      console.log(`Cloning model: ${modelName} as: ${newModelName}`);
      const response = await api.post('/models/clone', {
        modelName,
        newModelName
      });

      console.log("Clone model API response:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error cloning model:', error);
      return { success: false, error: error.message };
    }
  },

// Apply date filter to model
filterModel: async (modelName, startDate, endDate) => {
  try {
    console.log(`Filtering model: ${modelName} from ${startDate} to ${endDate}`);

    const formattedStartDate = startDate instanceof Date ?
      startDate.toISOString() :
      new Date(startDate).toISOString();

    const formattedEndDate = endDate instanceof Date ?
      endDate.toISOString() :
      new Date(endDate).toISOString();

    const response = await api.post('/models/filter', {
      modelName,
      startDate: formattedStartDate,
      endDate: formattedEndDate
    });

    console.log("API response for filter:", response.data);

    if (response.data.success) {
      console.log(`Filter applied successfully. Observations: ${response.data.observations || 'unknown'}`);
    } else {
      console.error(`Filter error: ${response.data.error}`);
    }

    return response.data;
  } catch (error) {
    console.error('Error filtering model:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    return { success: false, error: error.message || "Failed to filter model" };
  }
},

getModelVariables: async (modelName) => {
  try {
    console.log(`Fetching variables for model: ${modelName}`);
    if (!modelName) {
      console.warn('No model name provided');
      return { success: false, variables: [], error: 'No model name provided' };
    }

    // First get the variables from the model
    const response = await api.post('/models/get-variables', {
      modelName: modelName
    });

    // If successful, try to get transformation info
    if (response.data.success) {
      try {
        // Get transformations data from the variables API
        const varsResponse = await api.get('/data/variables');

        if (varsResponse.data.success) {
          // Create a map of variable name to transformation
          const transformationMap = {};
          varsResponse.data.variables.forEach(v => {
            transformationMap[v.name] = {
              transformation: v.transformation || 'None',
              group: v.group || 'Other'
            };
          });

          // Merge transformation information into model variables
          const enhancedVariables = response.data.variables.map(variable => {
            const info = transformationMap[variable.name] || {};
            return {
              ...variable,
              transformation: info.transformation || variable.transformation || 'None',
              group: info.group || variable.group || 'Other'
            };
          });

          return {
            ...response.data,
            variables: enhancedVariables
          };
        }
      } catch (transformError) {
        console.error('Error fetching transformations:', transformError);
        // Continue with original response if transformation fetch fails
      }
    }

    return response.data;
  } catch (error) {
    console.error('Error getting model variables:', error);
    // Return a properly structured error response
    return {
      success: false,
      variables: [],
      error: error.message || 'Network error'
    };
  }
},

// Test curves for a variable
/* testCurves: async (modelName, variableName, curveType) => {
  try {
    const response = await api.post('/api/models/test-curves', {
      modelName,
      variableName,
      curveType
    });

    return response.data;
  } catch (error) {
    console.error('Error testing curves:', error);
    return { success: false, error: error.message };
  }
}, */

// Get curve data for visualization
getCurveData: async (modelName, variableName, curveType, selectedCurves) => {
  try {
    const response = await api.post('/models/curve-data', {
      modelName,
      variableName,
      curveType,
      curves: selectedCurves
    });

    return response.data;
  } catch (error) {
    console.error('Error getting curve data:', error);
    return { success: false, error: error.message };
  }
},

// Add curves to model
addCurvesToModel: async (modelName, variableName, curveType, selectedCurves) => {
  try {
    const response = await api.post('/models/add-curves', {
      modelName,
      variableName,
      curveType,
      curves: selectedCurves
    });

    return response.data;
  } catch (error) {
    console.error('Error adding curves to model:', error);
    return { success: false, error: error.message };
  }
},

createCurveVariables: async (modelName, variableName, curveType, selectedCurves) => {
  try {
    const response = await api.post('/models/create-curve-variables', {
      modelName,
      variableName,
      curveType,
      curves: selectedCurves
    });

    return response.data;
  } catch (error) {
    console.error('Error creating curve variables:', error);
    return { success: false, error: error.message };
  }
},

createVariableCurve: async (variableName, curveType, alpha, beta, gamma, adstockRate, identifier) => {
  try {
    const response = await api.post('/data/create-variable-curve', {
      variableName,
      curveType,
      alpha,
      beta,
      gamma,
      adstockRate,
      identifier
    });

    return response.data;
  } catch (error) {
    console.error('Error creating variable curve:', error);
    return { success: false, error: error.message };
  }
},

// Update the runModelDiagnostics function in api.js
// Update the runModelDiagnostics function in api.js
runModelDiagnostics: async (modelName, tests = []) => {
  try {
    console.log(`Running diagnostic tests for model: ${modelName}`);
    console.log(`Selected tests: ${tests.join(', ')}`);

    const response = await api.post('/models/run-diagnostics', {
      modelName,
      tests
    });

    // Validate the response structure to avoid frontend errors
    if (response.data && response.data.success) {
      const results = response.data.results || {};

      // Debug the multicollinearity result specifically
      if (tests.includes('multicollinearity')) {
        console.log("Multicollinearity test result:", JSON.stringify(results.multicollinearity));
      }

      return {
        success: true,
        results: results
      };
    } else {
      console.error('API returned error:', response.data?.error || 'Unknown error');
      return {
        success: false,
        error: response.data?.error || 'Unknown error',
        results: {}
      };
    }
  } catch (error) {
    console.error('Error running model diagnostics:', error);
    return {
      success: false,
      error: error.message || 'Network error',
      results: {}
    };
  }
},

debugMulticollinearity: async (modelName) => {
  try {
    const response = await api.post('/debug/multicollinearity-test', {
      modelName
    });
    return response.data;
  } catch (error) {
    console.error('Error debugging multicollinearity:', error);
    return { success: false, error: error.message };
  }
},

runDecomposition: async (modelName) => {
  try {
    console.log(`Requesting decomposition for model: ${modelName}`);
    const response = await api.post('/models/decomposition', {
      modelName
    }, {
      // Increase timeout for decomposition which might take longer
      timeout: 60000 // 60 seconds
    });

    return response.data;
  } catch (error) {
    console.error('Error running decomposition:', error);
    // Extract and return more detailed error info if available
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred during decomposition';
    return {
      success: false,
      error: errorMessage
    };
  }
},

// Get model variables for a specific model
getModelVariables: async (modelName) => {
  try {
    if (!modelName) {
      console.warn('No model name provided');
      return { success: false, variables: [], error: 'No model name provided' };
    }

    const response = await api.post('/models/get-variables', {
      modelName: modelName
    });

    return response.data;
  } catch (error) {
    console.error('Error getting model variables:', error);
    // Return a properly structured error response
    return {
      success: false,
      variables: [],
      error: error.message || 'Network error'
    };
  }
},

runGroupDecomposition: async (modelName, groupName) => {
  try {
    console.log(`Requesting group decomposition for model: ${modelName}, group: ${groupName}`);
    const response = await api.post('/models/group-decomposition', {
      modelName,
      groupName
    });

    return response.data;
  } catch (error) {
    console.error('Error running group decomposition:', error);
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred during group decomposition';
    return {
      success: false,
      error: errorMessage
    };
  }
},

// Contribution Groups
saveContributionGroups: async (modelName, groupSettings) => {
  try {
    const response = await api.post('/models/save-contribution-groups', {
      modelName,
      groupSettings
    });
    return response.data;
  } catch (error) {
    console.error('Error saving contribution groups:', error);
    return { success: false, error: error.message };
  }
},

getContributionGroups: async (modelName) => {
  try {
    const response = await api.get(`/models/contribution-groups/${modelName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching contribution groups:', error);
    return { success: false, error: error.message };
  }
},

// Model Export
exportModelToExcel: async (modelName, exportPath = '') => {
  console.log("=== API EXPORT MODEL TO EXCEL STARTED ===");
  console.log(`Input parameters - modelName: ${modelName}, exportPath: ${exportPath}`);

  try {
    // Format path for API request
    console.log("Preparing API request with path:", exportPath);

    // Make API request
    console.log(`Sending POST request to ${API_URL}/models/export-excel`);
    console.log("Request payload:", { modelName, exportPath });

    const response = await api.post('/models/export-excel', {
      modelName,
      exportPath
    });

    console.log("API response status:", response.status);
    console.log("API response headers:", response.headers);
    console.log("API response data:", response.data);

    if (response.data.success) {
      console.log("Export reported as successful by backend");
      if (response.data.filePath) {
        console.log(`File path returned: ${response.data.filePath}`);
      } else {
        console.log("No file path returned in successful response");
      }
    } else {
      console.error("Backend reported export failure:", response.data.error);
    }

    console.log("=== API EXPORT MODEL TO EXCEL COMPLETED ===");
    return response.data;
  } catch (error) {
    console.error('Exception in exportModelToExcel API call:', error);

    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received for request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }

    console.error('Error config:', error.config);
    console.error('Error stack:', error.stack);

    console.log("=== API EXPORT MODEL TO EXCEL FAILED ===");
    return { success: false, error: error.message };
  }
},

// Rename Model
renameModel: async (oldModelName, newModelName) => {
  try {
    console.log(`Renaming model from ${oldModelName} to ${newModelName}`);
    const response = await api.post('/models/rename', {
      oldModelName,
      newModelName
    });

    console.log("Rename model API response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error renaming model:', error);
    return { success: false, error: error.message };
  }
},

// Delete model
deleteModel: async (modelName) => {
  try {
    const response = await api.post('/models/delete', {
      modelName
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting model:', error);
    return { success: false, error: error.message };
  }
},

// Get group colors
getGroupColors: async (modelName) => {
  try {
    const response = await api.get(`/models/group-colors/${modelName}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group colors:', error);
    return { success: false, colors: {}, error: error.message };
  }
},

// Save group colors
saveGroupColors: async (modelName, colorData) => {
  try {
    const response = await api.post('/models/save-group-colors', {
      modelName,
      colorData
    });
    return response.data;
  } catch (error) {
    console.error('Error saving group colors:', error);
    return { success: false, error: error.message };
  }
},

// Download Model Diagnostics Report
downloadDiagnosticsReport: async (modelName, testId, testName) => {
  try {
    const response = await api.post('/models/download-diagnostics-report', {
      modelName,
      testId,
      testName
    });

    return response.data;
  } catch (error) {
    console.error('Error downloading diagnostics report:', error);
    return { success: false, error: error.message };
  }
},

};

export default apiService;
