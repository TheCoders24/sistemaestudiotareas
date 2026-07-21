import { useState, useEffect } from 'react'
import MainApp from './App'
import { initDatabase } from './lib/database'

export default function Root() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initDatabase().then(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Inicializando base de datos...</p>
        </div>
      </div>
    )
  }

  return <MainApp />
}
