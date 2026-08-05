import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem, type Asset } from '@/contexts/SystemContext';
import { MapPin, X, Shield, Plus } from 'lucide-react';

const ASSET_POSITIONS: Record<string, { x: number; y: number }> = {
  'SMC-MH-001': { x: 65, y: 55 },
  'SMC-MH-002': { x: 78, y: 70 },
  'SMC-MH-003': { x: 42, y: 30 },
  'SMC-MH-004': { x: 72, y: 40 },
  'SMC-MH-005': { x: 30, y: 20 },
  'SMC-MH-006': { x: 25, y: 45 },
};

const zoneColors: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
};

const MapView: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets, selectedAsset, setSelectedAsset, workers, addTask } = useSystem();
  const selected = assets.find(a => a.id === selectedAsset);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskAsset, setNewTaskAsset] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskNameMr, setNewTaskNameMr] = useState('');

  const handleAddTask = () => {
    if (newTaskAsset && newTaskName) {
      addTask(newTaskAsset, newTaskName, newTaskNameMr || newTaskName);
      setShowAddTask(false);
      setNewTaskAsset('');
      setNewTaskName('');
      setNewTaskNameMr('');
    }
  };

  return (
    <div className="gov-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-header flex items-center gap-2 mb-0">
          <MapPin className="h-4 w-4" />{t('nav.map')} — {t('app.smc')}
        </h3>
        <button
          onClick={() => setShowAddTask(!showAddTask)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold active:scale-95 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          {lang === 'mr' ? 'कार्य जोडा' : 'Add Task'}
        </button>
      </div>

      {/* Add Task Dialog */}
      {showAddTask && (
        <div className="mb-3 p-3 bg-muted/40 border rounded-md space-y-2">
          <p className="text-xs font-semibold">{lang === 'mr' ? 'नवीन कार्य तयार करा' : 'Create New Task'}</p>
          <select value={newTaskAsset} onChange={e => setNewTaskAsset(e.target.value)} className="w-full p-2 text-xs border rounded bg-background">
            <option value="">{lang === 'mr' ? 'मालमत्ता निवडा...' : 'Select Asset...'}</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.id} — {lang === 'mr' ? a.locationMr : a.location}</option>)}
          </select>
          <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder={lang === 'mr' ? 'कार्य नाव (English)' : 'Task Name (English)'} className="w-full p-2 text-xs border rounded bg-background" />
          <input value={newTaskNameMr} onChange={e => setNewTaskNameMr(e.target.value)} placeholder={lang === 'mr' ? 'कार्य नाव (मराठी)' : 'Task Name (Marathi)'} className="w-full p-2 text-xs border rounded bg-background" />
          <div className="flex gap-2">
            <button onClick={handleAddTask} disabled={!newTaskAsset || !newTaskName} className="flex-1 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold disabled:opacity-50">
              {lang === 'mr' ? 'तयार करा' : 'Create'}
            </button>
            <button onClick={() => setShowAddTask(false)} className="flex-1 py-1.5 border rounded text-xs">{lang === 'mr' ? 'रद्द करा' : 'Cancel'}</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Map area */}
        <div className="flex-1 relative bg-[hsl(var(--gov-blue-light))] rounded-md border overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {[20,40,60,80].map(v => (
              <React.Fragment key={v}>
                <line x1={v} y1="0" x2={v} y2="100" stroke="hsl(215 70% 35% / 0.08)" strokeWidth="0.3"/>
                <line x1="0" y1={v} x2="100" y2={v} stroke="hsl(215 70% 35% / 0.08)" strokeWidth="0.3"/>
              </React.Fragment>
            ))}
            <line x1="10" y1="50" x2="90" y2="50" stroke="hsl(215 20% 70%)" strokeWidth="0.8" strokeDasharray="2,1"/>
            <line x1="50" y1="10" x2="50" y2="90" stroke="hsl(215 20% 70%)" strokeWidth="0.8" strokeDasharray="2,1"/>
            <line x1="20" y1="25" x2="80" y2="75" stroke="hsl(215 20% 75%)" strokeWidth="0.5" strokeDasharray="1.5,1"/>
            <text x="50" y="96" textAnchor="middle" fontSize="3" fill="hsl(215 30% 50%)" fontWeight="600">सोलापूर / Solapur</text>

            {assets.map(asset => {
              const pos = ASSET_POSITIONS[asset.id];
              if (!pos) return null;
              const isSelected = selectedAsset === asset.id;
              return (
                <g key={asset.id} onClick={() => setSelectedAsset(asset.id)} className="cursor-pointer">
                  {isSelected && <circle cx={pos.x} cy={pos.y} r="5" fill={zoneColors[asset.zone]} opacity="0.2">
                    <animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite"/>
                  </circle>}
                  <circle cx={pos.x} cy={pos.y} r="3" fill={zoneColors[asset.zone]} stroke="white" strokeWidth="0.8"/>
                  <text x={pos.x} y={pos.y - 5} textAnchor="middle" fontSize="2.2" fill="hsl(220 20% 20%)" fontWeight="600">
                    {asset.id.replace('SMC-', '')}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur rounded p-2 text-xs space-y-1">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"/>{t('zone.red')}</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"/>{t('zone.yellow')}</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"/>{t('zone.green')}</div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 bg-muted/30 border rounded-md p-3 overflow-y-auto text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base">{selected.id}</span>
              <button onClick={() => setSelectedAsset(null)} className="p-1 hover:bg-muted rounded">
                <X className="h-4 w-4"/>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{lang === 'mr' ? selected.nameMr : selected.name}</p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t('zone.type')}</span>
                <p className={`font-semibold ${selected.zone === 'red' ? 'text-[hsl(var(--risk-red))]' : selected.zone === 'yellow' ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                  {lang === 'mr' ? selected.zoneTypeMr : selected.zoneType}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('risk.level')}</span>
                <p><span className={selected.riskLevel === 'high' ? 'risk-badge-red' : selected.riskLevel === 'medium' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                  {t(`risk.${selected.riskLevel}`)}
                </span></p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('asset.location')}</span>
                <p className="font-medium">{lang === 'mr' ? selected.locationMr : selected.location}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('status.approved').split(' ')[0]}</span>
                <p className="font-medium capitalize">{t(`status.${selected.approvalStatus}`)}</p>
              </div>
            </div>

            <div className={`p-2 rounded text-xs font-medium ${
              selected.zone === 'red' ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' :
              selected.zone === 'yellow' ? 'bg-[hsl(var(--risk-yellow-bg))] text-[hsl(var(--risk-yellow))]' :
              'bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))]'
            }`}>
              <Shield className="h-3 w-3 inline mr-1"/>
              {selected.zone === 'red' ? t('general.machine_only') :
               selected.zone === 'yellow' ? t('general.machine_first') : t('general.controlled_manual')}
            </div>

            {/* VeerProbe Readings */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">{lang === 'mr' ? 'वीरप्रोब' : 'VeerProbe'}</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <SensorMini label="H₂S" value={selected.sensors.h2s} unit="ppm" max={25} source="VeerProbe"/>
                <SensorMini label="CH₄" value={selected.sensors.ch4} unit="%" max={5} source="VeerProbe"/>
                <SensorMini label="CO" value={selected.sensors.co} unit="ppm" max={35} source="VeerProbe"/>
                <SensorMini label={lang === 'mr' ? 'तापमान' : 'Temp'} value={selected.sensors.temp} unit="°C" max={40} source="VeerProbe"/>
                <SensorMini label={lang === 'mr' ? 'आर्द्रता' : 'Humidity'} value={selected.sensors.humidity} unit="%" max={99} source="VeerProbe"/>
                <SensorMini label={lang === 'mr' ? 'पाणी खोली' : 'Water Depth'} value={selected.sensors.waterDepth} unit="m" max={5} source="VeerProbe"/>
              </div>
            </div>

            {/* VeerGuard Readings */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase">{lang === 'mr' ? 'वीरगार्ड' : 'VeerGuard'}</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <SensorMini label="O₂" value={selected.sensors.o2} unit="%" max={21} invert source="VeerGuard"/>
                <SensorMini label={lang === 'mr' ? 'बॅटरी' : 'Battery'} value={selected.sensors.battery} unit="%" max={100} invert source="VeerGuard"/>
              </div>
              <div className={`mt-1.5 text-[10px] px-2 py-1 rounded ${selected.sensors.mpu6050Fallback ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' : 'bg-muted text-muted-foreground'}`}>
                MPU6050: {selected.sensors.mpu6050Fallback ? (lang === 'mr' ? 'फॉलबॅक सक्रिय!' : 'FALLBACK ACTIVE!') : (lang === 'mr' ? 'सामान्य' : 'Normal')}
              </div>
            </div>

            {selected.assignedWorker && (() => {
              const w = workers.find(w => w.id === selected.assignedWorker);
              return w ? (
                <div className="text-xs">
                  <span className="text-muted-foreground">{t('asset.assigned')}</span>
                  <p className="font-medium">{lang === 'mr' ? w.nameMr : w.name} ({w.id})</p>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

const SensorMini: React.FC<{ label: string; value: number; unit: string; max: number; invert?: boolean; source: string }> = ({ label, value, unit, max, invert, source }) => {
  const ratio = invert ? (1 - value / max) : (value / max);
  const danger = ratio > 0.7;
  const warn = ratio > 0.4;
  return (
    <div className={`p-1.5 rounded border text-xs ${danger ? 'bg-[hsl(var(--risk-red-bg))] border-[hsl(var(--risk-red)/0.3)]' : warn ? 'bg-[hsl(var(--risk-yellow-bg))] border-[hsl(var(--risk-yellow)/0.3)]' : 'bg-[hsl(var(--risk-green-bg))] border-[hsl(var(--risk-green)/0.3)]'}`}>
      <div className="flex justify-between items-baseline">
        <span className="font-medium">{label}</span>
        <span className={`font-mono font-bold ${danger ? 'text-[hsl(var(--risk-red))]' : warn ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
          {typeof value === 'number' ? Math.round(value * 10) / 10 : value}{unit}
        </span>
      </div>
      <div className="text-[9px] text-muted-foreground mt-0.5">{source}</div>
    </div>
  );
};

export default MapView;
