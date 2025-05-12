// src/services/dbService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/db';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for better debugging
api.interceptors.request.use((config) => {
  console.log(`DB API Request: ${config.method.toUpperCase()} ${config.url}`, config.data);
  return config;
}, (error) => {
  console.error('DB API Request Error:', error);
  return Promise.reject(error);
});

// Add response interceptor for better debugging
api.interceptors.response.use((response) => {
  console.log(`DB API Response: ${response.status} from ${response.config.url}`, response.data);
  return response;
}, (error) => {
  console.error('DB API Response Error:', error);
  if (error.response) {
    console.error('Error Details:', error.response.data);
  }
  return Promise.reject(error);
});

// DB API service methods
const dbService = {
  // Dataset operations
  uploadData: async (file, datasetName = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (datasetName) {
      formData.append('datasetName', datasetName);
    }

    const response = await api.post('/upload-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  listDatasets: async () => {
    const response = await api.get('/datasets');
    return response.data;
  },

  loadDataset: async (datasetName, includeData = true) => {
    const response = await api.post('/load-dataset', {
      datasetName,
      includeData,
    });

    return response.data;
  },

  // Variable operations
  updateVariable: async (datasetName, variableName, metadata) => {
    const response = await api.post('/update-variable', {
      datasetName,
      variableName,
      metadata,
    });

    return response.data;
  },

  saveTransformations: async (datasetName, transformations) => {
    const response = await api.post('/save-transformations', {
      datasetName,
      transformations,
    });

    return response.data;
  },

  addSplitVariable: async (datasetName, baseVariable, newVariableName, startDate, endDate, identifier = '') => {
    const response = await api.post('/add-transformed-variable', {
      datasetName,
      baseVariable,
      newVariableName,
      transformationType: 'split_by_date',
      params: {
        startDate,
        endDate,
        identifier,
      },
    });

    return response.data;
  },

  addMultiplyVariable: async (datasetName, baseVariable, var2, newVariableName, identifier = '') => {
    const response = await api.post('/add-transformed-variable', {
      datasetName,
      baseVariable,
      newVariableName,
      transformationType: 'multiply',
      params: {
        var2,
        identifier,
      },
    });

    return response.data;
  },

  addLagVariable: async (datasetName, baseVariable, periods, newVariableName) => {
    const response = await api.post('/add-transformed-variable', {
      datasetName,
      baseVariable,
      newVariableName,
      transformationType: 'lag',
      params: {
        periods,
      },
    });

    return response.data;
  },

  addLeadVariable: async (datasetName, baseVariable, periods, newVariableName) => {
    const response = await api.post('/add-transformed-variable', {
      datasetName,
      baseVariable,
      newVariableName,
      transformationType: 'lead',
      params: {
        periods,
      },
    });

    return response.data;
  },

  addCurveVariable: async (datasetName, baseVariable, newVariableName, curveType, alpha, beta, gamma, adstockRate = 0) => {
    const response = await api.post('/add-transformed-variable', {
      datasetName,
      baseVariable,
      newVariableName,
      transformationType: curveType,
      params: {
        alpha,
        beta,
        gamma,
        adstockRate,
      },
    });

    return response.data;
  },

  // Model operations
  saveModel: async (modelName, datasetName, kpiVariable, features, modelDetails = null) => {
    const response = await api.post('/save-model', {
      modelName,
      datasetName,
      kpiVariable,
      features,
      modelDetails,
    });

    return response.data;
  },

  loadModel: async (modelName, datasetName = null) => {
    const response = await api.post('/load-model', {
      modelName,
      datasetName,
    });

    return response.data;
  },

  listModels: async (datasetName = null) => {
    let url = '/models';
    if (datasetName) {
      url += `?datasetName=${encodeURIComponent(datasetName)}`;
    }

    const response = await api.get(url);
    return response.data;
  },
};

export default dbService;
