import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Register the PWA service worker with auto-update behavior
registerSW({
  onNeedRefresh() {
    if (confirm('New version of Dark PDF is available. Update now?')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.log('Dark PDF is ready for offline use!')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
