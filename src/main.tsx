import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadAppConfig } from './domain/config';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';

async function bootstrap(): Promise<void> {
  const config = await loadAppConfig();
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('root 엘리먼트를 찾을 수 없습니다.');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App config={config} />
    </React.StrictMode>,
  );

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const registerServiceWorker = (): void => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }
  }
}

void bootstrap();
