import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem, WORKER_FIREBASE_MAP } from '@/contexts/SystemContext';
import { Activity, Shield, Radio, Wifi, WifiOff } from 'lucide-react';

const TelemetryPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets, telemetryMap, workers } = useSystem();

  // Helper: check if an asset has live Firebase data
  const isLive = (asset: typeof assets[0]): boolean => {
    if (!asset.assignedWorker) return false;
    const fbKey = WORKER_FIREBASE_MAP[asset.assignedWorker];
    return fbKey ? !!telemetryMap[fbKey]?.isLive : false;
  };

  // Helper: get the worker name for an asset
  const getWorkerName = (asset: typeof assets[0]): string | null => {
    if (!asset.assignedWorker) return null;
    const w = workers.find(w => w.id === asset.assignedWorker);
    if (!w) return null;
    return lang === 'mr' ? w.nameMr : w.name;
  };

  // Helper: get last updated time for a live asset
  const getLastUpdated = (asset: typeof assets[0]): string => {
    if (!asset.assignedWorker) return '';
    const fbKey = WORKER_FIREBASE_MAP[asset.assignedWorker];
    if (!fbKey || !telemetryMap[fbKey]) return '';
    const ts = telemetryMap[fbKey].lastUpdated;
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Activity className="h-4 w-4" />{t('nav.telemetry')} — {lang === 'mr' ? 'रिअल-टाइम सेन्सर डेटा' : 'Real-Time Sensor Data'}
      </h3>

      {/* Firebase Connection Status */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--risk-green))] animate-pulse" />
          {lang === 'mr' ? 'Firebase कनेक्टेड' : 'Firebase Connected'}
        </div>
        <span className="text-muted-foreground">
          {lang === 'mr'
            ? `${Object.values(telemetryMap).filter(t => t.isLive).length} डिव्हाइस लाइव्ह`
            : `${Object.values(telemetryMap).filter(t => t.isLive).length} device(s) live`
          }
        </span>
      </div>

      {/* VeerProbe Panel — Pre-Entry Sensor Data */}
      <div className="gov-card p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold mb-3">
          <Radio className="h-4 w-4 text-primary" />
          <span>{lang === 'mr' ? 'वीरप्रोब — प्री-एंट्री सेन्सर' : 'VeerProbe — Pre-Entry Sensor'}</span>
          <span className="text-[10px] font-normal text-muted-foreground ml-auto">{lang === 'mr' ? 'स्रोत: ESP32 → Firebase' : 'Source: ESP32 → Firebase'}</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full gov-table">
            <thead>
              <tr>
                <th>{t('asset.id')}</th>
                <th>{lang === 'mr' ? 'कर्मचारी' : 'Worker'}</th>
                <th>{t('zone.type')}</th>
                <th>H₂S (ADC)</th>
                <th>CH₄ (ADC)</th>
                <th>CO (ADC)</th>
                <th>{lang === 'mr' ? 'तापमान' : 'Temp'} (°C)</th>
                <th>{lang === 'mr' ? 'आर्द्रता' : 'Humidity'} (%)</th>
                <th>{lang === 'mr' ? 'पाणी खोली' : 'Water'} (cm)</th>
                <th>{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
                <th>{lang === 'mr' ? 'स्रोत' : 'Source'}</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => {
                const live = isLive(a);
                const workerName = getWorkerName(a);
                const fbKey = a.assignedWorker ? WORKER_FIREBASE_MAP[a.assignedWorker] : null;
                const probeData = fbKey ? telemetryMap[fbKey]?.probe : null;

                return (
                  <tr key={a.id} className={`hover:bg-muted/50 transition-colors ${live ? 'bg-[hsl(var(--risk-green-bg))]/30' : ''}`}>
                    <td className="font-mono font-medium text-xs">{a.id}</td>
                    <td className="text-xs">{workerName || '—'}</td>
                    <td>
                      <span className={a.zone === 'red' ? 'risk-badge-red' : a.zone === 'yellow' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                        {lang === 'mr' ? a.zoneTypeMr : a.zoneType}
                      </span>
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.h2s >= 2500 ? 'text-[hsl(var(--risk-red))]' : a.sensors.h2s >= 1500 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && probeData ? probeData.H2S : a.sensors.h2s}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.ch4 >= 2200 ? 'text-[hsl(var(--risk-red))]' : a.sensors.ch4 >= 1200 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && probeData ? probeData.CH4 : a.sensors.ch4}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.co >= 2000 ? 'text-[hsl(var(--risk-red))]' : a.sensors.co >= 1000 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && probeData ? probeData.CO : a.sensors.co}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.temp >= 45 ? 'text-[hsl(var(--risk-red))]' : a.sensors.temp >= 38 ? 'text-[hsl(var(--risk-yellow))]' : ''}`}>
                      {live && probeData ? probeData.temperature : a.sensors.temp}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.humidity >= 95 ? 'text-[hsl(var(--risk-red))]' : a.sensors.humidity >= 85 ? 'text-[hsl(var(--risk-yellow))]' : ''}`}>
                      {live && probeData ? probeData.humidity : a.sensors.humidity}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.waterDepth <= 30 ? 'text-[hsl(var(--risk-red))]' : a.sensors.waterDepth <= 60 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && probeData ? probeData.water_depth : a.sensors.waterDepth}
                    </td>
                    <td>
                      {live && probeData ? (
                        <span className={probeData.status === 'DANGER' ? 'risk-badge-red' : probeData.status === 'WARNING' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                          {probeData.status}
                        </span>
                      ) : (
                        <span className={a.riskLevel === 'high' ? 'risk-badge-red' : a.riskLevel === 'medium' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                          {t(`risk.${a.riskLevel}`)}
                        </span>
                      )}
                    </td>
                    <td>
                      {live ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--risk-green))]">
                          <Wifi className="h-3 w-3" /> ESP32
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <WifiOff className="h-3 w-3" /> {lang === 'mr' ? 'सिम्युलेटेड' : 'Simulated'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VeerGuard Panel — Wearable Sensor Data */}
      <div className="gov-card p-4">
        <h4 className="flex items-center gap-2 text-sm font-bold mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <span>{lang === 'mr' ? 'वीरगार्ड — वेअरेबल सेन्सर' : 'VeerGuard — Wearable Sensor'}</span>
          <span className="text-[10px] font-normal text-muted-foreground ml-auto">{lang === 'mr' ? 'स्रोत: ESP32 → Firebase' : 'Source: ESP32 → Firebase'}</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full gov-table">
            <thead>
              <tr>
                <th>{t('asset.id')}</th>
                <th>{lang === 'mr' ? 'कर्मचारी' : 'Worker'}</th>
                <th>{t('zone.type')}</th>
                <th>H₂S (ADC)</th>
                <th>CH₄ (ADC)</th>
                <th>CO (ADC)</th>
                <th>O₂ (%)</th>
                <th>{lang === 'mr' ? 'तापमान' : 'Temp'} (°C)</th>
                <th>{lang === 'mr' ? 'आर्द्रता' : 'Humidity'} (%)</th>
                <th>MPU6050</th>
                <th>{lang === 'mr' ? 'स्थिती' : 'Status'}</th>
                <th>{lang === 'mr' ? 'स्रोत' : 'Source'}</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => {
                const live = isLive(a);
                const workerName = getWorkerName(a);
                const fbKey = a.assignedWorker ? WORKER_FIREBASE_MAP[a.assignedWorker] : null;
                const guardData = fbKey ? telemetryMap[fbKey]?.guard : null;

                return (
                  <tr key={a.id} className={`hover:bg-muted/50 transition-colors ${live ? 'bg-[hsl(var(--risk-green-bg))]/30' : ''}`}>
                    <td className="font-mono font-medium text-xs">{a.id}</td>
                    <td className="text-xs">{workerName || '—'}</td>
                    <td>
                      <span className={a.zone === 'red' ? 'risk-badge-red' : a.zone === 'yellow' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                        {lang === 'mr' ? a.zoneTypeMr : a.zoneType}
                      </span>
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.h2s >= 2500 ? 'text-[hsl(var(--risk-red))]' : a.sensors.h2s >= 1500 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && guardData ? guardData.H2S : a.sensors.h2s}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.ch4 >= 2200 ? 'text-[hsl(var(--risk-red))]' : a.sensors.ch4 >= 1200 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && guardData ? guardData.CH4 : a.sensors.ch4}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.co >= 2000 ? 'text-[hsl(var(--risk-red))]' : a.sensors.co >= 1000 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && guardData ? guardData.CO : a.sensors.co}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.o2 < 90 ? 'text-[hsl(var(--risk-red))]' : a.sensors.o2 < 95 ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                      {live && guardData ? guardData.oxygen : a.sensors.o2}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.temp >= 45 ? 'text-[hsl(var(--risk-red))]' : a.sensors.temp >= 38 ? 'text-[hsl(var(--risk-yellow))]' : ''}`}>
                      {live && guardData ? guardData.temperature : a.sensors.temp}
                    </td>
                    <td className={`sensor-value text-sm ${a.sensors.humidity >= 95 ? 'text-[hsl(var(--risk-red))]' : a.sensors.humidity >= 85 ? 'text-[hsl(var(--risk-yellow))]' : ''}`}>
                      {live && guardData ? guardData.humidity : a.sensors.humidity}
                    </td>
                    <td>
                      {live && guardData ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${guardData.fall_detected || guardData.no_movement ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' : 'bg-muted text-muted-foreground'}`}>
                          {guardData.fall_detected
                            ? (lang === 'mr' ? 'पडले!' : 'FALL!')
                            : guardData.no_movement
                            ? (lang === 'mr' ? 'हालचाल नाही!' : 'NO MOTION!')
                            : (lang === 'mr' ? 'सामान्य' : 'Normal')}
                        </span>
                      ) : (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${a.sensors.mpu6050Fallback ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' : 'bg-muted text-muted-foreground'}`}>
                          {a.sensors.mpu6050Fallback ? (lang === 'mr' ? 'फॉलबॅक!' : 'FALLBACK!') : (lang === 'mr' ? 'सामान्य' : 'Normal')}
                        </span>
                      )}
                    </td>
                    <td>
                      {live && guardData ? (
                        <span className={guardData.status === 'DANGER' ? 'risk-badge-red' : guardData.status === 'WARNING' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                          {guardData.status}
                        </span>
                      ) : (
                        <span className={a.riskLevel === 'high' ? 'risk-badge-red' : a.riskLevel === 'medium' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                          {t(`risk.${a.riskLevel}`)}
                        </span>
                      )}
                    </td>
                    <td>
                      {live ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(var(--risk-green))]">
                          <Wifi className="h-3 w-3" /> ESP32
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <WifiOff className="h-3 w-3" /> {lang === 'mr' ? 'सिम्युलेटेड' : 'Simulated'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-right">
        {lang === 'mr' ? 'ESP32 डेटा प्रत्येक 5 सेकंदाला अपडेट होतो' : 'ESP32 data updates every 5 seconds'} • Firebase Realtime DB
      </div>
    </div>
  );
};

export default TelemetryPanel;
