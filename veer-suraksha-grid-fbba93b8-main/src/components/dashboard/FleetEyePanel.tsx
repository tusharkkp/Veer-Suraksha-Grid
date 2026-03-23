import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem, type MachineStatus } from '@/contexts/SystemContext';
import { Truck } from 'lucide-react';

const FleetEyePanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { machines } = useSystem();

  const types = ['jetting', 'rodding', 'sludge', 'crawler'] as const;

  const statusBadge = (s: MachineStatus) => {
    const cls = s === 'available' ? 'risk-badge-green' : s === 'inuse' ? 'risk-badge-yellow' : 'risk-badge-red';
    return <span className={cls}>{t(`status.${s === 'inuse' ? 'inuse' : s}`)}</span>;
  };

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Truck className="h-4 w-4"/>{t('fleet.title')}
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {types.map(type => {
          const group = machines.filter(m => m.type === type);
          const avail = group.filter(m => m.status === 'available').length;
          const sample = group[0];
          return (
            <div key={type} className="bg-muted/40 rounded-md p-3 text-center border">
              <p className="text-xs text-muted-foreground">{lang === 'mr' ? sample?.typeNameMr : sample?.typeName}</p>
              <p className="text-2xl font-bold tabular-nums">{avail}<span className="text-sm text-muted-foreground font-normal">/{group.length}</span></p>
              <p className="text-xs text-muted-foreground">{t('status.available')}</p>
            </div>
          );
        })}
      </div>

      {/* Machine table */}
      <table className="w-full gov-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>{t('asset.type')}</th>
            <th>{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
            <th>{lang === 'mr' ? 'नियुक्त' : 'Assigned'}</th>
            <th>{t('asset.location')}</th>
          </tr>
        </thead>
        <tbody>
          {machines.map(m => (
            <tr key={m.id} className="hover:bg-muted/50 transition-colors">
              <td className="font-mono text-xs">{m.id}</td>
              <td className="text-sm">{lang === 'mr' ? m.typeNameMr : m.typeName}</td>
              <td>{statusBadge(m.status)}</td>
              <td className="text-xs font-mono">{m.assignedAsset || '—'}</td>
              <td className="text-xs">{m.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FleetEyePanel;
