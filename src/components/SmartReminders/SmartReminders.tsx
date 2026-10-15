import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Clock, AlertTriangle, AlertOctagon, Plus, Settings, ChevronDown, Volume2, VolumeX } from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  priority: string;
  status: string;
  completed: number;
  category: string | null;
  reminder: string | null;
}

interface EscalationLevel {
  enabled: boolean;
  hours: number;
  sound: boolean;
}

interface EscalationConfig {
  level1: EscalationLevel;
  level2: EscalationLevel;
  level3: EscalationLevel;
  level4: EscalationLevel;
}

const DEFAULT_CONFIG: EscalationConfig = {
  level1: { enabled: true, hours: 24, sound: false },
  level2: { enabled: true, hours: 0, sound: true },
  level3: { enabled: true, hours: 3, sound: true },
  level4: { enabled: true, hours: 1, sound: true }
};

const LEVELS = [
  { key: 'level1' as const, label: 'Recordatorio suave', color: 'green', icon: <Bell className="w-4 h-4" />, borderClass: 'border-green-500/50', bgClass: 'bg-green-500/10', textClass: 'text-green-400' },
  { key: 'level2' as const, label: 'Atención', color: 'yellow', icon: <Clock className="w-4 h-4" />, borderClass: 'border-yellow-500/50', bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-400' },
  { key: 'level3' as const, label: 'Urgente', color: 'orange', icon: <AlertTriangle className="w-4 h-4" />, borderClass: 'border-orange-500/50', bgClass: 'bg-orange-500/10', textClass: 'text-orange-400' },
  { key: 'level4' as const, label: 'CRÍTICO', color: 'red', icon: <AlertOctagon className="w-4 h-4" />, borderClass: 'border-red-500/50', bgClass: 'bg-red-500/10', textClass: 'text-red-400' }
];

function getPriorityColor(p: string): string {
  if (p === 'alta') return 'bg-red-500/20 text-red-400 border-red-500';
  if (p === 'media') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
  return 'bg-blue-500/20 text-blue-400 border-blue-500';
}

function getEscalationLevel(reminderDate: string): number {
  const now = new Date();
  const rem = new Date(reminderDate);
  const diffH = (rem.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffH <= 0) return 4;
  if (diffH <= 1) return 4;
  if (diffH <= 3) return 3;
  if (diffH <= 12) return 2;
  return 1;
}

function getEscalationLabel(level: number): string {
  return LEVELS[level - 1]?.label || '';
}

function getEscalationColor(level: number): string {
  return LEVELS[level - 1]?.textClass || 'text-gray-400';
}

function getEscalationBorder(level: number): string {
  return LEVELS[level - 1]?.borderClass || 'border-gray-500';
}

function getEscalationBg(level: number): string {
  return LEVELS[level - 1]?.bgClass || 'bg-gray-500/10';
}

export default function SmartReminders() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [config, setConfig] = useState<EscalationConfig>(DEFAULT_CONFIG);
  const [showPast, setShowPast] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [reminderDate, setReminderDate] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const data = await (window as any).electronAPI.tasks.list();
      if (data && Array.isArray(data)) setTasks(data);
    } catch { }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const saved = await (window as any).electronAPI.settings.get('escalation_config');
      if (saved) setConfig(JSON.parse(saved));
    } catch { }
  }, []);

  useEffect(() => {
    loadTasks();
    loadConfig();
  }, [loadTasks, loadConfig]);

  const tasksWithReminders = tasks.filter(t => t.reminder);
  const now = new Date();
  const upcoming = tasksWithReminders.filter(t => new Date(t.reminder!) > now)
    .sort((a, b) => new Date(a.reminder!).getTime() - new Date(b.reminder!).getTime());
  const past = tasksWithReminders.filter(t => new Date(t.reminder!) <= now)
    .sort((a, b) => new Date(b.reminder!).getTime() - new Date(a.reminder!).getTime());
  const overdue = upcoming.filter(t => {
    const diff = new Date(t.reminder!).getTime() - now.getTime();
    return diff < 3 * 60 * 60 * 1000;
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayCount = tasksWithReminders.filter(t => {
    const d = new Date(t.reminder!);
    return d >= todayStart && d <= todayEnd;
  }).length;

  const toggleConfigLevel = (key: keyof EscalationConfig) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } };
      (window as any).electronAPI?.settings.set('escalation_config', JSON.stringify(updated));
      return updated;
    });
  };

  const updateConfigHours = (key: keyof EscalationConfig, hours: number) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: { ...prev[key], hours } };
      (window as any).electronAPI?.settings.set('escalation_config', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleConfigSound = (key: keyof EscalationConfig) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: { ...prev[key], sound: !prev[key].sound } };
      (window as any).electronAPI?.settings.set('escalation_config', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCreateReminder = async () => {
    if (!selectedTaskId || !reminderDate) return;
    try {
      await (window as any).electronAPI?.tasks.update(selectedTaskId, { reminder: reminderDate });
      setShowCreate(false);
      setSelectedTaskId(null);
      setReminderDate('');
      loadTasks();
    } catch { }
  };

  const renderReminderCard = (task: Task, isOverdue = false) => {
    const level = getEscalationLevel(task.reminder!);
    return (
      <motion.div key={task.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
        className={`relative bg-gray-800/50 border rounded-xl p-4 ${isOverdue ? 'border-red-500/70 animate-pulse' : getEscalationBorder(level)}`}>
        {isOverdue && (
          <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 border-2 border-red-500/30 rounded-xl pointer-events-none" />
        )}
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 p-2 rounded-lg ${getEscalationBg(level)}`}>
            {LEVELS[level - 1]?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-white font-medium truncate">{task.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={getEscalationColor(level)}>
                Nivel {level}: {getEscalationLabel(level)}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">
                {new Date(task.reminder!).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {task.due_date && (
              <p className="text-xs text-gray-500 mt-1">
                Vence: {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30">
              <BellRing className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Recordatorios Inteligentes</h1>
              <p className="text-gray-400">Sistema de escalación automática de recordatorios</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all">
            <Plus className="w-4 h-4" />
            Crear recordatorio
          </motion.button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-white">{tasksWithReminders.length}</span>
            <p className="text-xs text-gray-500 mt-1">Total activos</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gray-900/50 border border-red-500/30 rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-red-400">{overdue.length}</span>
            <p className="text-xs text-gray-500 mt-1">Vencidos</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-gray-900/50 border border-yellow-500/30 rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-yellow-400">{todayCount}</span>
            <p className="text-xs text-gray-500 mt-1">Hoy</p>
          </motion.div>
        </div>

        {overdue.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="w-5 h-5 text-red-400" />
              <h2 className="text-xl font-bold text-red-400">Recordatorios urgentes</h2>
            </div>
            <div className="space-y-3">
              {overdue.map(t => renderReminderCard(t, true))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Recordatorios pendientes</h2>
            </div>
            <div className="flex items-center gap-2">
              {LEVELS.map((l, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full bg-${l.color}-500`} />
                  <span className="hidden md:inline">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="font-medium">No hay recordatorios pendientes</p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500/50 via-yellow-500/50 via-orange-500/50 to-red-500/50" />
              {upcoming.map(t => (
                <div key={t.id} className="relative pl-12">
                  <div className={`absolute left-4.5 top-4 w-3 h-3 rounded-full border-2 ${getEscalationBorder(getEscalationLevel(t.reminder!))} bg-gray-900 z-10`} style={{ left: '18px' }} />
                  {renderReminderCard(t)}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <button onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-3">
            <ChevronDown className={`w-4 h-4 transition-transform ${showPast ? 'rotate-180' : ''}`} />
            <span className="font-medium">Recordatorios pasados ({past.length})</span>
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3">
                {past.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4">No hay recordatorios pasados</p>
                ) : (
                  past.map(t => renderReminderCard(t))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 w-full">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold text-white">Configuración de escalación</h2>
            <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showConfig && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4 space-y-4">
                {LEVELS.map((l, i) => {
                  const key = l.key;
                  const cfg = config[key];
                  return (
                    <div key={key} className={`flex items-center justify-between p-4 rounded-xl border ${cfg.enabled ? l.borderClass : 'border-gray-800'} ${cfg.enabled ? l.bgClass : 'bg-gray-900/30'} transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className={cfg.enabled ? l.textClass : 'text-gray-600'}>{l.icon}</div>
                        <div>
                          <p className={`font-medium ${cfg.enabled ? 'text-white' : 'text-gray-500'}`}>{l.label}</p>
                          <p className="text-xs text-gray-500">Nivel {i + 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Horas antes:</span>
                          <input type="number" min={0} max={72} value={cfg.hours}
                            onChange={e => updateConfigHours(key, parseInt(e.target.value) || 0)}
                            className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-gray-500" />
                        </div>
                        <button onClick={() => toggleConfigSound(key)}
                          className={`p-2 rounded-lg transition-colors ${cfg.sound ? l.textClass : 'text-gray-600'}`}>
                          {cfg.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                        <button onClick={() => toggleConfigLevel(key)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${cfg.enabled ? `bg-${l.color}-500` : 'bg-gray-700'}`}>
                          <motion.div animate={{ x: cfg.enabled ? 20 : 2 }}
                            className={`absolute top-0.5 w-4 h-4 rounded-full ${cfg.enabled ? 'bg-white' : 'bg-gray-400'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreate(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-4">Crear recordatorio</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Seleccionar tarea</label>
                    <select value={selectedTaskId || ''} onChange={e => setSelectedTaskId(parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500">
                      <option value="">Selecciona una tarea</option>
                      {tasks.filter(t => !t.completed).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Fecha y hora</label>
                    <input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowCreate(false)}
                      className="flex-1 px-4 py-2 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleCreateReminder}
                      disabled={!selectedTaskId || !reminderDate}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                      Crear
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}