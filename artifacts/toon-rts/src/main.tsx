import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// Register TGALoader globally so FBXLoader can resolve .tga texture references
// inside FBX files (artists often embed relative or absolute .tga paths).
THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new TGALoader());

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError() so the dev overlay stays clear.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
