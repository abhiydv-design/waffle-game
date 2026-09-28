import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { DesktopOnly } from './components/DesktopOnly';
import { isMobileDevice } from './game/device';
import './styles.css';

// The game (and its camera / hand-tracking code) only loads on computers.
const App = lazy(() => import('./App'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMobileDevice() ? <DesktopOnly /> : <Suspense fallback={null}><App /></Suspense>}
  </React.StrictMode>,
);
