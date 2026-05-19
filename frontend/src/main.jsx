import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { DataSourceProvider } from './context/DataSourceContext';
import { RefreshProvider } from './context/RefreshContext';
import './index.css';

document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DataSourceProvider>
          <RefreshProvider>
            <App />
          </RefreshProvider>
        </DataSourceProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
