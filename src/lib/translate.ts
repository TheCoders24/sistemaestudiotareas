import { useAppStore } from '@/stores/appStore'

const ES: Record<string, string> = {
  'app.name': 'EstudioApp',
  'sidebar.inicio': 'Inicio',
  'sidebar.pomodoro': 'Pomodoro',
  'sidebar.kanban': 'Kanban',
  'sidebar.tareas': 'Tareas',
  'sidebar.proyectos': 'Proyectos',
  'sidebar.diario': 'Diario',
  'sidebar.calendario': 'Calendario',
  'sidebar.snippets': 'Snippets',
  'sidebar.habitos': 'Hábitos',
  'sidebar.logros': 'Logros',
  'sidebar.desafios': 'Desafíos',
  'sidebar.mapa': 'Estudio',
  'sidebar.stats': 'Stats',
  'sidebar.notas': 'Notas',
  'sidebar.metas': 'Metas',
  'sidebar.reporte': 'Reporte',
  'sidebar.papelera': 'Papelera',
  'search.placeholder': 'Buscar...',
  'search.no_results': 'Sin resultados',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.create': 'Crear',
  'common.close': 'Cerrar',
  'common.loading': 'Cargando...',
  'theme.dark': 'Oscuro',
  'theme.light': 'Claro',
}

const EN: Record<string, string> = {
  'app.name': 'EstudioApp',
  'sidebar.inicio': 'Dashboard',
  'sidebar.pomodoro': 'Pomodoro',
  'sidebar.kanban': 'Kanban',
  'sidebar.tareas': 'Tasks',
  'sidebar.proyectos': 'Projects',
  'sidebar.diario': 'Daily Log',
  'sidebar.calendario': 'Calendar',
  'sidebar.snippets': 'Snippets',
  'sidebar.habitos': 'Habits',
  'sidebar.logros': 'Achievements',
  'sidebar.desafios': 'Challenges',
  'sidebar.mapa': 'Study Map',
  'sidebar.stats': 'Statistics',
  'sidebar.notas': 'Notes',
  'sidebar.metas': 'Goals',
  'sidebar.reporte': 'Report',
  'sidebar.papelera': 'Trash',
  'search.placeholder': 'Search...',
  'search.no_results': 'No results',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.close': 'Close',
  'common.loading': 'Loading...',
  'theme.dark': 'Dark',
  'theme.light': 'Light',
}

const translations: Record<string, Record<string, string>> = { es: ES, en: EN }

export function t(key: string): string {
  const lang = useAppStore.getState().language
  return translations[lang]?.[key] || translations['es']?.[key] || key
}

export function useTranslate() {
  const language = useAppStore((s) => s.language)
  return (key: string) => translations[language]?.[key] || translations['es']?.[key] || key
}
