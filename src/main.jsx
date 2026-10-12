import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/quiet/quiet.css'
import App from './App.jsx'

// A tab left open across a deploy still references the old hashed chunks;
// the first lazy import after that (the 3D map) 404s. Reload once to pick up
// the new build instead of crashing — but never loop, and never while offline
// (the service worker serves what it has; the error boundary handles the rest).
window.addEventListener('vite:preloadError', (event) => {
  let last = 0
  try { last = Number(sessionStorage.getItem('hfm_reload_for_update')) || 0 } catch (e) { /* storage blocked */ }
  if (Date.now() - last < 60000 || navigator.onLine === false) return
  try { sessionStorage.setItem('hfm_reload_for_update', String(Date.now())) } catch (e) { /* ignore */ }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
