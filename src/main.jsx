import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NotificacoesProvider } from './contexts/NotificacoesContext';
import './index.css';

// No build de preview (Artifact) não existe rewrite de SPA, então usamos HashRouter.
// Em dev e no deploy da Vercel (vercel.json) continua BrowserRouter, com URLs limpas.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Router>
        <AuthProvider>
          <NotificacoesProvider>
            <App />
          </NotificacoesProvider>
        </AuthProvider>
      </Router>
    </MotionConfig>
  </StrictMode>,
);
