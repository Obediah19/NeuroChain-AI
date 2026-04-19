import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SupplyChainProvider } from './context/SupplyChainContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

console.log('Main: Starting render...');

const root = document.getElementById('root');

if (!root) {
  console.error("Root element not found");
  document.body.innerHTML = `<div style="padding:20px;text-align:center;color:red;"><h1>Error</h1><p>Root element #root not found in DOM</p></div>`;
} else {
  try {
    console.log('Main: Creating React root...');
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ThemeProvider>
          <AuthProvider>
            <SupplyChainProvider>
              <App />
            </SupplyChainProvider>
          </AuthProvider>
        </ThemeProvider>
      </React.StrictMode>,
    );
    console.log('Main: Render called successfully');
  } catch (e) {
    console.error("Render error:", e);
    root.innerHTML = `<div style="padding:20px;text-align:center;color:red;"><h1>Error</h1><p>${e.message}</p></div>`;
  }
}