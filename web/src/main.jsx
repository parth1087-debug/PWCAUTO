import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/inter/wght.css';
import './styles.css';

try { document.documentElement.dataset.theme = JSON.parse(localStorage.getItem('pwc-cpi.theme')) || 'light'; } catch { /* storage blocked */ }
createRoot(document.getElementById('root')).render(<App />);
