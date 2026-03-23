import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem, type Worker as WorkerType } from '@/contexts/SystemContext';
import { AlertTriangle, CheckCircle, Shield, Send, Phone } from 'lucide-react';

const WorkerApp: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets, workers, triggerSOS, activeEmergency, sendChat, chatMessages, toggleWorkerPPE } = useSystem();
  const [selectedWorker, setSelectedWorker] = useState('W-001');
  const [chatInput, setChatInput] = useState('');

  const worker = workers.find(w => w.id === selectedWorker)!;
  const asset = assets.find(a => a.id === worker?.assignedAsset);

  const handleSOS = () => {
    if (worker) triggerSOS(worker.id);
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    sendChat(chatInput, chatInput, false);
    setChatInput('');
    // Simulate admin reply
    setTimeout(() => {
      const replies = lang === 'mr'
        ? ['समजले, सूचना पाठवत आहोत', 'ठीक आहे, सावधगिरी बाळगा', 'यंत्र पाठवत आहोत']
        : ['Understood, sending instructions', 'Okay, be careful', 'Sending machine'];
      sendChat(replies[Math.floor(Math.random() * replies.length)], replies[Math.floor(Math.random() * replies.length)], true);
    }, 2000);
  };

  const ppeItems: { key: keyof WorkerType['ppeChecklist']; labelMr: string; label: string }[] = [
    { key: 'helmet', labelMr: 'हेल्मेट', label: 'Helmet' },
    { key: 'gloves', labelMr: 'हातमोजे', label: 'Gloves' },
    { key: 'mask', labelMr: 'मास्क', label: 'Gas Mask' },
    { key: 'suit', labelMr: 'सुरक्षा सूट', label: 'Safety Suit' },
    { key: 'boots', labelMr: 'बूट', label: 'Safety Boots' },
    { key: 'harness', labelMr: 'हार्नेस', label: 'Harness' },
  ];

  return (
    <div className="max-w-md mx-auto flex flex-col h-full bg-background">
      {/* Worker selector */}
      <div className="p-3 bg-muted/50 border-b">
        <select
          value={selectedWorker}
          onChange={e => setSelectedWorker(e.target.value)}
          className="w-full p-2 text-sm rounded border bg-background"
        >
          {workers.map(w => (
            <option key={w.id} value={w.id}>{w.id} — {lang === 'mr' ? w.nameMr : w.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SOS Button */}
        <button
          onClick={handleSOS}
          disabled={!!activeEmergency}
          className={`w-full py-5 sos-button text-xl ${activeEmergency === worker?.id ? 'animate-sos' : ''} ${activeEmergency ? 'opacity-60' : ''}`}
        >
          🚨 {t('action.sos')}
        </button>

        {activeEmergency === worker?.id && (
          <div className="p-3 rounded bg-[hsl(var(--risk-red-bg))] border border-[hsl(var(--risk-red)/0.3)] text-center text-sm font-bold text-[hsl(var(--risk-red))] animate-blink">
            {t('sos.worker_distress')} — {t('sos.dispatch')}
          </div>
        )}

        {/* Task card */}
        {asset ? (
          <div className="gov-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{asset.id}</h3>
              <span className={asset.zone === 'red' ? 'risk-badge-red' : asset.zone === 'yellow' ? 'risk-badge-yellow' : 'risk-badge-green'}>
                {t(`zone.${asset.zone}`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{lang === 'mr' ? asset.locationMr : asset.location}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">{t('risk.level')}</span>
                <p className="font-semibold">{t(`risk.${asset.riskLevel}`)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{lang === 'mr' ? 'मंजुरी' : 'Approval'}</span>
                <p className={`font-semibold ${asset.approvalStatus === 'approved' ? 'text-[hsl(var(--risk-green))]' : asset.approvalStatus === 'rejected' ? 'text-[hsl(var(--risk-red))]' : 'text-[hsl(var(--risk-yellow))]'}`}>
                  {t(`status.${asset.approvalStatus}`)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{lang === 'mr' ? 'मार्ग' : 'Route'}</span>
                <p className="font-semibold capitalize">{t(`veerpass.${asset.taskRoute === 'machine' ? 'machine' : 'manual'}`)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t('worker.safety')}</span>
                <p className={`font-semibold flex items-center gap-1 ${asset.riskLevel === 'high' ? 'text-[hsl(var(--risk-red))]' : asset.riskLevel === 'medium' ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
                  {asset.riskLevel === 'low' ? <CheckCircle className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}
                  {asset.riskLevel === 'high' ? (lang === 'mr' ? 'धोका' : 'Danger') : asset.riskLevel === 'medium' ? (lang === 'mr' ? 'सावधान' : 'Caution') : (lang === 'mr' ? 'सुरक्षित' : 'Safe')}
                </p>
              </div>
            </div>

            {/* Zone rule */}
            <div className={`p-2 rounded text-xs font-medium ${
              asset.zone === 'red' ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' :
              asset.zone === 'yellow' ? 'bg-[hsl(var(--risk-yellow-bg))] text-[hsl(var(--risk-yellow))]' :
              'bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))]'
            }`}>
              <Shield className="h-3 w-3 inline mr-1"/>
              {asset.zone === 'red' ? t('general.machine_only') :
               asset.zone === 'yellow' ? t('general.machine_first') : t('general.controlled_manual')}
            </div>

            {/* Live sensor snapshot */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'H₂S', value: asset.sensors.h2s, unit: 'ppm' },
                { label: 'O₂', value: asset.sensors.o2, unit: '%' },
                { label: lang === 'mr' ? 'तापमान' : 'Temp', value: asset.sensors.temp, unit: '°C' },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="font-mono font-bold text-sm">{s.value}{s.unit}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gov-card p-6 text-center text-muted-foreground text-sm">
            {lang === 'mr' ? 'सध्या कोणतेही कार्य नियुक्त नाही' : 'No task currently assigned'}
          </div>
        )}

        {/* PPE Checklist */}
        <div className="gov-card p-4">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4"/>{t('worker.ppe')}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {ppeItems.map(item => (
              <button
                key={item.key}
                onClick={() => toggleWorkerPPE(selectedWorker, item.key)}
                className={`flex items-center gap-2 p-2.5 rounded border text-sm font-medium transition-all active:scale-95 ${
                  worker?.ppeChecklist[item.key]
                    ? 'bg-[hsl(var(--risk-green-bg))] border-[hsl(var(--risk-green)/0.3)] text-[hsl(var(--risk-green))]'
                    : 'bg-muted/30 border-border text-muted-foreground'
                }`}
              >
                {worker?.ppeChecklist[item.key] ? <CheckCircle className="h-4 w-4"/> : <span className="w-4 h-4 rounded border-2"/>}
                {lang === 'mr' ? item.labelMr : item.label}
              </button>
            ))}
          </div>
          <p className={`text-xs mt-2 font-semibold ${worker?.ppeComplete ? 'text-[hsl(var(--risk-green))]' : 'text-[hsl(var(--risk-red))]'}`}>
            {worker?.ppeComplete ? (lang === 'mr' ? '✓ सर्व PPE पूर्ण' : '✓ All PPE Complete') : (lang === 'mr' ? '✗ PPE अपूर्ण' : '✗ PPE Incomplete')}
          </p>
        </div>

        {/* Chat with Admin */}
        <div className="gov-card p-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4"/>{lang === 'mr' ? 'प्रशासकाशी संवाद' : 'Chat with Admin'}
          </h4>
          <div className="h-32 overflow-y-auto space-y-1.5 mb-2 bg-muted/20 rounded p-2">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{lang === 'mr' ? 'संदेश पाठवा...' : 'Send a message...'}</p>
            ) : (
              chatMessages.slice(-10).map(msg => (
                <div key={msg.id} className={`flex ${!msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-2 py-1 rounded text-xs ${!msg.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p>{lang === 'mr' ? msg.messageMr : msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
              placeholder={t('comms.type_msg')}
              className="flex-1 px-3 py-2 text-sm border rounded bg-background"
            />
            <button onClick={handleChatSend} className="p-2 bg-primary text-primary-foreground rounded active:scale-95 transition-all">
              <Send className="h-4 w-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerApp;
