import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { DesktopOnly } from './components/DesktopOnly';
import { isMobileDevice } from './game/device';
import './styles.css';

// The game (and its camera / hand-tracking code) only loads on computers.
const App = lazy(() => import('./App'));
const mobile = isMobileDevice();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {mobile ? <DesktopOnly /> : <Suspense fallback={null}><App /></Suspense>}
    <Analytics />
  </React.StrictMode>,
);
