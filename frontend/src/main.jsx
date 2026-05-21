import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './components/auth/AuthProvider';
import App from './App';
import './lib/i18n'; // i18n must be imported before index.css so it initializes first
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
