import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import './styles.css';
import { registerServiceWorker } from './lib/push';
import { applyLangToDocument, useLang } from './lib/i18n';
import { applyA11y } from './lib/a11y';

registerServiceWorker();
applyLangToDocument();
applyA11y();

/** Changing the language re-mounts the app, so every screen picks up the new texts and direction. */
function LangRoot() {
  const lang = useLang();
  return <App key={lang} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider><LangRoot /></AuthProvider>
  </React.StrictMode>,
);
