import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Battery, BatteryCharging, BatteryLow, Moon, Sun, Sunset, Clock, Zap, AlertCircle } from 'lucide-react';

type EnergyLevel = 'alta' | 'media' | 'baja' | 'descanso';
type TimeBlock = 'manana' | 'tarde' | 'noche' | 'madrugada';
type WeekDay = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

interface EnergySchedule {
  [key: string]: EnergyLevel;
}

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  priority: string;
  status: string;
  category: string | null;
}

const DAYS: WeekDay[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const TIME_BLOCKS: TimeBlock[] = ['manana', 'tarde', 'noche', 'madrugada'];

const DAY_LABELS: Record<WeekDay, string> = {
  lun: 'Lunes', mar: 'Martes', mie: 'Miércoles',
  jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo'
};

const BLOCK_LABELS: Record<TimeBlock, string> = {
  manana: 'Mañana (6-12)', tarde: 'Tarde (12-18)',
  noche: 'Noche (18-24)', madrugada: 'Madrugada (0-6)'
};

const BLOCK_ICONS: Record<TimeBlock, React.ReactNode> = {
  manana: <Sun className="w-4 h-4" />,
  tarde: <Sunset className="w-4 h-4" />,
  noche: <Moon className="w-4 h-4" />,
  madrugada: <Clock className="w-4 h-4" />
};

const ENERGY_CONFIG: Record<EnergyLevel, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  alta: { label: 'Alta energía', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500', icon: <BatteryCharging className="w-4 h-4" /> },
  media: { label: 'Media energía', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500', icon: <Battery className="w-4 h-4" /> },
  baja: { label: 'Baja energía', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500', icon: <BatteryLow className="w-4 h-4" /> },
  descanso: { label: 'Descanso', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500', icon: <Moon className="w-4 h-4" /> }
};

const ENERGY_ORDER: EnergyLevel[] = ['alta', 'media', 'baja', 'descanso'];

const DEFAULT_SCHEDULE: EnergySchedule = (() => {
  const s: EnergySchedule = {};
  DAYS.forEach(d => {
    TIME_BLOCKS.forEach(t => {
      s[`${d}_${t}`] = t === 'manana' ? 'alta' : t === 'tarde' ? 'media' : t === 'noche' ? 'baja' : 'descanso';
    });
  });
  return s;
})();

function getCurrentTimeBlock(): TimeBlock {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'manana';
  if (h >= 12 && h < 18) return 'tarde';
  if (h >= 18 && h < 24) return 'noche';
  return 'madrugada';
}

function getCurrentDay(): WeekDay {
  const day = new Date().getDay();
  const map: WeekDay[] = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  return map[day];
}

function getPriorityColor(p: string): string {
  if (p === 'alta') return 'bg-red-500/20 text-red-400 border-red-500';
  if (p === 'media') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
  return 'bg-blue-500/20 text-blue-400 border-blue-500';
}

export default function EnergyPlanning() {
  const [schedule, setSchedule] = useState<EnergySchedule>(DEFAULT_SCHEDULE);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<Task[]>([]);

  const currentDay = getCurrentDay();
  const currentBlock = getCurrentTimeBlock();
  const currentEnergy = schedule[`${currentDay}_${currentBlock}`] || 'media';

  const loadTasks = useCallback(async () => {
    try {
      const data = await (window as any).electronAPI.tasks.list();
      if (data && Array.isArray(data)) setTasks(data);
    } catch { }
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const saved = await (window as any).electronAPI.settings.get('energy_schedule');
      if (saved) setSchedule(JSON.parse(saved));
    } catch { }
  }, []);

  useEffect(() => {
    loadSchedule();
    loadTasks();
  }, [loadSchedule, loadTasks]);

  useEffect(() => {
    const pending = tasks.filter(t => t.status !== 'completada');
    let filtered: Task[] = [];
    if (currentEnergy === 'alta') {
      filtered = pending.filter(t => t.priority === 'alta');
    } else if (currentEnergy === 'media') {
      filtered = pending.filter(t => t.priority === 'media' || t.priority === 'alta');
    } else if (currentEnergy === 'baja') {
      filtered = pending.filter(t => t.priority === 'baja' || t.priority === 'normal');
    } else {
      filtered = [];
    }
    filtered.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
    setCurrentSuggestion(filtered);
  }, [tasks, currentEnergy]);

  const cycleBlock = (key: string) => {
    setSchedule(prev => {
      const current = prev[key] || 'alta';
      const idx = ENERGY_ORDER.indexOf(current);
      const next = ENERGY_ORDER[(idx + 1) % ENERGY_ORDER.length];
      const updated = { ...prev, [key]: next };
      (window as any).electronAPI?.settings.set('energy_schedule', JSON.stringify(updated));
      return updated;
    });
  };

  const totalBlocks = DAYS.length * TIME_BLOCKS.length;
  const highCount = Object.values(schedule).filter(v => v === 'alta').length;
  const medCount = Object.values(schedule).filter(v => v === 'media').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl border border-green-500/30">
            <BatteryCharging className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Planificación Energética</h1>
            <p className="text-gray-400">Configura tu energía semanal para optimizar tu estudio</p>
          </div>
        </div>

        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`relative w-32 h-32 rounded-full border-4 ${ENERGY_CONFIG[currentEnergy].border} ${ENERGY_CONFIG[currentEnergy].bg} flex flex-col items-center justify-center`}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={ENERGY_CONFIG[currentEnergy].color}
            >
              {ENERGY_CONFIG[currentEnergy].icon}
            </motion.div>
            <span className={`text-sm font-bold mt-1 ${ENERGY_CONFIG[currentEnergy].color}`}>
              {ENERGY_CONFIG[currentEnergy].label}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {DAY_LABELS[currentDay]} - {BLOCK_ICONS[currentBlock]}
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Bloques totales', value: totalBlocks, color: 'text-white' },
            { label: 'Alta energía', value: highCount, color: 'text-green-400' },
            { label: 'Media energía', value: medCount, color: 'text-yellow-400' },
            { label: 'Baja/Descanso', value: totalBlocks - highCount - medCount, color: 'text-red-400' }
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Horario Semanal</h2>
          <p className="text-sm text-gray-500 mb-4">Haz clic en un bloque para cambiar el nivel de energía</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm text-gray-500 p-2">Horario</th>
                  {DAYS.map(d => (
                    <th key={d} className={`text-center text-sm p-2 ${d === currentDay ? 'text-green-400' : 'text-gray-500'}`}>
                      {DAY_LABELS[d].slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_BLOCKS.map(t => (
                  <tr key={t}>
                    <td className="text-sm text-gray-400 p-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {BLOCK_ICONS[t]}
                        <span className="hidden md:inline">{BLOCK_LABELS[t]}</span>
                        <span className="md:hidden">{t.slice(0, 4).toUpperCase()}</span>
                      </div>
                    </td>
                    {DAYS.map(d => {
                      const key = `${d}_${t}`;
                      const level = schedule[key] || 'descanso';
                      const isActive = d === currentDay && t === currentBlock;
                      return (
                        <td key={d} className="p-1">
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => cycleBlock(key)}
                            className={`w-full h-12 rounded-lg border ${ENERGY_CONFIG[level].bg} ${ENERGY_CONFIG[level].border} flex items-center justify-center gap-1 transition-all ${isActive ? 'ring-2 ring-white/50' : ''}`}>
                            {ENERGY_CONFIG[level].icon}
                            <span className={`text-xs font-medium ${ENERGY_CONFIG[level].color} hidden md:inline`}>
                              {ENERGY_CONFIG[level].label.split(' ')[0]}
                            </span>
                          </motion.button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(ENERGY_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs text-gray-400">
                <div className={`w-3 h-3 rounded ${v.bg} border ${v.border}`} />
                <span>{v.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">Sugerencias de estudio</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs border ${ENERGY_CONFIG[currentEnergy].bg} ${ENERGY_CONFIG[currentEnergy].border} ${ENERGY_CONFIG[currentEnergy].color}`}>
              {ENERGY_CONFIG[currentEnergy].label}
            </span>
          </div>
          {currentEnergy === 'descanso' ? (
            <div className="text-center py-8 text-gray-500">
              <Moon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="font-medium">Hora de descansar</p>
              <p className="text-sm">No se sugieren tareas durante tu tiempo de descanso</p>
            </div>
          ) : currentSuggestion.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="font-medium">No hay tareas sugeridas</p>
              <p className="text-sm">No hay tareas pendientes para este nivel de energía</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentSuggestion.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
                  <h3 className="text-white font-medium mb-2">{task.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-300">
                        {task.category}
                      </span>
                    )}
                  </div>
                  {task.due_date && (
                    <p className="text-xs text-gray-500">
                      Vence: {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}