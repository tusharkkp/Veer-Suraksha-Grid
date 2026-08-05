import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { Archive } from 'lucide-react';

const BlackBoxPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { eventLog } = useSystem();

  const typeIcon: Record<string, string> = {
    approval: '📋', alert: '⚠️', sos: '🚨', task: '📝', sensor: '📡', machine: '🚜', communication: '💬',
  };

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Archive className="h-4 w-4"/>{t('blackbox.title')}
      </h3>
      <div className="max-h-80 overflow-y-auto space-y-1">
        {eventLog.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{lang === 'mr' ? 'अद्याप कोणत्याही घटना नाहीत' : 'No events yet'}</p>
        ) : (
          eventLog.slice(0, 50).map(e => (
            <div key={e.id} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
              e.severity === 'critical' ? 'bg-[hsl(var(--risk-red-bg))]' : e.severity === 'warning' ? 'bg-[hsl(var(--risk-yellow-bg))]' : 'bg-muted/30'
            }`}>
              <span>{typeIcon[e.type] || '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{lang === 'mr' ? e.messageMr : e.message}</p>
                <p className="text-[10px] text-muted-foreground">{e.source} — {e.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BlackBoxPanel;
