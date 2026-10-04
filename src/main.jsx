import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installLiquidClicks } from './kit/liquid.js';
import './styles/tokens.css';
import './styles/base.css';
import './styles/kit.css';
import './styles/home.css';
import './styles/worlds.css';

installLiquidClicks();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
