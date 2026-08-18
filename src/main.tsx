import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { installFaultTolerance } from '@/lib/fault-tolerance'
import './index.css'

console.log('[MAIN] main.tsx starting, electronAPI:', typeof window.electronAPI)
installFaultTolerance()
const rootEl = document.getElementById('root')
console.log('[MAIN] root element:', rootEl)

try {
  ReactDOM.createRoot(rootEl!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
  console.log('[MAIN] React rendered successfully')
} catch (e) {
  console.error('[MAIN] React render error:', e)
}
