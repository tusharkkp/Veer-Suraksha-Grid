import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { MapPin, Activity, Users, Truck, ShieldCheck, MessageSquare, Siren, Archive, Calendar, ChartBar } from 'lucide-react';
import MapView from './dashboard/MapView';
import TelemetryPanel from './dashboard/TelemetryPanel';
import AnalyticsPanel from './dashboard/AnalyticsPanel';
import WorkerPanel from './dashboard/WorkerPanel';
import FleetEyePanel from './dashboard/FleetEyePanel';
import VeerPassPanel from './dashboard/VeerPassPanel';
import CommPanel from './dashboard/CommPanel';
import SOSPanel from './dashboard/SOSPanel';
import BlackBoxPanel from './dashboard/BlackBoxPanel';
import VeerPlanPanel from './dashboard/VeerPlanPanel';

type Tab = 'map' | 'analytics' | 'telemetry' | 'workers' | 'fleet' | 'veerpass' | 'comms' | 'sos' | 'blackbox' | 'veerplan';

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { activeEmergency, assets, workers, machines } = useSystem();
  const [activeTab, setActiveTab] = useState<Tab>('map');

  const tabs: { id: Tab; icon: React.ReactNode; label: string; alert?: boolean }[] = [
    { id: 'map', icon: <MapPin className="h-4 w-4"/>, label: t('nav.map') },
    { id: 'analytics', icon: <ChartBar className="h-4 w-4"/>, label: t('nav.analytics') },
    { id: 'telemetry', icon: <Activity className="h-4 w-4"/>, label: t('nav.telemetry') },
    { id: 'workers', icon: <Users className="h-4 w-4"/>, label: t('nav.workers') },
    { id: 'fleet', icon: <Truck className="h-4 w-4"/>, label: t('nav.fleet') },
    { id: 'veerpass', icon: <ShieldCheck className="h-4 w-4"/>, label: t('nav.veerpass'), alert: assets.some(a => a.approvalStatus === 'pending') },
    { id: 'comms', icon: <MessageSquare className="h-4 w-4"/>, label: t('nav.comms') },
    { id: 'sos', icon: <Siren className="h-4 w-4"/>, label: t('nav.sos'), alert: !!activeEmergency },
    { id: 'blackbox', icon: <Archive className="h-4 w-4"/>, label: t('nav.blackbox') },
    { id: 'veerplan', icon: <Calendar className="h-4 w-4"/>, label: t('nav.veerplan') },
  ];

  // Quick stats
  const activeWorkers = workers.filter(w => w.status === 'active').length;
  const availMachines = machines.filter(m => m.status === 'available').length;
  const highRisk = assets.filter(a => a.riskLevel === 'high').length;
  const pendingApprovals = assets.filter(a => a.approvalStatus === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 p-4 pb-0">
        {[
          { label: t('nav.workers'), value: `${activeWorkers}/10`, sub: t('status.active'), color: 'text-[hsl(var(--risk-green))]' },
          { label: t('nav.fleet'), value: `${availMachines}/${machines.length}`, sub: t('status.available'), color: 'text-primary' },
          { label: t('risk.high'), value: highRisk.toString(), sub: t('risk.level'), color: 'text-[hsl(var(--risk-red))]' },
          { label: t('nav.veerpass'), value: pendingApprovals.toString(), sub: t('status.pending'), color: 'text-[hsl(var(--risk-yellow))]' },
        ].map((s, i) => (
          <div key={i} className="gov-card p-3 text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t whitespace-nowrap transition-colors relative ${
              activeTab === tab.id ? 'bg-card border border-b-0 text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}{tab.label}
            {tab.alert && <span className="w-2 h-2 rounded-full bg-[hsl(var(--sos-red))] animate-blink"/>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pt-0 min-h-0">
        <div className="border rounded-b-md rounded-tr-md bg-card p-0 h-full overflow-y-auto">
          <div className="p-1">
            {activeTab === 'map' && <MapView />}
            {activeTab === 'analytics' && <AnalyticsPanel />}
            {activeTab === 'telemetry' && <TelemetryPanel />}
            {activeTab === 'workers' && <WorkerPanel />}
            {activeTab === 'fleet' && <FleetEyePanel />}
            {activeTab === 'veerpass' && <VeerPassPanel />}
            {activeTab === 'comms' && <CommPanel />}
            {activeTab === 'sos' && <SOSPanel />}
            {activeTab === 'blackbox' && <BlackBoxPanel />}
            {activeTab === 'veerplan' && <VeerPlanPanel />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
