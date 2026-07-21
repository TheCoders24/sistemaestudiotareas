import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.estudioapp.mobile',
  appName: 'Estudio y Tareas',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: { launchShowDuration: 2000 },
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
}

export default config
