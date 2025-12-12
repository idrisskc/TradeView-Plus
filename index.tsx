import * as React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Polyfill for libraries expecting global React (common in CDN/UMD builds)
(window as any).React = React;
(window as any).ReactDOM = ReactDOMClient;

// Robust retrieval of createRoot handling both ESM named exports and CJS/UMD default exports
const createRoot = (ReactDOMClient as any).createRoot || (ReactDOMClient as any).default?.createRoot;

if (!createRoot) {
  throw new Error("Failed to load createRoot from react-dom/client");
}

const root = createRoot(rootElement);
root.render(
  <App />
);