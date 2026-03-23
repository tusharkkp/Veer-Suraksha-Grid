import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { ShieldCheck, Bot, CheckCircle, XCircle, PauseCircle } from 'lucide-react';

const VeerPassPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets, machines, workers, approveTask, rejectTask, holdTask } = useSystem();

  const pendingAssets = assets.filter(a => a.approvalStatus === 'pending' || a.approvalStatus === 'hold');

  const getAIRecommendation = (asset: typeof assets[0]) => {
    if (asset.zone === 'red') {
      return {
        en: 'BLOCK manual entry. Machine-only zone. Deploy jetting/crawler machine.',
        mr: 'मॅन्युअल प्रवेश अवरोधित करा. फक्त यंत्र क्षेत्र. जेटिंग/क्रॉलर यंत्र तैनात करा.',
        confidence: 92,
        action: 'reject' as const,
      };
    }
    if (asset.zone === 'yellow') {
      const machineAvail = machines.some(m => m.status === 'available');
      if (machineAvail) {
        return {
          en: 'Machine available. Recommend machine-first approach. Manual entry conditional.',
          mr: 'यंत्र उपलब्ध. यंत्र-प्रथम शिफारस. सशर्त मॅन्युअल प्रवेश.',
          confidence: 78,
          action: 'hold' as const,
        };
      }
      return {
        en: 'No machine available. Manual entry may be approved with full PPE and monitoring.',
        mr: 'यंत्र अनुपलब्ध. पूर्ण PPE आणि निगराणीसह मॅन्युअल प्रवेशास मंजुरी देता येते.',
        confidence: 65,
        action: 'approve' as const,
      };
    }
    return {
      en: 'Low-risk zone. Safe for controlled manual entry with standard PPE.',
      mr: 'कमी-जोखीम क्षेत्र. मानक PPE सह नियंत्रित मॅन्युअल प्रवेश सुरक्षित.',
      confidence: 88,
      action: 'approve' as const,
    };
  };

  return (
    <div className="gov-card p-4">
      <h3 className="panel-header flex items-center gap-2">
        <ShieldCheck className="h-4 w-4"/>{t('veerpass.title')}
      </h3>

      {pendingAssets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{lang === 'mr' ? 'सर्व कार्ये मंजूर/नाकारली' : 'All tasks approved/rejected'}</p>
      ) : (
        <div className="space-y-4">
          {pendingAssets.map(asset => {
            const ai = getAIRecommendation(asset);
            const worker = workers.find(w => w.id === asset.assignedWorker);
            return (
              <div key={asset.id} className="border rounded-md p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold">{asset.id}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{lang === 'mr' ? asset.locationMr : asset.location}</span>
                  </div>
                  <span className={asset.zone === 'red' ? 'risk-badge-red' : asset.zone === 'yellow' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                    {t(`zone.${asset.zone}`)}
                  </span>
                </div>

                {/* Task details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground">{t('risk.level')}</span><p className="font-semibold">{t(`risk.${asset.riskLevel}`)}</p></div>
                  <div><span className="text-muted-foreground">H₂S</span><p className="font-mono font-bold">{asset.sensors.h2s} ppm</p></div>
                  <div><span className="text-muted-foreground">CH₄</span><p className="font-mono font-bold">{asset.sensors.ch4}%</p></div>
                  <div><span className="text-muted-foreground">O₂</span><p className="font-mono font-bold">{asset.sensors.o2}%</p></div>
                  <div><span className="text-muted-foreground">{t('asset.assigned')}</span><p className="font-medium">{worker ? (lang === 'mr' ? worker.nameMr : worker.name) : '—'}</p></div>
                  <div><span className="text-muted-foreground">{t('worker.ppe')}</span><p className={worker?.ppeComplete ? 'text-[hsl(var(--risk-green))] font-semibold' : 'text-[hsl(var(--risk-red))] font-semibold'}>{worker?.ppeComplete ? '✓ Complete' : '✗ Incomplete'}</p></div>
                  <div><span className="text-muted-foreground">{t('asset.machine')}</span><p className="font-medium">{asset.machineRequired ? (lang === 'mr' ? 'आवश्यक' : 'Required') : (lang === 'mr' ? 'पर्यायी' : 'Optional')}</p></div>
                  <div><span className="text-muted-foreground">{lang === 'mr' ? 'मार्ग' : 'Route'}</span><p className="font-medium capitalize">{t(`veerpass.${asset.taskRoute === 'machine' ? 'machine' : 'manual'}`)}</p></div>
                </div>

                {/* AI Recommendation */}
                <div className="bg-[hsl(var(--gov-blue-light))] border border-[hsl(var(--gov-blue)/0.15)] rounded p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--gov-blue))] mb-1">
                    <Bot className="h-3.5 w-3.5"/>
                    {t('veerpass.ai')} — VeerRisk Engine
                    <span className="ml-auto bg-[hsl(var(--gov-blue)/0.1)] px-2 py-0.5 rounded">{ai.confidence}% {lang === 'mr' ? 'विश्वास' : 'confidence'}</span>
                  </div>
                  <p className="text-xs">{lang === 'mr' ? ai.mr : ai.en}</p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={() => approveTask(asset.id)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--risk-green))] text-white rounded text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
                    <CheckCircle className="h-4 w-4"/>{t('action.approve')}
                  </button>
                  <button onClick={() => rejectTask(asset.id)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--risk-red))] text-white rounded text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
                    <XCircle className="h-4 w-4"/>{t('action.reject')}
                  </button>
                  <button onClick={() => holdTask(asset.id)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--risk-yellow))] text-white rounded text-sm font-semibold hover:opacity-90 active:scale-95 transition-all">
                    <PauseCircle className="h-4 w-4"/>{t('action.hold')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VeerPassPanel;
