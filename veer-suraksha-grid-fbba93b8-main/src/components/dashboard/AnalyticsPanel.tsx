import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartBar, Users, Truck, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

const AnalyticsPanel: React.FC = () => {
  const { t } = useLanguage();
  const { assets, workers, machines } = useSystem();

  const totalAssets = assets.length;
  const activeWorkers = workers.filter(w => w.status === 'active').length;
  const machinesInUse = machines.filter(m => m.status === 'inuse').length;
  const tasksCompleted = assets.filter(a => a.approvalStatus === 'approved').length;
  const pendingTasks = assets.filter(a => a.approvalStatus === 'pending').length;
  const avgRisk = Math.round((assets.reduce((sum, a) => {
    const riskVal = a.riskLevel === 'high' ? 80 : a.riskLevel === 'medium' ? 50 : 20;
    return sum + riskVal;
  }, 0) / totalAssets) || 0);

  // Weekly tasks & alerts data
  const weeklyData = [
    { day: 'Mon', tasks: 11, alerts: 6 },
    { day: 'Tue', tasks: 14, alerts: 4 },
    { day: 'Wed', tasks: 9, alerts: 5 },
    { day: 'Thu', tasks: 12, alerts: 3 },
    { day: 'Fri', tasks: 19, alerts: 7 },
    { day: 'Sat', tasks: 16, alerts: 5 },
    { day: 'Sun', tasks: 8, alerts: 2 },
  ];

  // Risk & H2S trend
  const riskTrendData = [
    { day: 'Mon', risk: 42, h2s: 8 },
    { day: 'Tue', risk: 38, h2s: 12 },
    { day: 'Wed', risk: 55, h2s: 15 },
    { day: 'Thu', risk: 48, h2s: 10 },
    { day: 'Fri', risk: 60, h2s: 18 },
    { day: 'Sat', risk: 45, h2s: 9 },
    { day: 'Sun', risk: 52, h2s: 14 },
  ];

  // Zone distribution
  const highRisk = assets.filter(a => a.riskLevel === 'high').length;
  const medRisk = assets.filter(a => a.riskLevel === 'medium').length;
  const lowRisk = assets.filter(a => a.riskLevel === 'low').length;
  const zoneData = [
    { name: t('risk.high'), value: highRisk, color: 'hsl(var(--risk-red))' },
    { name: t('risk.medium'), value: medRisk, color: 'hsl(var(--risk-yellow))' },
    { name: t('risk.low'), value: lowRisk, color: 'hsl(var(--risk-green))' },
  ];

  // Task status distribution
  const approved = assets.filter(a => a.approvalStatus === 'approved').length;
  const pending = assets.filter(a => a.approvalStatus === 'pending').length;
  const active = workers.filter(w => w.status === 'active').length;
  const completed = Math.max(1, totalAssets - approved - pending);
  const taskStatusData = [
    { name: t('status.pending'), value: pending, color: 'hsl(var(--risk-yellow))' },
    { name: t('status.approved'), value: approved, color: 'hsl(210 60% 45%)' },
    { name: t('status.active'), value: Math.min(active, 3), color: 'hsl(var(--risk-green))' },
    { name: t('analytics.completed'), value: completed, color: 'hsl(160 50% 40%)' },
  ];

  // Weekly workers & machine usage
  const usageData = [
    { day: 'Mon', workers: 8, machines: 4 },
    { day: 'Tue', workers: 10, machines: 6 },
    { day: 'Wed', workers: 7, machines: 5 },
    { day: 'Thu', workers: 9, machines: 4 },
    { day: 'Fri', workers: 12, machines: 7 },
    { day: 'Sat', workers: 8, machines: 5 },
    { day: 'Sun', workers: 6, machines: 3 },
  ];

  const statCards = [
    { icon: <ChartBar className="h-4 w-4 text-primary" />, value: totalAssets, label: t('analytics.total_assets') },
    { icon: <Users className="h-4 w-4 text-primary" />, value: activeWorkers, label: t('analytics.active_workers') },
    { icon: <Truck className="h-4 w-4 text-primary" />, value: machinesInUse, label: t('analytics.machines_in_use') },
    { icon: <CheckCircle className="h-4 w-4 text-[hsl(var(--risk-green))]" />, value: tasksCompleted, label: t('analytics.tasks_zone') },
    { icon: <AlertTriangle className="h-4 w-4 text-[hsl(var(--risk-yellow))]" />, value: pendingTasks, label: t('analytics.pending_alerts') },
    { icon: <TrendingUp className="h-4 w-4 text-[hsl(var(--risk-red))]" />, value: `${avgRisk}%`, label: t('analytics.avg_risk') },
  ];

  return (
    <div className="p-3 space-y-4">
      {/* Title */}
      <h2 className="text-sm font-bold flex items-center gap-2">
        <ChartBar className="h-4 w-4" />
        {t('analytics.title')}
      </h2>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-6 gap-2">
        {statCards.map((card, i) => (
          <div key={i} className="gov-card p-3 flex items-center gap-2">
            {card.icon}
            <div>
              <p className="text-lg font-bold tabular-nums leading-tight">{card.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weekly Tasks & Alerts */}
        <div className="gov-card p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {t('analytics.weekly_tasks')}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="tasks" name={t('analytics.tasks_done')} fill="hsl(168 60% 32%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="alerts" name={t('analytics.alerts_label')} fill="hsl(var(--risk-red))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Risk & H2S Trend */}
        <div className="gov-card p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {t('analytics.risk_trend')}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={riskTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="risk" name={t('analytics.avg_risk')} stroke="hsl(var(--risk-yellow))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="h2s" name="H₂S" stroke="hsl(var(--risk-red))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Zone Distribution */}
        <div className="gov-card p-3">
          <p className="text-xs font-semibold mb-2">{t('analytics.zone_dist')}</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={zoneData}
                cx="50%"
                cy="50%"
                outerRadius={65}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ strokeWidth: 1 }}
                style={{ fontSize: 10 }}
              >
                {zoneData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Task Status Distribution */}
        <div className="gov-card p-3">
          <p className="text-xs font-semibold mb-2">{t('analytics.task_status')}</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                outerRadius={65}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ strokeWidth: 1 }}
                style={{ fontSize: 10 }}
              >
                {taskStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="gov-card p-3">
        <p className="text-xs font-semibold mb-2 flex items-center gap-1">
          <Users className="h-3 w-3" /> {t('analytics.weekly_usage')}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="workers" name={t('nav.workers')} fill="hsl(168 60% 32%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="machines" name={t('nav.fleet')} fill="hsl(210 60% 50%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
