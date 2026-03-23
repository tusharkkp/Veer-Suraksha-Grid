import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { Activity } from 'lucide-react';

const TelemetryPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets } = useSystem();

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Activity className="h-4 w-4"/>{t('nav.telemetry')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full gov-table">
          <thead>
            <tr>
              <th>{t('asset.id')}</th>
              <th>{t('zone.type')}</th>
              <th>H₂S (ppm)</th>
              <th>CH₄ (%)</th>
              <th>CO (ppm)</th>
              <th>O₂ (%)</th>
              <th>{lang === 'mr' ? 'तापमान' : 'Temp'} (°C)</th>
              <th>{lang === 'mr' ? 'बॅटरी' : 'Battery'} (%)</th>
              <th>{t('sensor.source')}</th>
              <th>{t('risk.level')}</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} className="hover:bg-muted/50 transition-colors">
                <td className="font-mono font-medium text-xs">{a.id}</td>
                <td>
                  <span className={a.zone === 'red' ? 'risk-badge-red' : a.zone === 'yellow' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                    {lang === 'mr' ? a.zoneTypeMr : a.zoneType}
                  </span>
                </td>
                <td className={`sensor-value text-sm ${a.sensors.h2s > 15 ? 'text-[hsl(var(--risk-red))]' : a.sensors.h2s > 5 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>{a.sensors.h2s}</td>
                <td className={`sensor-value text-sm ${a.sensors.ch4 > 3 ? 'text-[hsl(var(--risk-red))]' : a.sensors.ch4 > 1 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>{a.sensors.ch4}</td>
                <td className={`sensor-value text-sm ${a.sensors.co > 25 ? 'text-[hsl(var(--risk-red))]' : a.sensors.co > 10 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>{a.sensors.co}</td>
                <td className={`sensor-value text-sm ${a.sensors.o2 < 18 ? 'text-[hsl(var(--risk-red))]' : a.sensors.o2 < 19.5 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>{a.sensors.o2}</td>
                <td className="sensor-value text-sm">{a.sensors.temp}</td>
                <td className={`sensor-value text-sm ${a.sensors.battery < 30 ? 'text-[hsl(var(--risk-red))]' : ''}`}>{a.sensors.battery}</td>
                <td className="text-xs text-muted-foreground">VeerGuard / VeerProbe</td>
                <td>
                  <span className={a.riskLevel === 'high' ? 'risk-badge-red' : a.riskLevel === 'medium' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                    {t(`risk.${a.riskLevel}`)}
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

export default TelemetryPanel;
