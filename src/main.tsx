import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AtlasApp } from './atlas/App';
import './atlas/atlas.css';
createRoot(document.getElementById('root')!).render(<StrictMode><AtlasApp/></StrictMode>);
