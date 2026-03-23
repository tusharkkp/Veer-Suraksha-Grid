import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { Users, Wifi, WifiOff, BatteryLow } from 'lucide-react';

const WorkerPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { workers, activeEmergency } = useSystem();

  const deviceIcon = (status: string) => {
    if (status === 'online') return <Wifi className="h-3.5 w-3.5 text-[hsl(var(--risk-green))]"/>;
    if (status === 'low_battery') return <BatteryLow className="h-3.5 w-3.5 text-[hsl(var(--risk-yellow))]"/>;
    return <WifiOff className="h-3.5 w-3.5 text-muted-foreground"/>;
  };

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Users className="h-4 w-4"/>{t('nav.workers')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full gov-table">
          <thead>
            <tr>
              <th>{t('worker.id')}</th>
              <th>{t('worker.name')}</th>
              <th>{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
              <th>{t('worker.task')}</th>
              <th>{t('worker.device')}</th>
              <th>{t('worker.ppe')}</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.id} className={`hover:bg-muted/50 transition-colors ${w.id === activeEmergency ? 'bg-[hsl(var(--risk-red-bg))]' : ''}`}>
                <td className="font-mono text-xs">{w.id}</td>
                <td className="font-medium text-sm">{lang === 'mr' ? w.nameMr : w.name}</td>
                <td>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
                    w.status === 'active' ? 'bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))]' :
                    w.status === 'emergency' ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))] animate-blink' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {w.status === 'emergency' && '🚨 '}{t(`status.${w.status}`)}
                  </span>
                </td>
                <td className="text-xs">{lang === 'mr' ? (w.currentTaskMr || '—') : (w.currentTask || '—')}</td>
                <td>{deviceIcon(w.deviceStatus)}</td>
                <td>
                  <span className={`text-xs font-medium ${w.ppeComplete ? 'text-[hsl(var(--risk-green))]' : 'text-[hsl(var(--risk-red))]'}`}>
                    {w.ppeComplete ? '✓' : '✗'} {Object.values(w.ppeChecklist).filter(Boolean).length}/6
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkerPanel;
