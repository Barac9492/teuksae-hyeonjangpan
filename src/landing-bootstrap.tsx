import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LandingPage } from './features/landing/LandingPage';
import './styles/landing-base.css';
import './features/landing/landing.css';

export function bootstrap(): void {
  const root = document.getElementById('root');
  if (!root) throw new Error('root element was not found');
  createRoot(root).render(<StrictMode><LandingPage /></StrictMode>);
}
