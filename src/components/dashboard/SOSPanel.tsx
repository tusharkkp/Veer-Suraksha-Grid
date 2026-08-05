import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { Siren, Truck, UserX } from 'lucide-react';

const SOSPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { activeEmergency, workers, clearEmergency, eventLog } = useSystem();

  const emergencyWorker = workers.find(w => w.id === activeEmergency);
  const sosEvents = eventLog.filter(e => e.type === 'sos').slice(0, 10);

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Siren className="h-4 w-4"/>{t('sos.title')}
      </h3>

      {activeEmergency && emergencyWorker ? (
        <div className="border-2 border-[hsl(var(--sos-red))] rounded-lg p-4 bg-[hsl(var(--risk-red-bg))] animate-sos mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--sos-red))] flex items-center justify-center text-white">
              <UserX className="h-5 w-5"/>
            </div>
            <div>
              <p className="font-bold text-[hsl(var(--sos-red))]">{t('sos.active')}</p>
              <p className="text-sm font-semibold">{lang === 'mr' ? emergencyWorker.nameMr : emergencyWorker.name} ({emergencyWorker.id})</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[hsl(var(--sos-red))]"/>
              <span className="font-semibold">{t('sos.dispatch')}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'mr' ? 'स्थान:' : 'Location:'} {emergencyWorker.assignedAsset || (lang === 'mr' ? 'अज्ञात' : 'Unknown')}
            </p>
          </div>
          <button
            onClick={clearEmergency}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            {lang === 'mr' ? 'आपत्कालीन स्थिती समाप्त करा' : 'Clear Emergency'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">{t('sos.none')}</p>
      )}

      {sosEvents.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground">{lang === 'mr' ? 'अलीकडील SOS घटना' : 'Recent SOS Events'}</h4>
          {sosEvents.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
              <span className={`w-1.5 h-1.5 rounded-full ${e.severity === 'critical' ? 'bg-[hsl(var(--sos-red))]' : 'bg-[hsl(var(--risk-green))]'}`}/>
              <span className="flex-1">{lang === 'mr' ? e.messageMr : e.message}</span>
              <span className="text-muted-foreground">{e.timestamp.toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SOSPanel;
