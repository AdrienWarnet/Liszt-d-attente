import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Polices embarquées dans l'app (disponibles hors ligne), jeu latin seulement.
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/instrument-serif/latin-400.css'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './pwa/persistStorage'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
