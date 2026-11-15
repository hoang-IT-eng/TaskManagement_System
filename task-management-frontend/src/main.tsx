import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/hanken-grotesk';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { Providers } from './Providers';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Providers><App /></Providers>
    </BrowserRouter>
  </StrictMode>,
);
