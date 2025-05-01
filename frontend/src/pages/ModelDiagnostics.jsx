import React, { useState, useEffect } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  Search
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
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  Legend,
  Category,
  ColumnSeries,
  Tooltip,
  DataLabel,
  ScatterSeries,
  LineSeries,
  SplineSeries,
  DateTime,
  Crosshair,
  Zoom,
  // Trendline,
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  PieSeries,
  AccumulationLegend,
  AccumulationTooltip,
  AccumulationDataLabel
} from '@syncfusion/ej2-react-charts';
import {
  FiClipboard,
  FiBarChart2,
  FiCheckCircle,
  FiActivity,
  FiAlertCircle,
  FiDownload
} from 'react-icons/fi';
import { Header } from '../components';
import { useStateContext } from '../contexts/ContextProvider';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

const ModelDiagnostics = () => {
  const { currentColor } = useStateContext();

  // Model selection state
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  // Test selection state
  const [availableTests, setAvailableTests] = useState([
    { id: 'residual_normality', name: 'Residual Normality Tests', checked: true, description: 'Tests for normality of residuals using Jarque-Bera and other methods' },
    { id: 'autocorrelation', name: 'Autocorrelation Tests', checked: true, description: 'Tests for autocorrelation in residuals using Durbin-Watson and ACF plots' },
    { id: 'heteroscedasticity', name: 'Heteroscedasticity Tests', checked: true, description: 'Tests for constant variance in residuals' },
    { id: 'influential_points', name: 'Influential Points Analysis', checked: true, description: 'Identifies outliers and influential observations in the model' },
    { id: 'multicollinearity', name: 'Multicollinearity Tests', checked: true, description: 'Tests for multicollinearity using VIF' },
    { id: 'actual_vs_predicted', name: 'Actual vs Predicted Plot', checked: true, description: 'Plot of actual values against model predictions' },
  ]);
  const [selectAll, setSelectAll] = useState(true);

  // Results state
  const [diagnosticResults, setDiagnosticResults] = useState({});
  const [loading, setLoading] = useState(false);

  // Display state
  const [activeTab, setActiveTab] = useState(0);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailDialogContent, setDetailDialogContent] = useState({ title: '', content: null });
  const [showTestSelection, setShowTestSelection] = useState(false);

  // Fetch models on component mount
  useEffect(() => {
    fetchModels();
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
            setSelectedModel(activeModel.name);
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

  // Handle model selection change
  const handleModelChange = (e) => {
    const modelName = e.value;
    setSelectedModel(modelName);
    // Reset diagnostics results when model changes
    setDiagnosticResults({});
    setShowTestSelection(false);
  };

  // Handle Continue to Diagnostics button
  const handleContinue = () => {
    setShowTestSelection(true);
  };

  // Handle test checkbox change
  const handleTestCheckboxChange = (testId) => {
    setAvailableTests(prev => prev.map(test =>
      test.id === testId ? { ...test, checked: !test.checked } : test
    ));

    // Update selectAll state based on all checkboxes
    const updatedTests = availableTests.map(test =>
      test.id === testId ? { ...test, checked: !test.checked } : test
    );

    setSelectAll(updatedTests.every(test => test.checked));
  };

  // Handle select all checkbox change
  const handleSelectAllChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setAvailableTests(prev => prev.map(test => ({ ...test, checked: newSelectAll })));
  };

  // Run diagnostic tests
const runDiagnosticTests = async () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    const selectedTests = availableTests
      .filter(test => test.checked)
      .map(test => test.id);

    if (selectedTests.length === 0) {
      alert('Please select at least one test to run');
      return;
    }

    setLoading(true);
    try {
      console.log("Starting diagnostic tests for model:", selectedModel);
      console.log("Selected tests:", selectedTests);

      const response = await apiService.runModelDiagnostics(selectedModel, selectedTests);

      console.log("Diagnostic API response:", response);

      if (response.success) {
        console.log("Setting diagnostic results:", response.results);

        // Create a safe copy of results to avoid mutations
        const safeResults = { ...response.results };

        setDiagnosticResults(safeResults);

        // Log specific test results for debugging
        if (selectedTests.includes('multicollinearity') && safeResults.multicollinearity) {
          console.log("Multicollinearity VIF values:", safeResults.multicollinearity.vif_values);
        }
      } else {
        console.error("Diagnostic API error:", response.error);
        alert('Failed to run diagnostic tests: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      alert('Error running diagnostics: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Show details for a specific test result
  const showTestDetails = (testId, title) => {
    if (!diagnosticResults[testId]) return;

    setDetailDialogContent({
      title: title,
      content: renderDetailContent(testId)
    });

    setShowDetailDialog(true);
  };

  // Helper to format p-values with significance stars
  const formatPValue = (pValue) => {
    if (pValue === null || pValue === undefined) return 'N/A';

    const p = parseFloat(pValue);
    let stars = '';

    if (p < 0.01) stars = '***';
    else if (p < 0.05) stars = '**';
    else if (p < 0.1) stars = '*';

    return `${p.toFixed(4)}${stars}`;
  };

  // Helper to format test statistics
  const formatTestStat = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return parseFloat(value).toFixed(4);
  };

  // Render test significance indicators
  const renderTestSignificance = (pValue, threshold = 0.05, inverseLogic = false) => {
    if (pValue === null || pValue === undefined) return null;

    const p = parseFloat(pValue);
    const isPassing = inverseLogic ? p >= threshold : p < threshold;

    return (
      <div className={`flex items-center justify-center ${isPassing ? 'text-green-600' : 'text-red-600'}`}>
        {isPassing ? (
          <FiCheckCircle className="text-xl" />
        ) : (
          <FiAlertCircle className="text-xl" />
        )}
      </div>
    );
  };

  // Helper function to generate normal distribution curve points
const generateNormalDistributionPoints = (histogramData) => {
  if (!histogramData || histogramData.length === 0) return [];

  // Calculate mean and standard deviation from histogram data
  const allBins = histogramData.map(d => d.bin);
  const min = Math.min(...allBins);
  const max = Math.max(...allBins);

  // Get bin width from the first two bins
  const binWidth = histogramData.length > 1 ? Math.abs(histogramData[1].bin - histogramData[0].bin) : 1;

  // Calculate mean and standard deviation
  let sum = 0;
  let totalFrequency = 0;

  histogramData.forEach(d => {
    sum += d.bin * d.frequency;
    totalFrequency += d.frequency;
  });

  const mean = sum / totalFrequency;

  let sumSquaredDiff = 0;
  histogramData.forEach(d => {
    sumSquaredDiff += Math.pow(d.bin - mean, 2) * d.frequency;
  });

  const variance = sumSquaredDiff / totalFrequency;
  const stdDev = Math.sqrt(variance);

  // Generate normal distribution curve points
  const points = [];
  const range = max - min;
  // Extend range to see full distribution
  const extendedMin = min - range * 0.2;
  const extendedMax = max + range * 0.2;
  const step = (extendedMax - extendedMin) / 100; // More points for smoother curve

  // Find max frequency for scaling
  const maxFreq = Math.max(...histogramData.map(d => d.frequency));

  // Scale factor to match histogram height
  // PDF peak height is 1/(σ√2π) at x = mean
  const pdfPeakHeight = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const scaleFactor = maxFreq / pdfPeakHeight;

  for (let x = extendedMin; x <= extendedMax; x += step) {
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    const normalValue = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);

    points.push({
      x: x,
      y: normalValue * scaleFactor
    });
  }

  return points;
};

// Generate a proper reference line for QQ plot using linear regression
const generateQQReferenceLine = (qqData) => {
  if (!qqData || qqData.length < 2) return [];

  // Calculate means
  const xValues = qqData.map(point => point.theoretical);
  const yValues = qqData.map(point => point.sample);

  const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;

  // Calculate slope using least squares method
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < xValues.length; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  const slope = numerator / denominator;
  const intercept = yMean - (slope * xMean);

  // Generate points for the line
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const range = maxX - minX;

  // Extend line a bit beyond the data points
  const extendedMinX = minX - (range * 0.1);
  const extendedMaxX = maxX + (range * 0.1);

  const points = [];
  const step = (extendedMaxX - extendedMinX) / 50;

  for (let x = extendedMinX; x <= extendedMaxX; x += step) {
    points.push({
      x: x,
      y: (slope * x) + intercept
    });
  }

  return points;
};

  // Format interpretation of test results
  const getTestInterpretation = (testId, result) => {
    if (!result) return "No test results available";

    switch (testId) {
      case 'residual_normality':
        const jb_pvalue = result.jarque_bera?.pvalue;
        if (jb_pvalue !== undefined && jb_pvalue < 0.05) {
          return "Residuals may not be normally distributed (p < 0.05). This could affect the validity of hypothesis tests.";
        } else {
          return "Residuals appear to be normally distributed (p >= 0.05).";
        }

      case 'autocorrelation':
        const dw = result.durbin_watson?.statistic;
        if (dw !== undefined) {
          if (dw < 1.5) {
            return "Positive autocorrelation detected (DW < 1.5). Consider adding lagged variables.";
          } else if (dw > 2.5) {
            return "Negative autocorrelation detected (DW > 2.5). This is unusual and may indicate model misspecification.";
          } else {
            return "No significant autocorrelation detected (DW near 2).";
          }
        }
        return "Autocorrelation test results not available.";

      case 'heteroscedasticity':
        const bp_pvalue = result.breusch_pagan?.pvalue;
        if (bp_pvalue !== undefined) {
          if (bp_pvalue < 0.05) {
            return "Heteroscedasticity detected (p < 0.05). Consider robust standard errors or transforming the dependent variable.";
          } else {
            return "No significant heteroscedasticity detected (p >= 0.05).";
          }
        }
        return "Heteroscedasticity test results not available.";

      case 'multicollinearity':
        const max_vif = result.max_vif;
        if (max_vif !== undefined) {
          if (max_vif > 10) {
            return "Severe multicollinearity detected (max VIF > 10). Consider removing some variables.";
          } else if (max_vif > 5) {
            return "Moderate multicollinearity detected (max VIF > 5). Monitor these variables.";
          } else {
            return "No significant multicollinearity detected (all VIF < 5).";
          }
        }
        return "Multicollinearity test results not available.";

      case 'influential_points':
        const outliers = result.outliers?.count;
        if (outliers !== undefined) {
          if (outliers > 0) {
            return `${outliers} potential outliers detected. Review these points and consider their impact on the model.`;
          } else {
            return "No significant outliers detected.";
          }
        }
        return "Influential points analysis not available.";

      case 'residual_plots':
        return "Examine residual plots to check for patterns that might indicate model misspecification.";

      case 'actual_vs_predicted':
        if (result.prediction_stats) {
          return `Model fit: R² = ${result.prediction_stats.r_squared.toFixed(4)}, RMSE = ${result.prediction_stats.rmse.toFixed(4)}`;
        }
        return "Examine how well the model predictions match actual values.";

      default:
        return "No interpretation available.";
    }
  };

  // Generate a report download
const handleDownloadReport = async () => {
    if (!detailDialogContent || !detailDialogContent.title) {
      alert("No test details available to download");
      return;
    }

    // Get the current test ID and name
    const currentTestId = Object.keys(availableTests).find(
      test => availableTests[test].name === detailDialogContent.title
    );

    if (!currentTestId) {
      alert("Cannot identify the current test");
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.downloadDiagnosticsReport(
        selectedModel,
        currentTestId,
        detailDialogContent.title
      );

      if (response.success) {
        // Create a download link for the PDF
        const downloadUrl = `/api/download/${response.filename}`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', response.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Failed to generate report: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error downloading report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Render detailed content for normality tests
  const renderNormalityTestsDetails = (result) => {
    if (!result) return <div>No results available</div>;

    // Create histogram data for residuals
    const histogramData = result.histogram_data || [];
    const qqPlotData = result.qq_plot_data || [];
    const qqPlotLine = result.qq_plot_line || [];

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-2">Normality Tests</h3>
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Test</th>
                <th className="px-4 py-2 text-right">Statistic</th>
                <th className="px-4 py-2 text-right">p-value</th>
                <th className="px-4 py-2 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.jarque_bera && (
                <tr>
                  <td className="px-4 py-2">Jarque-Bera</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.jarque_bera.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.jarque_bera.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.jarque_bera.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
              {result.shapiro && (
                <tr>
                  <td className="px-4 py-2">Shapiro-Wilk</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.shapiro.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.shapiro.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.shapiro.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
              {result.dagostino && (
                <tr>
                  <td className="px-4 py-2">D'Agostino-Pearson</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.dagostino.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.dagostino.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.dagostino.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result.skewness !== undefined && result.kurtosis !== undefined && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-2">Distribution Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Skewness: <span className="font-normal">{formatTestStat(result.skewness)}</span></p>
                <p className="text-xs text-gray-500">
                  {Math.abs(result.skewness) > 0.5
                    ? "Distribution is skewed. Consider transforming variables."
                    : "Distribution has acceptable skewness."}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Kurtosis: <span className="font-normal">{formatTestStat(result.kurtosis)}</span></p>
                <p className="text-xs text-gray-500">
                  {Math.abs(result.kurtosis - 3) > 1
                    ? "Distribution has excessive kurtosis."
                    : "Distribution has acceptable kurtosis."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Residual Histogram */}
        {histogramData && histogramData.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Residual Histogram</h3>
            <div className="chart-container">
              <ChartComponent
                id="residual-histogram"
                primaryXAxis={{
                  title: 'Residual Value',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Frequency',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ColumnSeries, Category, Legend, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={histogramData}
                    xName="bin"
                    yName="frequency"
                    name="Frequency"
                    type="Column"
                    columnWidth={0.9}
                  />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              A normal distribution should have a bell-shaped histogram.
            </p>
          </div>
        )}

        {/* Q-Q Plot */}
{qqPlotData && qqPlotData.length > 0 && (
  <div className="bg-white rounded-lg p-4">
    <h3 className="font-medium text-lg mb-2">Q-Q Plot</h3>
    <div style={{ height: "320px", width: "100%" }}>
      <ChartComponent
        id="qq-plot"
        primaryXAxis={{
          title: 'Theoretical Quantiles',
          titleStyle: { size: '14px', fontWeight: '500' },
          labelFormat: '{value}',
          edgeLabelPlacement: 'Shift',
          minimum: Math.min(...qqPlotData.map(point => point.theoretical)) - 0.5,
          maximum: Math.max(...qqPlotData.map(point => point.theoretical)) + 0.5
        }}
        primaryYAxis={{
          title: 'Sample Quantiles',
          titleStyle: { size: '14px', fontWeight: '500' },
          labelFormat: '{value}',
          minimum: Math.min(...qqPlotData.map(point => point.sample)) - 0.5,
          maximum: Math.max(...qqPlotData.map(point => point.sample)) + 0.5
        }}
        tooltip={{ enable: true }}
        legendSettings={{ visible: true }}
      >
        <Inject services={[ScatterSeries, LineSeries, Tooltip, Legend]} />
        <SeriesCollectionDirective>
          <SeriesDirective
            dataSource={qqPlotData}
            xName="theoretical"
            yName="sample"
            name="Q-Q Plot Points"
            type="Scatter"
            marker={{ visible: true, width: 7, height: 7 }}
          />
          {/* Generate a proper linear regression line for QQ plot */}
          <SeriesDirective
            dataSource={generateQQReferenceLine(qqPlotData)}
            xName="x"
            yName="y"
            name="Expected Normal"
            type="Line"
            width={2}
            marker={{ visible: false }}
            dashArray="5,5"
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </div>
    <p className="text-sm text-gray-600 mt-2">
      A normal distribution would show points following the reference line. Deviations suggest non-normality.
    </p>
  </div>
)}
      </div>
    );
  };

  // Render detailed content for autocorrelation tests
  const renderAutocorrelationTestsDetails = (result) => {
    if (!result) return <div>No results available</div>;

    // Get ACF data and time series data
    const acfPlotData = result.acf_plot_data || [];
    const confidenceBounds = result.confidence_bounds || { upper: [], lower: [] };
    const residualTimeSeries = result.residual_time_series || [];

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-2">Autocorrelation Tests</h3>
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Test</th>
                <th className="px-4 py-2 text-right">Statistic</th>
                <th className="px-4 py-2 text-right">p-value</th>
                <th className="px-4 py-2 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.durbin_watson && (
                <tr>
                  <td className="px-4 py-2">Durbin-Watson</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.durbin_watson.statistic)}</td>
                  <td className="px-4 py-2 text-right">{result.durbin_watson.pvalue ? formatPValue(result.durbin_watson.pvalue) : 'N/A'}</td>
                  <td className="px-4 py-2 text-center">
                    {result.durbin_watson.statistic && (
                      <div className={`flex items-center justify-center ${
                        result.durbin_watson.statistic > 1.5 && result.durbin_watson.statistic < 2.5
                          ? 'text-green-600'
                          : 'text-red-600'}`}>
                        {result.durbin_watson.statistic > 1.5 && result.durbin_watson.statistic < 2.5
                          ? <FiCheckCircle className="text-xl" />
                          : <FiAlertCircle className="text-xl" />}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              {result.breusch_godfrey && (
                <tr>
                  <td className="px-4 py-2">Breusch-Godfrey</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.breusch_godfrey.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.breusch_godfrey.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.breusch_godfrey.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
              {result.ljung_box && (
                <tr>
                  <td className="px-4 py-2">Ljung-Box</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.ljung_box.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.ljung_box.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.ljung_box.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ACF Plot */}
        {acfPlotData && acfPlotData.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Autocorrelation Function (ACF)</h3>
            <div className="chart-container">
              <ChartComponent
                id="acf-plot"
                primaryXAxis={{
                  title: 'Lag',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Autocorrelation',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  minimum: -1,
                  maximum: 1
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ColumnSeries, Category, Legend, Tooltip, LineSeries]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={acfPlotData}
                    xName="lag"
                    yName="acf"
                    name="ACF"
                    type="Column"
                    columnWidth={0.7}
                  />
                  {confidenceBounds && confidenceBounds.upper && confidenceBounds.upper.length > 0 && (
                    <SeriesDirective
                      dataSource={confidenceBounds.upper}
                      xName="lag"
                      yName="value"
                      name="Upper Bound"
                      type="Line"
                      width={2}
                      dashArray="5,5"
                      marker={{ visible: false }}
                    />
                  )}
                  {confidenceBounds && confidenceBounds.lower && confidenceBounds.lower.length > 0 && (
                    <SeriesDirective
                      dataSource={confidenceBounds.lower}
                      xName="lag"
                      yName="value"
                      name="Lower Bound"
                      type="Line"
                      width={2}
                      dashArray="5,5"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Bars extending beyond the dashed lines indicate significant autocorrelation at that lag.
            </p>
          </div>
        )}

        {/* Residuals Over Time */}
        {residualTimeSeries && residualTimeSeries.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Residuals Over Time</h3>
            <div className="chart-container">
              <ChartComponent
                id="residual-time"
                primaryXAxis={{
                  title: 'Observation',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Residual',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[LineSeries, Tooltip, Legend]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={residualTimeSeries}
                    xName="index"
                    yName="residual"
                    name="Residual"
                    type="Line"
                    width={2}
                    marker={{ visible: true, width: 5, height: 5 }}
                  />
                  {residualTimeSeries && residualTimeSeries.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        { x: 0, y: 0 },
                        { x: residualTimeSeries.length, y: 0 }
                      ]}
                      xName="x"
                      yName="y"
                      name="Zero Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Look for patterns in residuals over time. Random scatter around zero is ideal.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render detailed content for heteroscedasticity tests
  const renderHeteroscedasticityTestsDetails = (result) => {
    if (!result) return <div>No results available</div>;

    const residualVsFitted = result.residual_vs_fitted || [];
    const scaleLocationPlot = result.scale_location_plot || [];

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-2">Heteroscedasticity Tests</h3>
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Test</th>
                <th className="px-4 py-2 text-right">Statistic</th>
                <th className="px-4 py-2 text-right">p-value</th>
                <th className="px-4 py-2 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.breusch_pagan && (
                <tr>
                  <td className="px-4 py-2">Breusch-Pagan</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.breusch_pagan.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.breusch_pagan.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.breusch_pagan.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
              {result.white_test && (
                <tr>
                  <td className="px-4 py-2">White Test</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.white_test.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.white_test.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.white_test.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
              {result.goldfeld_quandt && (
                <tr>
                  <td className="px-4 py-2">Goldfeld-Quandt</td>
                  <td className="px-4 py-2 text-right">{formatTestStat(result.goldfeld_quandt.statistic)}</td>
                  <td className="px-4 py-2 text-right">{formatPValue(result.goldfeld_quandt.pvalue)}</td>
                  <td className="px-4 py-2 text-center">
                    {renderTestSignificance(result.goldfeld_quandt.pvalue, 0.05, true)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Residuals vs Fitted Values */}
        {residualVsFitted && residualVsFitted.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Residuals vs Fitted Values</h3>
            <div className="chart-container">
              <ChartComponent
                id="residual-fitted"
                primaryXAxis={{
                  title: 'Fitted Values',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Residuals',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ScatterSeries, Tooltip, LineSeries]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={residualVsFitted}
                    xName="fitted"
                    yName="residual"
                    name="Residuals"
                    type="Scatter"
                    marker={{ visible: true, width: 7, height: 7 }}
                  />
                  {residualVsFitted && residualVsFitted.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        { x: Math.min(...residualVsFitted.map(d => d.fitted)), y: 0 },
                        { x: Math.max(...residualVsFitted.map(d => d.fitted)), y: 0 }
                      ]}
                      xName="x"
                      yName="y"
                      name="Zero Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Residuals should be randomly scattered around zero with no pattern. Funnel patterns indicate heteroscedasticity.
            </p>
          </div>
        )}

        {/* Scale-Location Plot */}
        {scaleLocationPlot && scaleLocationPlot.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Scale-Location Plot</h3>
            <div className="chart-container">
              <ChartComponent
                id="scale-location"
                primaryXAxis={{
                  title: 'Fitted Values',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Sqrt(|Standardized Residuals|)',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ScatterSeries, Tooltip]} />
                <SeriesCollectionDirective>
                <SeriesDirective
                  dataSource={scaleLocationPlot}
                  xName="fitted"
                  yName="sqrt_abs_resid"
                  name="Scale-Location"
                  type="Scatter"
                  marker={{ visible: true, width: 7, height: 7 }}
                />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              If this plot shows a pattern (non-horizontal trend line), it suggests non-constant variance (heteroscedasticity).
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render detailed content for multicollinearity tests
const renderMulticollinearityTestsDetails = (result) => {
  console.log("Rendering multicollinearity details with data:", result);

  if (!result) {
    console.warn("No multicollinearity results available");
    return <div>No results available</div>;
  }

  // Check for VIF values with better error handling
  let vifValues = {};
  try {
    vifValues = result.vif_values || {};
    console.log("VIF values:", vifValues);
  } catch (error) {
    console.error("Error accessing VIF values:", error);
    vifValues = {};
  }

  // Check VIF format - it should be an object with variable names as keys
  if (typeof vifValues !== 'object' || vifValues === null) {
    console.warn("VIF values in unexpected format:", vifValues);
    vifValues = {};
  }

  const vifEntries = Object.entries(vifValues);
  console.log("VIF entries count:", vifEntries.length);

  // Calculate counts for each VIF category
  const lowVifCount = vifEntries.filter(([_, vif]) => {
    const vifValue = parseFloat(vif);
    return !isNaN(vifValue) && vifValue < 5;
  }).length;

  const moderateVifCount = vifEntries.filter(([_, vif]) => {
    const vifValue = parseFloat(vif);
    return !isNaN(vifValue) && vifValue >= 5 && vifValue <= 10;
  }).length;

  const highVifCount = vifEntries.filter(([_, vif]) => {
    const vifValue = parseFloat(vif);
    return !isNaN(vifValue) && vifValue > 10;
  }).length;

  // Get correlation matrix if available
  let corrMatrix = { variables: [], values: [] };
  try {
    corrMatrix = result.correlation_matrix || { variables: [], values: [] };
    console.log("Correlation matrix:", corrMatrix);
  } catch (error) {
    console.error("Error accessing correlation matrix:", error);
    corrMatrix = { variables: [], values: [] };
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Multicollinearity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-center font-medium">Low VIF Variables</p>
            <p className="text-3xl text-center mt-2 text-green-600">{lowVifCount}</p>
            <p className="text-xs text-gray-500 text-center mt-1">
              VIF &lt; 5: No multicollinearity issues
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-center font-medium">Moderate VIF Variables</p>
            <p className="text-3xl text-center mt-2 text-amber-600">{moderateVifCount}</p>
            <p className="text-xs text-gray-500 text-center mt-1">
              5 ≤ VIF ≤ 10: Some multicollinearity
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <p className="text-center font-medium">High VIF Variables</p>
            <p className="text-3xl text-center mt-2 text-red-600">{highVifCount}</p>
            <p className="text-xs text-gray-500 text-center mt-1">
              VIF &gt; 10: Severe multicollinearity
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">VIF Analysis</h3>

        {vifEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Variable</th>
                  <th className="px-4 py-2 text-right">VIF</th>
                  <th className="px-4 py-2 text-right">Tolerance (1/VIF)</th>
                  <th className="px-4 py-2 text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vifEntries.map(([variable, vif]) => {
                  // Add extra validation for VIF values
                  const vifValue = parseFloat(vif);
                  const isValidVif = !isNaN(vifValue) && isFinite(vifValue);

                  return (
                    <tr key={variable}>
                      <td className="px-4 py-2">{variable}</td>
                      <td className="px-4 py-2 text-right">
                        {isValidVif ? (
                          <span className={vifValue > 10 ? 'text-red-600 font-medium' : vifValue > 5 ? 'text-amber-600 font-medium' : ''}>
                            {formatTestStat(vifValue)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Invalid</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {isValidVif && vifValue > 0 ? (1/vifValue).toFixed(4) : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isValidVif ? (
                          vifValue > 10 ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Severe
                            </span>
                          ) : vifValue > 5 ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                              Moderate
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Low
                            </span>
                          )
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Unknown
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-gray-100 rounded-lg text-gray-600">
            <p>No VIF values available. This could be due to:</p>
            <ul className="list-disc ml-5 mt-2">
              <li>Insufficient variables in the model for VIF calculation</li>
              <li>Perfect collinearity between variables</li>
              <li>Error in VIF calculation on the server</li>
            </ul>
            <p className="mt-2">Try adding more variables to the model or check if your variables have high correlation.</p>
          </div>
        )}

        <div className="mt-4 bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">VIF Guidelines:</span> &lt;5: Low multicollinearity, 5-10: Moderate multicollinearity, &gt;10: Severe multicollinearity
          </p>
        </div>
      </div>

      {/* Correlation Matrix - only show if data is available */}
      {corrMatrix.variables && corrMatrix.variables.length > 0 &&
       corrMatrix.values && corrMatrix.values.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-medium text-lg mb-2">Correlation Matrix Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 bg-gray-50"></th>
                  {corrMatrix.variables.map(variable => (
                    <th key={variable} className="p-2 bg-gray-50 font-medium text-sm">
                      {variable}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrMatrix.variables.map((rowVar, rowIdx) => (
                  <tr key={rowVar}>
                    <th className="p-2 bg-gray-50 font-medium text-sm text-left">
                      {rowVar}
                    </th>
                    {corrMatrix.variables.map((colVar, colIdx) => {
                      // Add validation for matrix value
                      let value = 0;
                      try {
                        // Check if the value exists and is a valid number
                        const cellValue = corrMatrix.values[rowIdx]?.[colIdx];
                        value = typeof cellValue === 'number' && !isNaN(cellValue) ? cellValue : 0;
                      } catch (e) {
                        console.warn(`Error accessing correlation matrix at [${rowIdx}][${colIdx}]:`, e);
                        value = 0;
                      }

                      // Determine cell background color based on correlation value
                      let bgColor;
                      if (rowIdx === colIdx) {
                        bgColor = 'bg-gray-200'; // Diagonal (always 1)
                      } else if (Math.abs(value) > 0.8) {
                        bgColor = value > 0 ? 'bg-red-100' : 'bg-blue-100';
                      } else if (Math.abs(value) > 0.5) {
                        bgColor = value > 0 ? 'bg-red-50' : 'bg-blue-50';
                      } else {
                        bgColor = 'bg-white';
                      }

                      // Check for NaN values explicitly
                      const isNaNValue = isNaN(value) || value === null;

                      return (
                        <td key={`${rowVar}-${colVar}`} className={`p-2 ${bgColor} text-center`}>
                          {isNaNValue ? "N/A" : value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Variables with correlations above 0.8 (or below -0.8) may cause multicollinearity issues.
          </p>
        </div>
      )}
    </div>
  );
};

  // Render detailed content for influential points analysis
  const renderInfluentialPointsDetails = (result) => {
    if (!result) return <div>No results available</div>;

    // Get data for the plots and tables
    const influentialObs = result.influential_observations || [];
    const cookDistancePlot = result.cook_distance_plot || [];
    const leveragePlot = result.leverage_plot || [];

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-2">Influential Points Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.outliers && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">Outliers</p>
                <p className="text-3xl text-center mt-2">{result.outliers.count || 0}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Based on standardized residuals > 3
                </p>
              </div>
            )}
            {result.high_leverage && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">High Leverage Points</p>
                <p className="text-3xl text-center mt-2">{result.high_leverage.count || 0}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Based on hat values > 2(p+1)/n
                </p>
              </div>
            )}
            {result.cook_distance && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">Influential Points</p>
                <p className="text-3xl text-center mt-2">{result.cook_distance.count || 0}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Based on Cook's distance > 4/n
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Influential Observations Table */}
        {influentialObs && influentialObs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h3 className="font-medium text-lg p-4 bg-gray-50">Influential Observations</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Observation</th>
                    <th className="px-4 py-2 text-right">Std. Residual</th>
                    <th className="px-4 py-2 text-right">Hat Value</th>
                    <th className="px-4 py-2 text-right">Cook's Distance</th>
                    <th className="px-4 py-2 text-center">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {influentialObs.map((obs, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{obs.observation}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={Math.abs(obs.std_residual) > 3 ? 'text-red-600 font-medium' : ''}>
                          {formatTestStat(obs.std_residual)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={obs.hat_value > obs.hat_threshold ? 'text-amber-600 font-medium' : ''}>
                          {formatTestStat(obs.hat_value)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={obs.cooks_distance > obs.cook_threshold ? 'text-red-600 font-medium' : ''}>
                          {formatTestStat(obs.cooks_distance)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          obs.type.includes('Outlier')
                            ? 'bg-red-100 text-red-800'
                            : obs.type.includes('High Leverage')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {obs.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cook's Distance Plot */}
        {cookDistancePlot && cookDistancePlot.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Cook's Distance Plot</h3>
            <div className="chart-container">
              <ChartComponent
                id="cooks-distance"
                primaryXAxis={{
                  title: 'Observation',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: "Cook's Distance",
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[LineSeries, ScatterSeries, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={cookDistancePlot}
                    xName="index"
                    yName="cook_d"
                    name="Cook's Distance"
                    type="Scatter"
                    marker={{ visible: true, width: 7, height: 7 }}
                  />
                  {result.cook_distance && result.cook_distance.threshold && cookDistancePlot && cookDistancePlot.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        { x: 0, y: result.cook_distance.threshold },
                        { x: cookDistancePlot.length, y: result.cook_distance.threshold }
                      ]}
                      xName="x"
                      yName="y"
                      name="Threshold Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Points above the dashed line are influential observations that may disproportionately affect model results.
            </p>
          </div>
        )}

        {/* Leverage vs Residuals Plot */}
        {leveragePlot && leveragePlot.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Leverage vs Residuals Plot</h3>
            <div className="chart-container">
              <ChartComponent
                id="leverage-plot"
                primaryXAxis={{
                  title: 'Leverage (Hat Value)',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Standardized Residuals',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ScatterSeries, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={leveragePlot}
                    xName="leverage"
                    yName="std_resid"
                    name="Observations"
                    type="Scatter"
                    marker={{ visible: true, width: 7, height: 7 }}
                  />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Points in the top-right or bottom-right corners are high-leverage points with large residuals, making them particularly influential.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render detailed content for residual plots
  const renderResidualPlotsDetails = (result) => {
    if (!result) return <div>No results available</div>;

    const residualVsFitted = result.residual_vs_fitted || [];
    const residualTimeSeries = result.residual_time_series || [];
    const histogramData = result.histogram_data || [];
    const standardizedResiduals = result.standardized_residuals || [];

    return (
      <div className="space-y-6">
        {/* Residuals vs Fitted Values */}
        {residualVsFitted && residualVsFitted.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Residuals vs Fitted Values</h3>
            <div className="chart-container">
              <ChartComponent
                id="residual-fitted"
                primaryXAxis={{
                  title: 'Fitted Values',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Residuals',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ScatterSeries, Tooltip, LineSeries]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={residualVsFitted}
                    xName="fitted"
                    yName="residual"
                    name="Residuals"
                    type="Scatter"
                    marker={{ visible: true, width: 7, height: 7 }}
                  />
                  {residualVsFitted && residualVsFitted.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        { x: Math.min(...residualVsFitted.map(d => d.fitted)), y: 0 },
                        { x: Math.max(...residualVsFitted.map(d => d.fitted)), y: 0 }
                      ]}
                      xName="x"
                      yName="y"
                      name="Zero Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Look for patterns. Residuals should be randomly distributed around zero at all fitted values.
            </p>
          </div>
        )}

        {/* Residuals Over Time */}
        {residualTimeSeries && residualTimeSeries.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Residuals Over Time</h3>
            <div className="chart-container">
              <ChartComponent
                id="residual-time"
                primaryXAxis={{
                  title: 'Observation',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Residual',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[LineSeries, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={residualTimeSeries}
                    xName="index"
                    yName="residual"
                    name="Residual"
                    type="Line"
                    width={2}
                    marker={{ visible: true, width: 5, height: 5 }}
                  />
                  {residualTimeSeries && residualTimeSeries.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        { x: 0, y: 0 },
                        { x: residualTimeSeries.length, y: 0 }
                      ]}
                      xName="x"
                      yName="y"
                      name="Zero Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Look for patterns over time that might suggest autocorrelation or model misspecification.
            </p>
          </div>
        )}

        {/* Standardized Residuals */}
        {standardizedResiduals && standardizedResiduals.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Standardized Residuals</h3>
            <div className="chart-container">
              <ChartComponent
                id="std-residual-plot"
                primaryXAxis={{
                  title: 'Observation',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Standardized Residual',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[LineSeries, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={standardizedResiduals}
                    xName="index"
                    yName="std_resid"
                    name="Standardized Residual"
                    type="Line"
                    width={2}
                    marker={{ visible: true, width: 5, height: 5 }}
                  />
                  {standardizedResiduals && standardizedResiduals.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        { x: 0, y: 0 },
                        { x: standardizedResiduals.length, y: 0 }
                      ]}
                      xName="x"
                      yName="y"
                      name="Zero Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                  {standardizedResiduals && standardizedResiduals.length > 0 && (
                    <>
                      <SeriesDirective
                        dataSource={[
                          { x: 0, y: 2 },
                          { x: standardizedResiduals.length, y: 2 }
                        ]}
                        xName="x"
                        yName="y"
                        name="Upper Bound"
                        type="Line"
                        width={1}
                        dashArray="3,3"
                        marker={{ visible: false }}
                      />
                      <SeriesDirective
                        dataSource={[
                          { x: 0, y: -2 },
                          { x: standardizedResiduals.length, y: -2 }
                        ]}
                        xName="x"
                        yName="y"
                        name="Lower Bound"
                        type="Line"
                        width={1}
                        dashArray="3,3"
                        marker={{ visible: false }}
                      />
                    </>
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              95% of standardized residuals should fall within ±2. Points outside these bounds may be outliers.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render detailed content for actual vs predicted plot
  const renderActualVsPredictedDetails = (result) => {
    if (!result) return <div>No results available</div>;

    const actualVsPredicted = result.actual_vs_predicted || [];
    const predictionTimeSeries = result.prediction_time_series || [];
    const predictionStats = result.prediction_stats || {};

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-2">Prediction Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictionStats.r_squared !== undefined && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">R-squared</p>
                <p className="text-3xl text-center mt-2">{formatTestStat(predictionStats.r_squared)}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Proportion of variance explained
                </p>
              </div>
            )}
            {predictionStats.adj_rsquared !== undefined && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">Adj. R-squared</p>
                <p className="text-3xl text-center mt-2">{formatTestStat(predictionStats.adj_rsquared)}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  R-squared adjusted for variables
                </p>
              </div>
            )}
            {predictionStats.mape !== undefined && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">MAPE</p>
                <p className="text-3xl text-center mt-2">{formatTestStat(predictionStats.mape)}%</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Mean Absolute Percentage Error
                </p>
              </div>
            )}
            {predictionStats.mae !== undefined && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">MAE</p>
                <p className="text-3xl text-center mt-2">{formatTestStat(predictionStats.mae)}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Mean Absolute Error
                </p>
              </div>
            )}
            {predictionStats.rmse !== undefined && (
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-center font-medium">RMSE</p>
                <p className="text-3xl text-center mt-2">{formatTestStat(predictionStats.rmse)}</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Root Mean Squared Error
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rest of the function remains the same */}
        {/* Actual vs Predicted Scatter Plot */}
        {actualVsPredicted && actualVsPredicted.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Actual vs Predicted Values</h3>
            <div style={{ height: "320px", width: "100%" }}>
              <ChartComponent
                id="actual-vs-predicted"
                height="100%"
                width="100%"
                primaryXAxis={{
                  title: 'Actual Values',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Predicted Values',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: false }}
              >
                <Inject services={[ScatterSeries, LineSeries, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={actualVsPredicted}
                    xName="actual"
                    yName="predicted"
                    name="Data Points"
                    type="Scatter"
                    marker={{ visible: true, width: 7, height: 7 }}
                  />
                  {actualVsPredicted && actualVsPredicted.length > 0 && (
                    <SeriesDirective
                      dataSource={[
                        {
                          x: Math.min(...actualVsPredicted.map(d => d.actual)),
                          y: Math.min(...actualVsPredicted.map(d => d.actual))
                        },
                        {
                          x: Math.max(...actualVsPredicted.map(d => d.actual)),
                          y: Math.max(...actualVsPredicted.map(d => d.actual))
                        }
                      ]}
                      xName="x"
                      yName="y"
                      name="Perfect Prediction Line"
                      type="Line"
                      width={1}
                      dashArray="3,3"
                      marker={{ visible: false }}
                    />
                  )}
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Points should follow the diagonal line for perfect predictions. The closer to the line, the better the model fit.
            </p>
          </div>
        )}

        {/* Actual vs Predicted Time Series */}
        {predictionTimeSeries && predictionTimeSeries.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Actual vs Predicted Time Series</h3>
            <div style={{ height: "320px", width: "100%" }}>
              <ChartComponent
                id="time-series-plot"
                height="100%"
                width="100%"
                primaryXAxis={{
                  title: 'Observation',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}',
                  edgeLabelPlacement: 'Shift'
                }}
                primaryYAxis={{
                  title: 'Value',
                  titleStyle: { size: '14px', fontWeight: '500' },
                  labelFormat: '{value}'
                }}
                tooltip={{ enable: true }}
                legendSettings={{ visible: true }}
              >
                <Inject services={[LineSeries, Legend, Tooltip]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={predictionTimeSeries}
                    xName="index"
                    yName="actual"
                    name="Actual"
                    type="Line"
                    width={2}
                    marker={{ visible: true, width: 5, height: 5 }}
                  />
                  <SeriesDirective
                    dataSource={predictionTimeSeries}
                    xName="index"
                    yName="predicted"
                    name="Predicted"
                    type="Line"
                    width={2}
                    dashArray="5,5"
                    marker={{ visible: true, width: 5, height: 5 }}
                  />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This plot shows how well the model tracks the actual values over time. Look for periods where predictions are consistently off.
            </p>
          </div>
        )}
      </div>
    );
  };

  // This function renders the appropriate content based on the test ID
  const renderDetailContent = (testId) => {
    const result = diagnosticResults[testId];
    if (!result) return <div>No results available</div>;

    switch (testId) {
      case 'residual_normality':
        return renderNormalityTestsDetails(result);
      case 'autocorrelation':
        return renderAutocorrelationTestsDetails(result);
      case 'heteroscedasticity':
        return renderHeteroscedasticityTestsDetails(result);
      case 'influential_points':
        return renderInfluentialPointsDetails(result);
      case 'multicollinearity':
        return renderMulticollinearityTestsDetails(result);
      case 'residual_plots':
        return renderResidualPlotsDetails(result);
      case 'actual_vs_predicted':
        return renderActualVsPredictedDetails(result);
      default:
        return (
          <div className="p-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-lg mb-2">{testId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Results</h3>
              <pre className="bg-gray-200 p-4 rounded overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        );
    }
  };

  // Render test items (checkboxes)
  const renderTestItems = () => {
    return (
      <div className="mt-6 bg-white dark:bg-secondary-dark-bg p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Available Diagnostic Tests</h3>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAllChange}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-sm">Select All</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTests.map(test => (
            <div key={test.id} className="flex items-start">
              <input
                type="checkbox"
                id={`test-${test.id}`}
                checked={test.checked}
                onChange={() => handleTestCheckboxChange(test.id)}
                className="form-checkbox h-5 w-5 text-blue-600 mt-1"
              />
              <label htmlFor={`test-${test.id}`} className="ml-2">
                <div className="font-medium">{test.name}</div>
                <div className="text-sm text-gray-500">{test.description}</div>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <ButtonComponent
            cssClass="e-success"
            style={{ backgroundColor: currentColor, borderColor: currentColor }}
            onClick={runDiagnosticTests}
            disabled={!selectedModel || loading || availableTests.every(t => !t.checked)}
          >
            <div className="flex items-center gap-1">
              <FiActivity className="mr-1" />
              Run Selected Tests
            </div>
          </ButtonComponent>
        </div>
      </div>
    );
  };

  // Render diagnostic results cards
  const renderDiagnosticCards = () => {
    if (Object.keys(diagnosticResults).length === 0) {
      return null;
    }

    return (
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {availableTests.filter(t => t.checked && diagnosticResults[t.id]).map(test => (
          <div
            key={test.id}
            className="bg-white dark:bg-secondary-dark-bg p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold mb-1">{test.name}</h3>
                <p className="text-sm text-gray-500">{test.description}</p>
              </div>
              <ButtonComponent
                cssClass="e-outline e-info"
                style={{
                  borderColor: currentColor,
                  color: currentColor,
                  minWidth: 'auto',
                  padding: '4px 8px'
                }}
                onClick={() => showTestDetails(test.id, test.name)}
              >
                <div className="flex items-center gap-1">
                  <FiBarChart2 className="mr-1" />
                  View Details
                </div>
              </ButtonComponent>
            </div>

            <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Key Findings</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {getTestInterpretation(test.id, diagnosticResults[test.id])}
              </p>
            </div>

            {/* Test-specific result preview */}
            {test.id === 'residual_normality' && diagnosticResults[test.id]?.jarque_bera && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Jarque-Bera Test:</span>
                  <span className={`text-sm ${diagnosticResults[test.id].jarque_bera.pvalue < 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                    p-value: {formatPValue(diagnosticResults[test.id].jarque_bera.pvalue)}
                  </span>
                </div>
              </div>
            )}

            {test.id === 'autocorrelation' && diagnosticResults[test.id]?.durbin_watson && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Durbin-Watson:</span>
                  <span className={`text-sm ${
                    diagnosticResults[test.id].durbin_watson.statistic < 1.5 ||
                    diagnosticResults[test.id].durbin_watson.statistic > 2.5
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {formatTestStat(diagnosticResults[test.id].durbin_watson.statistic)}
                  </span>
                </div>
              </div>
            )}

            {test.id === 'heteroscedasticity' && diagnosticResults[test.id]?.breusch_pagan && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Breusch-Pagan Test:</span>
                  <span className={`text-sm ${diagnosticResults[test.id].breusch_pagan.pvalue < 0.05 ? 'text-red-600' : 'text-green-600'}`}>
                    p-value: {formatPValue(diagnosticResults[test.id].breusch_pagan.pvalue)}
                  </span>
                </div>
              </div>
            )}

            {test.id === 'influential_points' && diagnosticResults[test.id]?.outliers && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Outliers found:</span>
                  <span className={`text-sm ${diagnosticResults[test.id].outliers.count > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {diagnosticResults[test.id].outliers.count}
                  </span>
                </div>
              </div>
            )}

            {test.id === 'multicollinearity' && diagnosticResults[test.id]?.max_vif !== undefined && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Maximum VIF:</span>
                  <span className={`text-sm ${
                    diagnosticResults[test.id].max_vif > 10
                      ? 'text-red-600'
                      : diagnosticResults[test.id].max_vif > 5
                        ? 'text-amber-600'
                        : 'text-green-600'
                  }`}>
                    {formatTestStat(diagnosticResults[test.id].max_vif)}
                  </span>
                </div>
              </div>
            )}

{test.id === 'actual_vs_predicted' && diagnosticResults[test.id]?.prediction_stats && (
  <div className="mt-4">
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium">R-squared:</span>
      <span className="text-sm">
        {formatTestStat(diagnosticResults[test.id].prediction_stats.r_squared)}
      </span>
    </div>
    {diagnosticResults[test.id].prediction_stats.adj_rsquared !== undefined && (
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm font-medium">Adj. R-squared:</span>
        <span className="text-sm">
          {formatTestStat(diagnosticResults[test.id].prediction_stats.adj_rsquared)}
        </span>
      </div>
    )}
    {diagnosticResults[test.id].prediction_stats.mape !== undefined && (
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm font-medium">MAPE:</span>
        <span className="text-sm">
          {formatTestStat(diagnosticResults[test.id].prediction_stats.mape)}%
        </span>
      </div>
    )}
  </div>
)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="m-2 md:m-10 mt-24 p-2 md:p-10 bg-white dark:bg-secondary-dark-bg rounded-3xl">
      <Header category="Analysis" title="Model Diagnostics" />

      <div className="mt-6 bg-white dark:bg-secondary-dark-bg p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Select Model to Analyze</h3>

        <div className="mb-4">
          <DropDownListComponent
            id="model-select"
            dataSource={models.map(m => ({ text: m.name, value: m.name }))}
            fields={{ text: 'text', value: 'value' }}
            value={selectedModel}
            change={handleModelChange}
            placeholder="Select a model"
            style={{ width: '100%' }}
          />
        </div>

        {selectedModel && !showTestSelection && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <p className="text-sm">
              Run diagnostic tests to evaluate model assumptions, detect outliers, and assess model fit. Select tests below and click "Run Selected Tests" to begin.
            </p>
            <div className="mt-4">
              <ButtonComponent
                cssClass="e-success"
                style={{ backgroundColor: currentColor, borderColor: currentColor }}
                onClick={handleContinue}
                disabled={loading}
              >
                <div className="flex items-center gap-1">
                  <FiActivity className="mr-1" />
                  Continue to Diagnostics
                </div>
              </ButtonComponent>
            </div>
          </div>
        )}
      </div>

      {selectedModel && showTestSelection && renderTestItems()}

      {Object.keys(diagnosticResults).length > 0 && renderDiagnosticCards()}

      {/* Detail Dialog */}
      {showDetailDialog && (
        <DialogComponent
          width="80%"
          height="80%"
          isModal={true}
          visible={showDetailDialog}
          close={() => setShowDetailDialog(false)}
          header={detailDialogContent.title}
          showCloseIcon={true}
        >
          <div className="p-4 overflow-y-auto h-full" style={{ maxHeight: 'calc(90vh - 80px)', overflowX: 'hidden' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{detailDialogContent.title} Details</h3>
              <ButtonComponent
                cssClass="e-outline"

                onClick={handleDownloadReport}
              >
                <div className="flex items-center gap-1">
                <FiDownload className="mr-1" />
                  Download Report
                </div>
              </ButtonComponent>
            </div>
            {detailDialogContent.content}
          </div>
        </DialogComponent>
      )}

      <style>{`
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

        .e-dialog .e-dlg-header {
          padding: 15px;
          font-weight: 500;
        }

        .e-dialog .e-dlg-content {
          padding: 0;
        }

        .chart-container {
          min-height: 300px;
          height: 40vh;
          width: 100%;
          margin-bottom: 20px;
        }

        .e-chart {
          min-height: 300px !important;
        }
      `}
      </style>
    </div>
  );
};

export default ModelDiagnostics;