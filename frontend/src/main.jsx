import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installDemoApi } from './lib/demoApi.js';
import './index.css';

installDemoApi();

const container = document.getElementById('root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
