import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { DataSourceProvider } from './context/DataSourceContext';
import './index.css';

const theme = localStorage.getItem('wazuhx-theme') || 'dark';
document.documentElement.classList.toggle('dark', theme === 'dark');
document.documentElement.classList.toggle('light', theme === 'light');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DataSourceProvider>
          <App />
        </DataSourceProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
