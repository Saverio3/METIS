import React, { useState } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Inject,
  Toolbar } from '@syncfusion/ej2-react-grids';
import { MdCloudUpload, MdCheckCircle, MdError } from 'react-icons/md';
import { FiUploadCloud, FiDatabase, FiList } from 'react-icons/fi';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';

const UploadCard = ({ title, icon, description, onUpload, fileType, uploading, uploadSuccess, uploadError }) => {
  const { currentColor } = useStateContext();
  const fileInputRef = React.useRef(null);

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full md:w-1/2 p-4">
      <div className="bg-white dark:bg-secondary-dark-bg rounded-3xl p-6 shadow-md h-full">
        <div className="flex items-center">
          <div
            className="text-3xl rounded-full p-4 mr-4"
            style={{ backgroundColor: `${currentColor}20`, color: currentColor }}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold dark:text-gray-200">{title}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
        </div>

        <div
          className="mt-6 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8"
          style={{ borderColor: currentColor }}
          onClick={handleClick}
        >
          <input
            type="file"
            accept={fileType}
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {uploading ? (
            <div className="text-center">
              <div className="loader mb-3"></div>
              <p className="text-gray-600 dark:text-gray-400">Uploading...</p>
            </div>
          ) : uploadSuccess ? (
            <div className="text-center flex flex-col items-center justify-center h-full">
              <MdCheckCircle className="text-5xl text-green-500 mb-3" />
              <p className="text-green-500">Upload Successful</p>
            </div>
          ) : uploadError ? (
            <div className="text-center flex flex-col items-center justify-center h-full">
              <MdError className="text-5xl text-red-500 mb-3" />
              <p className="text-red-500">Upload Failed</p>
              <p className="text-xs text-red-400 mt-1">{uploadError}</p>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center h-full">
              <MdCloudUpload className="text-5xl mb-3" style={{ color: currentColor }} />
              <p className="text-gray-600 dark:text-gray-400">
                Click or drag file to upload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {fileType === '.xlsx, .xls, .csv' ? 'Excel or CSV files' : 'Excel files'} only
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DataSummaryCard = ({ title, icon, data = null }) => {
  const { currentColor } = useStateContext();

  return (
    <div className="w-full p-4">
      <div className="bg-white dark:bg-secondary-dark-bg rounded-3xl p-6 shadow-md">
        <div className="flex items-center mb-4">
          <div
            className="text-3xl rounded-full p-4 mr-4"
            style={{ backgroundColor: `${currentColor}20`, color: currentColor }}
          >
            {icon}
          </div>
          <h2 className="text-xl font-semibold dark:text-gray-200">{title}</h2>
        </div>

        {data ? (
          <div className="mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data).map(([key, value], index) => {
                // Skip preview and dates in this section
                if (key === 'preview' || key === 'dates') return null;

                // Format the display based on the key
                let displayValue = value;
                if (key === 'data_completeness' && value !== null) {
                  displayValue = `${value}%`;
                }

                return (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-800 dark:text-gray-200 font-medium">
                      {typeof value === 'object' && value !== null
                        ? JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
                        : displayValue}
                    </div>
                  </div>
                );
              })}
            </div>

            {data.preview && (
              <div className="mt-6">
                <h3 className="text-lg font-medium dark:text-gray-200 mb-2">Data Preview</h3>
                <div className="overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
                  <div className="overflow-x-auto" style={{ width: '100%' }}>
                    <GridComponent
                      dataSource={data.preview.slice(0, 10).map((row, index) => ({
                        // Add observation number and date as the first column
                        date: data.dates && data.dates[index] ? data.dates[index] : `Obs ${index + 1}`,
                        ...row }))}
                      allowPaging={false}
                      toolbar={['Search']}
                      width="1419px"
                      height="300px"
                      enableHover={true}
                      rowHeight={40}
                      textWrapSettings={{ wrapMode: 'Header' }}
                      emptyRecordTemplate=""
                    >
                      <ColumnsDirective>
                        {/* Add date column first */}
                        <ColumnDirective
                          field="date"
                          headerText="Date/Observation"
                          width="140"
                          isPrimaryKey={true}
                          freeze={true}
                          textAlign="Left"
                        />
                        {data.preview[0] && Object.keys(data.preview[0]).map((column, index) => (
                          <ColumnDirective
                            key={index}
                            field={column}
                            headerText={column}
                            width="100"
                            minWidth="80"
                            textAlign="Right"
                          />
                        ))}
                      </ColumnsDirective>
                      <Inject services={[Page, Toolbar]} />
                    </GridComponent>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 h-48">
            <FiDatabase className="text-5xl mb-3" />
            <p className="text-center">No data loaded yet. Please upload a file.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DataUpload = () => {
  const { currentColor } = useStateContext();
  const [dataUploading, setDataUploading] = useState(false);
  const [dataUploadSuccess, setDataUploadSuccess] = useState(false);
  const [dataUploadError, setDataUploadError] = useState(null);
  const [dataSummary, setDataSummary] = useState(null);

  const [modelUploading, setModelUploading] = useState(false);
  const [modelUploadSuccess, setModelUploadSuccess] = useState(false);
  const [modelUploadError, setModelUploadError] = useState(null);
  const [modelSummary, setModelSummary] = useState(null);

  const handleDataUpload = async (file) => {
    setDataUploading(true);
    setDataUploadSuccess(false);
    setDataUploadError(null);

    try {
      const response = await apiService.uploadData(file);
      if (response.success) {
        setDataUploadSuccess(true);
        const summary = {
          'File Name': file.name,
          'File Size': `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          'Variables': response.variables.length,
          'Observations': response.summary.n_observations,
          'Date Range': response.summary.date_range,
          'Regions': response.summary.region_count || 1,
          'preview': response.preview,
          'dates': response.dates
        };
        setDataSummary(summary);
      } else {
        setDataUploadError(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      setDataUploadError(error.message || 'Upload failed');
    } finally {
      setDataUploading(false);
    }
  };

  const handleModelUpload = async (file) => {
    setModelUploading(true);
    setModelUploadSuccess(false);
    setModelUploadError(null);

    try {
      const response = await apiService.importModel(file);

      if (response.success) {
        setModelUploadSuccess(true);
        const summary = {
          'Model Name': response.model.name,
          'KPI': response.model.kpi,
          'Features': response.model.features.length,
          'R-squared': response.model.rsquared?.toFixed(4) || 'N/A',
          'Observations': response.model.obs || 'N/A',
        };
        setModelSummary(summary);
      } else {
        setModelUploadError(response.error || 'Model import failed');
      }
    } catch (error) {
      console.error('Error importing model:', error);
      setModelUploadError(error.message || 'Model import failed');
    } finally {
      setModelUploading(false);
    }
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-main-dark-bg rounded-3xl">
      <Header category="Data Management" title="Upload Data" />

      <div className="flex flex-wrap -mx-4">
        <UploadCard
          title="Upload Data File"
          icon={<FiUploadCloud />}
          description="Upload your master data file (.xlsx, .csv)"
          onUpload={handleDataUpload}
          fileType=".xlsx, .xls, .csv"
          uploading={dataUploading}
          uploadSuccess={dataUploadSuccess}
          uploadError={dataUploadError}
        />

        <UploadCard
          title="Import Model"
          icon={<FiList />}
          description="Import an existing model (.xlsx)"
          onUpload={handleModelUpload}
          fileType=".xlsx"
          uploading={modelUploading}
          uploadSuccess={modelUploadSuccess}
          uploadError={modelUploadError}
        />
      </div>

      <div className="flex flex-wrap -mx-4 mt-4">
        <DataSummaryCard
          title="Data Summary"
          icon={<FiDatabase />}
          data={dataSummary}
        />
      </div>

      <div className="flex flex-wrap -mx-4 mt-4">
        <DataSummaryCard
          title="Model Summary"
          icon={<FiList />}
          data={modelSummary}
        />
      </div>

      <style>
        {`
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid ${currentColor};
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Hide "No records to display" message */
        .e-empty-grid {
          display: none !important;
        }

        /* Table styles */
        .e-grid {
          overflow-x: auto;
          display: block;
        }

        .e-gridcontent {
          width: 100%;
        }
        `}
      </style>
    </div>
  );
};

export default DataUpload;
