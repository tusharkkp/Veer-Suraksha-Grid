import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { Calendar, AlertTriangle, Lightbulb } from 'lucide-react';

const VeerPlanPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets } = useSystem();

  const highRiskAssets = assets.filter(a => a.riskLevel === 'high');

  const maintenanceSchedule = [
    { asset: 'SMC-MH-001', date: '2026-03-25', taskMr: 'जेटिंग सफाई', task: 'Jetting Cleaning' },
    { asset: 'SMC-MH-002', date: '2026-03-26', taskMr: 'रोबोटिक तपासणी', task: 'Robotic Inspection' },
    { asset: 'SMC-MH-003', date: '2026-03-28', taskMr: 'नियमित सफाई', task: 'Routine Cleaning' },
    { asset: 'SMC-MH-004', date: '2026-04-01', taskMr: 'गॅस सेन्सर कॅलिब्रेशन', task: 'Gas Sensor Calibration' },
    { asset: 'SMC-MH-005', date: '2026-04-03', taskMr: 'तपासणी', task: 'Inspection' },
  ];

  const suggestions = lang === 'mr' ? [
    'औद्योगिक क्षेत्रातील मॅनहोल्सची साप्ताहिक रोबोटिक तपासणी सुरू करा',
    'सर्व लाल क्षेत्रांसाठी यंत्र-प्रथम धोरण कठोरपणे लागू करा',
    'कर्मचाऱ्यांसाठी मासिक PPE प्रशिक्षण कार्यक्रम आयोजित करा',
    'MIDC क्षेत्रात अतिरिक्त जेटिंग मशीन तैनात करा',
  ] : [
    'Start weekly robotic inspection for manholes in industrial zones',
    'Strictly enforce machine-first policy for all red zones',
    'Organize monthly PPE training program for workers',
    'Deploy additional jetting machine in MIDC area',
  ];

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <Calendar className="h-4 w-4"/>{t('veerplan.title')}
      </h3>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Upcoming maintenance */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3"/>{t('veerplan.upcoming')}
          </h4>
          <div className="space-y-1.5">
            {maintenanceSchedule.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/40 text-xs border">
                <span className="font-mono font-medium text-primary">{s.asset.replace('SMC-', '')}</span>
                <span className="flex-1">{lang === 'mr' ? s.taskMr : s.task}</span>
                <span className="text-muted-foreground">{s.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* High risk assets */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3"/>{t('veerplan.highrisk')}
          </h4>
          <div className="space-y-1.5">
            {highRiskAssets.map(a => (
              <div key={a.id} className="p-2 rounded bg-[hsl(var(--risk-red-bg))] border border-[hsl(var(--risk-red)/0.2)] text-xs">
                <p className="font-mono font-bold">{a.id}</p>
                <p className="text-muted-foreground">{lang === 'mr' ? a.locationMr : a.location}</p>
                <p className="mt-1">H₂S: <span className="font-mono font-bold">{a.sensors.h2s}ppm</span> | O₂: <span className="font-mono font-bold">{a.sensors.o2}%</span></p>
              </div>
            ))}
            {highRiskAssets.length === 0 && <p className="text-xs text-muted-foreground">{lang === 'mr' ? 'सध्या कोणतेही उच्च-जोखीम मालमत्ता नाहीत' : 'No high-risk assets currently'}</p>}
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Lightbulb className="h-3 w-3"/>{t('veerplan.suggestions')}
          </h4>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-[hsl(var(--gov-blue-light))] text-xs border border-[hsl(var(--gov-blue)/0.1)]">
                <span className="text-primary font-bold">{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeerPlanPanel;
