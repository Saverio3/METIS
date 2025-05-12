import React from 'react';
import ReactDOM from 'react-dom';
import { registerLicense } from '@syncfusion/ej2-base';

import './index.css';
import './styles/clerk-styles.css';
import App from './App';
import { ContextProvider } from './contexts/ContextProvider';

// Register Syncfusion license - add this before rendering
if (process.env.REACT_APP_SYNCFUSION_LICENSE_KEY) {
  registerLicense(process.env.REACT_APP_SYNCFUSION_LICENSE_KEY);
  console.log('Syncfusion license registered successfully');
} else {
  console.warn('Syncfusion license key not found in environment variables');
}

ReactDOM.render(
  <React.StrictMode>
    <ContextProvider>
      <App />
    </ContextProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
