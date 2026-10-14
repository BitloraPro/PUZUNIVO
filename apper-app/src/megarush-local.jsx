import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import MegaRush from './pages/MegaRush.jsx';

// Independent local practice entrypoint:
// import ONLY the 3D gameplay and its engine, not the Apper platform bootstrap.
// This allows Termux to run the new visual build without any Apper secret or SDK.
function LocalMegaRush() {
  return (
    <BrowserRouter>
      <MegaRush />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocalMegaRush />
  </React.StrictMode>
);
