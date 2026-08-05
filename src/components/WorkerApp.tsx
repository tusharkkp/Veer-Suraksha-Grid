import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem, type Worker as WorkerType, type Machine, WORKER_FIREBASE_MAP } from '@/contexts/SystemContext';
import { useAuth } from '@/contexts/AuthContext';
import { dbRef, set, push, update } from '@/lib/firebase';
import { AlertTriangle, CheckCircle, Shield, Send, Phone, Play, Clock, MapPin, Wrench, Power, Heart, ChevronRight, Loader2, Truck, User, Wifi, WifiOff, Radio } from 'lucide-react';

type ShiftPhase = 'off' | 'ppe' | 'toolkit' | 'active' | 'onsite' | 'probing' | 'probe_result' | 'machine_select' | 'machine_waiting' | 'working' | 'welfare';

const WorkerApp: React.FC = () => {
  const { t, lang } = useLanguage();
  const { assets, workers, machines, triggerSOS, activeEmergency, sendChat, chatMessages, toggleWorkerPPE, telemetryMap } = useSystem();
  const { user } = useAuth();
  // Lock worker to logged-in user's workerId (or fallback to W-001 for admin testing)
  const lockedWorkerId = user?.workerId || 'W-001';
  const [selectedWorker] = useState(lockedWorkerId);
  const setSelectedWorker = (_v: string) => {}; // no-op — worker locked to auth
  const [chatInput, setChatInput] = useState('');
  const [shiftPhase, setShiftPhase] = useState<ShiftPhase>('off');
  const [toolkitChecked, setToolkitChecked] = useState<Record<string, boolean>>({});
  const [probeTimer, setProbeTimer] = useState(10);
  const [probeReadings, setProbeReadings] = useState<{ h2s: number; ch4: number; co: number; temp: number; humidity: number; waterDepth: number; oxygen: number } | null>(null);
  const [probeSafe, setProbeSafe] = useState<boolean | null>(null);
  const [probeStatus, setProbeStatus] = useState<'SAFE' | 'WARNING' | 'DANGER'>('SAFE');
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [machineTimer, setMachineTimer] = useState(10);
  const probeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const worker = workers.find(w => w.id === selectedWorker)!;
  const asset = assets.find(a => a.id === worker?.assignedAsset);

  // Get Firebase telemetry for this worker's path
  const fbKey = WORKER_FIREBASE_MAP[selectedWorker];
  const telemetry = fbKey ? telemetryMap[fbKey] : null;
  const isLive = telemetry?.isLive ?? false;
  const probeData = telemetry?.probe;
  const guardData = telemetry?.guard;

  const toolkitItems = [
    { id: 'veerguard', label: 'VeerGuard', labelMr: 'वीरगार्ड', desc: 'Wearable safety device', descMr: 'वेअरेबल सुरक्षा उपकरण' },
    { id: 'veerprobe', label: 'VeerProbe', labelMr: 'वीरप्रोब', desc: 'Pre-entry gas sensor', descMr: 'प्री-एंट्री गॅस सेन्सर' },
    { id: 'veercrawler', label: 'VeerCrawler', labelMr: 'वीरक्रॉलर', desc: 'Robotic inspection', descMr: 'रोबोटिक तपासणी' },
    { id: 'veeredge', label: 'VeerEdge', labelMr: 'वीरएज', desc: 'Field gateway', descMr: 'फील्ड गेटवे' },
    { id: 'torch', label: 'Safety Torch', labelMr: 'सेफ्टी टॉर्च', desc: 'Explosion-proof torch', descMr: 'स्फोट-रोधक टॉर्च' },
    { id: 'rope', label: 'Safety Rope', labelMr: 'सेफ्टी दोर', desc: 'Rescue rope 30m', descMr: 'रेस्क्यू दोर ३०मी' },
  ];

  const ppeItems: { key: keyof WorkerType['ppeChecklist']; labelMr: string; label: string }[] = [
    { key: 'helmet', labelMr: 'हेल्मेट', label: 'Helmet' },
    { key: 'gloves', labelMr: 'हातमोजे', label: 'Gloves' },
    { key: 'mask', labelMr: 'मास्क', label: 'Gas Mask' },
    { key: 'suit', labelMr: 'सुरक्षा सूट', label: 'Safety Suit' },
    { key: 'boots', labelMr: 'बूट', label: 'Safety Boots' },
    { key: 'harness', labelMr: 'हार्नेस', label: 'Harness' },
  ];

  // ═══════════════════════════════════════════════════════════════
  //  PROBE PHASE — Read REAL Firebase VeerProbe data
  //  Timer counts down, reads live ESP32 data at each tick
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (shiftPhase !== 'probing') return;
    const timer = setInterval(() => {
      setProbeTimer(prev => {
        // Update readings from Firebase on each tick (if live)
        if (isLive && probeData) {
          setProbeReadings({
            h2s: probeData.H2S,
            ch4: probeData.CH4,
            co: probeData.CO,
            temp: probeData.temperature,
            humidity: probeData.humidity,
            waterDepth: probeData.water_depth,
            oxygen: probeData.oxygen,
          });
        }

        if (prev <= 1) {
          clearInterval(timer);
          if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);

          // ── FINAL PROBE RESULT ──
          if (isLive && probeData) {
            // Use ESP32's classification as ground truth
            const espStatus = probeData.status || 'SAFE';
            setProbeStatus(espStatus);
            // ESP32 SAFE → allow entry (even in red zone — sensors confirm safety)
            // ESP32 WARNING → machine-first (if no machine → VeerPass)
            // ESP32 DANGER → block manual entry, force machine
            const safe = espStatus === 'SAFE';
            setProbeSafe(safe);
            setProbeReadings({
              h2s: probeData.H2S,
              ch4: probeData.CH4,
              co: probeData.CO,
              temp: probeData.temperature,
              humidity: probeData.humidity,
              waterDepth: probeData.water_depth,
              oxygen: probeData.oxygen,
            });
          } else {
            // Fallback: simulate for workers without ESP32
            const isSafe = asset ? asset.zone !== 'red' && asset.sensors.h2s < 10 && asset.sensors.o2 > 19 : true;
            const finalReadings = {
              h2s: Math.round((Math.random() * (isSafe ? 8 : 25) + (isSafe ? 1 : 10)) * 10) / 10,
              ch4: Math.round((Math.random() * (isSafe ? 1 : 4) + (isSafe ? 0.1 : 1)) * 10) / 10,
              co: Math.round((Math.random() * (isSafe ? 8 : 30) + (isSafe ? 1 : 10)) * 10) / 10,
              temp: Math.round((Math.random() * 5 + 28) * 10) / 10,
              humidity: Math.round((Math.random() * 15 + 60) * 10) / 10,
              waterDepth: Math.round((Math.random() * 2 + 0.3) * 10) / 10,
              oxygen: 98,
            };
            setProbeReadings(finalReadings);
            const safe = finalReadings.h2s < 10 && finalReadings.co < 15;
            setProbeSafe(safe);
            setProbeStatus(safe ? 'SAFE' : 'DANGER');
          }
          setShiftPhase('probe_result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Live readings update during probe scan
    probeIntervalRef.current = setInterval(() => {
      if (isLive && probeData) {
        setProbeReadings({
          h2s: probeData.H2S,
          ch4: probeData.CH4,
          co: probeData.CO,
          temp: probeData.temperature,
          humidity: probeData.humidity,
          waterDepth: probeData.water_depth,
          oxygen: probeData.oxygen,
        });
      } else {
        // Fallback simulation
        setProbeReadings({
          h2s: Math.round((Math.random() * 20 + 2) * 10) / 10,
          ch4: Math.round((Math.random() * 4 + 0.2) * 10) / 10,
          co: Math.round((Math.random() * 25 + 2) * 10) / 10,
          temp: Math.round((Math.random() * 5 + 28) * 10) / 10,
          humidity: Math.round((Math.random() * 15 + 60) * 10) / 10,
          waterDepth: Math.round((Math.random() * 2 + 0.3) * 10) / 10,
          oxygen: 98,
        });
      }
    }, 1500);

    return () => {
      clearInterval(timer);
      if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
    };
  }, [shiftPhase, asset, isLive, probeData]);

  // Machine arrival countdown
  useEffect(() => {
    if (shiftPhase !== 'machine_waiting') return;
    const timer = setInterval(() => {
      setMachineTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShiftPhase('working');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [shiftPhase]);

  // ═══════════════════════════════════════════════════════════════
  //  SOS HANDLER — Write to Firebase emergencies
  // ═══════════════════════════════════════════════════════════════
  const handleSOS = async () => {
    if (!worker) return;
    triggerSOS(worker.id);
    // Write SOS to Firebase emergencies
    try {
      const emergencyRef = push(dbRef('emergencies'));
      await set(emergencyRef, {
        workerId: worker.id,
        assetId: worker.assignedAsset || null,
        type: 'sos',
        status: 'active',
        timestamp: Date.now(),
        resolvedAt: null,
        resolvedBy: null,
      });
      console.log('[SOS] Emergency written to Firebase');
    } catch (err) {
      console.error('[SOS] Failed to write emergency:', err);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    sendChat(msg, msg, false);
    setChatInput('');
    // Write chat message to Firebase
    try {
      const chatRef = push(dbRef('chat'));
      await set(chatRef, {
        workerId: selectedWorker,
        message: msg,
        isAdmin: false,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[Chat] Firebase write failed:', err);
    }
    setTimeout(async () => {
      const replies = lang === 'mr'
        ? ['समजले, सूचना पाठवत आहोत', 'ठीक आहे, सावधगिरी बाळगा', 'यंत्र पाठवत आहोत']
        : ['Understood, sending instructions', 'Okay, be careful', 'Sending machine'];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      sendChat(reply, reply, true);
      // Write admin reply to Firebase
      try {
        const replyRef = push(dbRef('chat'));
        await set(replyRef, {
          workerId: selectedWorker,
          message: reply,
          isAdmin: true,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('[Chat] Firebase reply write failed:', err);
      }
    }, 2000);
  };

  const allToolkitChecked = toolkitItems.every(item => toolkitChecked[item.id]);

  // ═══════════════════════════════════════════════════════════════
  //  FIREBASE WRITE HELPERS
  // ═══════════════════════════════════════════════════════════════
  const writeWorkerStatus = async (updates: Record<string, any>) => {
    try {
      await update(dbRef(`workers/${selectedWorker}`), updates);
    } catch (err) {
      console.error('[Worker] Firebase write failed:', err);
    }
  };

  const startProbing = () => {
    setProbeTimer(10);
    setProbeReadings(null);
    setProbeSafe(null);
    setProbeStatus('SAFE');
    setShiftPhase('probing');
    // Write to Firebase: worker is on-site, probing
    writeWorkerStatus({ onSite: true, status: 'active', currentTask: `Probing ${worker?.assignedAsset}` });
  };

  const handleStartShift = () => {
    setShiftPhase('ppe');
    writeWorkerStatus({ shiftActive: true, status: 'active' });
  };

  const handleEndShift = () => {
    setShiftPhase('off');
    setToolkitChecked({});
    setSelectedMachines([]);
    writeWorkerStatus({ shiftActive: false, onSite: false, status: 'idle', currentTask: null, ppeComplete: false, toolkit: null });
  };

  // Write PPE checklist to Firebase when worker toggles items
  const handlePPEToggle = (key: keyof WorkerType['ppeChecklist']) => {
    toggleWorkerPPE(selectedWorker, key);
    // Write updated PPE state to Firebase after toggle
    const currentPPE = worker?.ppeChecklist || {};
    const updatedPPE = { ...currentPPE, [key]: !currentPPE[key] };
    const allChecked = Object.values(updatedPPE).every(v => v);
    writeWorkerStatus({ ppeChecklist: updatedPPE, ppeComplete: allChecked });
  };

  // Write toolkit completion to Firebase
  const handleToolkitToggle = (itemId: string) => {
    const newState = { ...toolkitChecked, [itemId]: !toolkitChecked[itemId] };
    setToolkitChecked(newState);
    writeWorkerStatus({ toolkit: newState });
  };

  // VeerPass request for red zone WARNING when no machines available
  const handleVeerPassRequest = async () => {
    try {
      const veerpassRef = push(dbRef('veerpass_requests'));
      await set(veerpassRef, {
        workerId: selectedWorker,
        assetId: worker?.assignedAsset || null,
        probeStatus: probeStatus,
        zone: asset?.zone || 'unknown',
        reason: 'Machine required but none available',
        status: 'pending',
        timestamp: Date.now(),
      });
      console.log('[VeerPass] Request submitted to Firebase');
    } catch (err) {
      console.error('[VeerPass] Failed to write:', err);
    }
  };

  const availableMachinesForSelection = machines.filter(m => m.status === 'available');

  // ========== RENDER PHASES ==========

  // OFF - Start Shift
  if (shiftPhase === 'off') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        {/* Firebase connection status */}
        <div className="px-4 pt-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold w-fit ${
            isLive ? 'bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))]' : 'bg-muted text-muted-foreground'
          }`}>
            {isLive ? <><Wifi className="h-3 w-3" />{lang === 'mr' ? 'ESP32 लाइव्ह' : 'ESP32 Live'}</> : <><WifiOff className="h-3 w-3" />{lang === 'mr' ? 'सिम्युलेटेड' : 'Simulated'}</>}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center space-y-2">
            <Shield className="h-16 w-16 mx-auto text-primary opacity-60" />
            <h2 className="text-2xl font-bold">{lang === 'mr' ? 'स्वच्छता वीर' : 'Swachhata Veer'}</h2>
            <p className="text-muted-foreground text-sm">{lang === 'mr' ? 'आपली शिफ्ट सुरू करा' : 'Start your shift'}</p>
          </div>
          <button
            onClick={handleStartShift}
            className="w-full max-w-xs py-4 bg-primary text-primary-foreground rounded-xl text-lg font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
          >
            <Play className="h-6 w-6" />
            {lang === 'mr' ? 'शिफ्ट सुरू करा' : 'Start Shift'}
          </button>
          <button
            onClick={() => setShiftPhase('welfare')}
            className="w-full max-w-xs py-3 border-2 border-primary/30 rounded-xl text-sm font-semibold text-primary flex items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4" />
            {lang === 'mr' ? 'कल्याणकारी योजना' : 'Welfare Schemes'}
          </button>
        </div>
      </div>
    );
  }

  // WELFARE SCHEMES
  if (shiftPhase === 'welfare') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2"><Heart className="h-5 w-5 text-primary" />{lang === 'mr' ? 'कर्मचारी कल्याणकारी योजना' : 'Worker Welfare Schemes'}</h3>
            <button onClick={() => setShiftPhase('off')} className="text-xs text-muted-foreground underline">{lang === 'mr' ? 'मागे' : 'Back'}</button>
          </div>
          {welfareSchemes.map((s, i) => (
            <div key={i} className="gov-card p-4 space-y-1">
              <h4 className="font-bold text-sm">{lang === 'mr' ? s.titleMr : s.title}</h4>
              <p className="text-xs text-muted-foreground">{lang === 'mr' ? s.descMr : s.desc}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="risk-badge-green text-[10px]">{lang === 'mr' ? s.statusMr : s.status}</span>
                <span className="text-[10px] text-muted-foreground">{lang === 'mr' ? s.amountMr : s.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PPE CHECKLIST
  if (shiftPhase === 'ppe') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />{t('worker.ppe')}</h3>
          <p className="text-xs text-muted-foreground">{lang === 'mr' ? 'सर्व PPE तपासा आणि पूर्ण करा' : 'Check all PPE items and complete'}</p>
          <div className="grid grid-cols-2 gap-2">
            {ppeItems.map(item => (
              <button
                key={item.key}
                onClick={() => handlePPEToggle(item.key)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all active:scale-95 ${
                  worker?.ppeChecklist[item.key]
                    ? 'bg-[hsl(var(--risk-green-bg))] border-[hsl(var(--risk-green)/0.3)] text-[hsl(var(--risk-green))]'
                    : 'bg-muted/30 border-border text-muted-foreground'
                }`}
              >
                {worker?.ppeChecklist[item.key] ? <CheckCircle className="h-4 w-4" /> : <span className="w-4 h-4 rounded border-2" />}
                {lang === 'mr' ? item.labelMr : item.label}
              </button>
            ))}
          </div>
          <p className={`text-xs font-semibold ${worker?.ppeComplete ? 'text-[hsl(var(--risk-green))]' : 'text-[hsl(var(--risk-red))]'}`}>
            {worker?.ppeComplete ? (lang === 'mr' ? '✓ सर्व PPE पूर्ण' : '✓ All PPE Complete') : (lang === 'mr' ? '✗ PPE अपूर्ण — सर्व आयटम तपासा' : '✗ PPE Incomplete — Check all items')}
          </p>
          <button
            disabled={!worker?.ppeComplete}
            onClick={() => setShiftPhase('toolkit')}
            className={`w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all ${
              worker?.ppeComplete ? 'bg-primary text-primary-foreground active:scale-95' : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
            {lang === 'mr' ? 'पुढे — टूलकिट' : 'Next — Toolkit'}
          </button>
        </div>
      </div>
    );
  }

  // TOOLKIT
  if (shiftPhase === 'toolkit') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />{lang === 'mr' ? 'टूलकिट तपासणी' : 'Toolkit Check'}</h3>
          <p className="text-xs text-muted-foreground">{lang === 'mr' ? 'शिफारस केलेले सर्व उपकरणे तपासा' : 'Verify all recommended devices'}</p>
          <div className="space-y-2">
            {toolkitItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleToolkitToggle(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all active:scale-[0.98] ${
                  toolkitChecked[item.id]
                    ? 'bg-[hsl(var(--risk-green-bg))] border-[hsl(var(--risk-green)/0.3)]'
                    : 'bg-muted/20 border-border'
                }`}
              >
                {toolkitChecked[item.id] ? <CheckCircle className="h-5 w-5 text-[hsl(var(--risk-green))] shrink-0" /> : <span className="w-5 h-5 rounded border-2 shrink-0" />}
                <div>
                  <p className={`font-semibold text-sm ${toolkitChecked[item.id] ? 'text-[hsl(var(--risk-green))]' : ''}`}>{lang === 'mr' ? item.labelMr : item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{lang === 'mr' ? item.descMr : item.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            disabled={!allToolkitChecked}
            onClick={() => setShiftPhase('active')}
            className={`w-full py-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all ${
              allToolkitChecked ? 'bg-primary text-primary-foreground active:scale-95' : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Play className="h-5 w-5" />
            {lang === 'mr' ? 'शिफ्ट सुरू करा' : 'Start Shift'}
          </button>
        </div>
      </div>
    );
  }

  // PROBING — VeerProbe scan (locked screen)
  if (shiftPhase === 'probing') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="relative">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold tabular-nums">{probeTimer}s</span>
            </div>
          </div>
          <h3 className="text-lg font-bold text-center">{lang === 'mr' ? 'वीरप्रोब स्कॅनिंग...' : 'VeerProbe Scanning...'}</h3>
          <p className="text-xs text-muted-foreground text-center">
            {isLive
              ? (lang === 'mr' ? 'ESP32 वरून रिअल-टाइम डेटा वाचत आहे' : 'Reading real-time data from ESP32')
              : (lang === 'mr' ? 'सिम्युलेटेड रीडिंग' : 'Simulated readings')}
          </p>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            isLive ? 'bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))]' : 'bg-muted text-muted-foreground'
          }`}>
            {isLive ? <><Wifi className="h-3 w-3" /> ESP32 Live</> : <><WifiOff className="h-3 w-3" /> Simulated</>}
          </div>

          {probeReadings && (
            <div className="w-full gov-card p-3 space-y-2">
              <h4 className="text-xs font-bold text-center flex items-center justify-center gap-1">
                <Radio className="h-3 w-3" />
                {lang === 'mr' ? 'लाइव्ह रीडिंग — वीरप्रोब' : 'Live Readings — VeerProbe'}
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'H₂S', value: probeReadings.h2s, unit: isLive ? ' ADC' : ' ppm' },
                  { label: 'CH₄', value: probeReadings.ch4, unit: isLive ? ' ADC' : ' %' },
                  { label: 'CO', value: probeReadings.co, unit: isLive ? ' ADC' : ' ppm' },
                  { label: lang === 'mr' ? 'तापमान' : 'Temp', value: probeReadings.temp, unit: '°C' },
                  { label: lang === 'mr' ? 'आर्द्रता' : 'Humidity', value: probeReadings.humidity, unit: '%' },
                  { label: lang === 'mr' ? 'पाणी खोली' : 'Water', value: probeReadings.waterDepth, unit: 'cm' },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className="font-mono font-bold text-sm">{typeof s.value === 'number' ? Math.round(s.value) : s.value}{s.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PROBE RESULT
  if (shiftPhase === 'probe_result') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className={`p-4 rounded-xl text-center space-y-2 ${
            probeStatus === 'SAFE' ? 'bg-[hsl(var(--risk-green-bg))]' :
            probeStatus === 'WARNING' ? 'bg-[hsl(var(--risk-yellow-bg))]' :
            'bg-[hsl(var(--risk-red-bg))]'
          }`}>
            {probeStatus === 'SAFE'
              ? <CheckCircle className="h-12 w-12 mx-auto text-[hsl(var(--risk-green))]" />
              : probeStatus === 'WARNING'
              ? <AlertTriangle className="h-12 w-12 mx-auto text-[hsl(var(--risk-yellow))]" />
              : <AlertTriangle className="h-12 w-12 mx-auto text-[hsl(var(--risk-red))]" />}
            <h3 className={`text-lg font-bold ${
              probeStatus === 'SAFE' ? 'text-[hsl(var(--risk-green))]' :
              probeStatus === 'WARNING' ? 'text-[hsl(var(--risk-yellow))]' :
              'text-[hsl(var(--risk-red))]'
            }`}>
              {probeStatus === 'SAFE'
                ? (lang === 'mr' ? 'सुरक्षित — प्रवेश करा' : 'SAFE — Enter Manhole')
                : probeStatus === 'WARNING'
                ? (lang === 'mr' ? 'सावधान — यंत्र प्रथम' : 'WARNING — Machine First')
                : (lang === 'mr' ? 'असुरक्षित — मॅन्युअल प्रवेश अवरोधित' : 'UNSAFE — Manual Entry Blocked')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {probeStatus === 'SAFE'
                ? (lang === 'mr' ? 'वीरगार्ड सोबत प्रवेश करा आणि सफाई करा' : 'Enter with VeerGuard wearable and clean')
                : probeStatus === 'WARNING'
                ? (lang === 'mr' ? 'यंत्र प्रथम शिफारस — FleetEye किंवा वीरपास विनंती' : 'Machine first recommended — FleetEye or VeerPass request')
                : (lang === 'mr' ? 'यंत्र आवश्यक — FleetEye मधून निवडा' : 'Machine required — Select from FleetEye')}
            </p>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              probeStatus === 'SAFE' ? 'bg-[hsl(var(--risk-green))] text-white' :
              probeStatus === 'WARNING' ? 'bg-[hsl(var(--risk-yellow))] text-white' :
              'bg-[hsl(var(--risk-red))] text-white'
            }`}>
              ESP32: {probeStatus}
            </div>
          </div>

          {probeReadings && (
            <div className="gov-card p-3">
              <h4 className="text-xs font-semibold mb-2">{lang === 'mr' ? 'वीरप्रोब अंतिम रीडिंग' : 'VeerProbe Final Readings'}</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'H₂S', value: probeReadings.h2s, unit: 'ppm' },
                  { label: 'CH₄', value: probeReadings.ch4, unit: '%' },
                  { label: 'CO', value: probeReadings.co, unit: 'ppm' },
                  { label: lang === 'mr' ? 'तापमान' : 'Temp', value: probeReadings.temp, unit: '°C' },
                  { label: lang === 'mr' ? 'आर्द्रता' : 'Humidity', value: probeReadings.humidity, unit: '%' },
                  { label: lang === 'mr' ? 'पाणी खोली' : 'Water Depth', value: probeReadings.waterDepth, unit: 'm' },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded p-1.5">
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className="font-mono font-bold text-xs">{s.value}{s.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {probeSafe ? (
            <button onClick={() => { setShiftPhase('working'); writeWorkerStatus({ currentTask: `Working at ${worker?.assignedAsset}` }); }} className="w-full py-3 bg-[hsl(var(--risk-green))] text-white rounded-xl font-bold active:scale-95 transition-all">
              {lang === 'mr' ? 'वीरगार्ड सोबत प्रवेश करा' : 'Enter with VeerGuard'}
            </button>
          ) : probeStatus === 'WARNING' ? (
            /* WARNING: machine-first, but if none available → VeerPass */
            <div className="space-y-2">
              <button onClick={() => setShiftPhase('machine_select')} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
                <Truck className="h-5 w-5" />
                {lang === 'mr' ? 'FleetEye — यंत्र निवडा' : 'FleetEye — Select Machine'}
              </button>
              {availableMachinesForSelection.length === 0 && (
                <button onClick={handleVeerPassRequest} className="w-full py-3 border-2 border-[hsl(var(--risk-yellow))] text-[hsl(var(--risk-yellow))] rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5" />
                  {lang === 'mr' ? 'वीरपास विनंती पाठवा' : 'Send VeerPass Request'}
                </button>
              )}
            </div>
          ) : (
            /* DANGER: machine mandatory */
            <button onClick={() => setShiftPhase('machine_select')} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
              <Truck className="h-5 w-5" />
              {lang === 'mr' ? 'FleetEye — यंत्र निवडा' : 'FleetEye — Select Machine'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // MACHINE SELECT
  if (shiftPhase === 'machine_select') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />{lang === 'mr' ? 'FleetEye — यंत्र निवडा' : 'FleetEye — Select Machines'}</h3>
          <p className="text-xs text-muted-foreground">{lang === 'mr' ? 'या मॅनहोल साठी आवश्यक यंत्रे निवडा' : 'Select machines needed for this manhole'}</p>
          {availableMachinesForSelection.length === 0 ? (
            <div className="p-4 bg-[hsl(var(--risk-yellow-bg))] rounded text-center text-sm text-[hsl(var(--risk-yellow))]">
              {lang === 'mr' ? 'सध्या कोणतेही यंत्र उपलब्ध नाही — प्रतीक्षा करा' : 'No machines available — Please wait'}
            </div>
          ) : (
            <div className="space-y-2">
              {availableMachinesForSelection.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMachines(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all active:scale-[0.98] ${
                    selectedMachines.includes(m.id)
                      ? 'bg-[hsl(var(--risk-green-bg))] border-[hsl(var(--risk-green)/0.3)]'
                      : 'bg-muted/20 border-border'
                  }`}
                >
                  {selectedMachines.includes(m.id) ? <CheckCircle className="h-5 w-5 text-[hsl(var(--risk-green))] shrink-0" /> : <span className="w-5 h-5 rounded border-2 shrink-0" />}
                  <div>
                    <p className="font-semibold text-sm">{m.id} — {lang === 'mr' ? m.typeNameMr : m.typeName}</p>
                    <p className="text-[11px] text-muted-foreground">{lang === 'mr' ? 'स्थान' : 'Location'}: {m.location}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            disabled={selectedMachines.length === 0}
            onClick={() => { setMachineTimer(10); setShiftPhase('machine_waiting'); }}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              selectedMachines.length > 0 ? 'bg-primary text-primary-foreground active:scale-95' : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {lang === 'mr' ? 'यंत्र पाठवा' : 'Request Machines'}
          </button>
        </div>
      </div>
    );
  }

  // MACHINE WAITING
  if (shiftPhase === 'machine_waiting') {
    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <h3 className="text-lg font-bold">{lang === 'mr' ? 'यंत्र येत आहे...' : 'Machine Arriving...'}</h3>
          <p className="text-3xl font-bold tabular-nums text-primary">{machineTimer}s</p>
          <p className="text-xs text-muted-foreground text-center">{lang === 'mr' ? 'कृपया प्रतीक्षा करा — यंत्र साइटवर पोहोचत आहे' : 'Please wait — Machine arriving at site'}</p>
          <div className="text-[10px] text-muted-foreground">{lang === 'mr' ? '(डेमो: १० सेकंद)' : '(Demo: 10 seconds)'}</div>
          <div className="gov-card p-3 w-full max-w-xs">
            <p className="text-xs text-center text-muted-foreground">{lang === 'mr' ? 'नियुक्त यंत्रे' : 'Allocated Machines'}</p>
            {selectedMachines.map(id => {
              const m = machines.find(x => x.id === id);
              return m ? <p key={id} className="text-sm font-semibold text-center">{m.id} — {lang === 'mr' ? m.typeNameMr : m.typeName}</p> : null;
            })}
          </div>
        </div>
      </div>
    );
  }

  // WORKING (safe entry or machine + worker)
  if (shiftPhase === 'working') {
    // Use real Firebase VeerGuard data if available
    const liveH2S = isLive && guardData ? guardData.H2S : (asset?.sensors.h2s ?? 0);
    const liveCH4 = isLive && guardData ? guardData.CH4 : (asset?.sensors.ch4 ?? 0);
    const liveCO = isLive && guardData ? guardData.CO : (asset?.sensors.co ?? 0);
    const liveO2 = isLive && guardData ? guardData.oxygen : (asset?.sensors.o2 ?? 20.9);
    const liveTemp = isLive && guardData ? guardData.temperature : (asset?.sensors.temp ?? 28);
    const liveHum = isLive && guardData ? guardData.humidity : (asset?.sensors.humidity ?? 60);
    const liveWater = isLive && guardData ? guardData.water_depth : (asset?.sensors.waterDepth ?? 0);
    const liveFall = isLive && guardData ? guardData.fall_detected : false;
    const liveNoMotion = isLive && guardData ? guardData.no_movement : false;
    const liveStatus = isLive && guardData ? guardData.status : 'SAFE';
    const liveSOS = isLive && guardData ? guardData.sos : false;

    return (
      <div className="max-w-md mx-auto flex flex-col h-full bg-background">
        <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SOS */}
          <button onClick={handleSOS} disabled={!!activeEmergency} className={`w-full py-4 sos-button text-lg ${activeEmergency === worker?.id ? 'animate-sos' : ''} ${activeEmergency ? 'opacity-60' : ''}`}>
            🚨 {t('action.sos')}
          </button>

          {/* Working status */}
          <div className={`p-3 rounded-xl text-center ${liveStatus === 'DANGER' ? 'bg-[hsl(var(--risk-red-bg))]' : liveStatus === 'WARNING' ? 'bg-[hsl(var(--risk-yellow-bg))]' : 'bg-[hsl(var(--risk-green-bg))]'}`}>
            <p className={`text-sm font-bold ${liveStatus === 'DANGER' ? 'text-[hsl(var(--risk-red))]' : liveStatus === 'WARNING' ? 'text-[hsl(var(--risk-yellow))]' : 'text-[hsl(var(--risk-green))]'}`}>
              {liveStatus === 'DANGER'
                ? (lang === 'mr' ? '🚨 धोका शोधला — तात्काळ बाहेर या!' : '🚨 DANGER Detected — Exit Immediately!')
                : liveStatus === 'WARNING'
                ? (lang === 'mr' ? '⚠️ सावधान — सावधगिरी बाळगा' : '⚠️ WARNING — Exercise Caution')
                : probeSafe
                ? (lang === 'mr' ? '🔧 सफाई सुरू — वीरगार्ड सक्रिय' : '🔧 Cleaning in Progress — VeerGuard Active')
                : (lang === 'mr' ? '🚜 यंत्र + कर्मचारी — सफाई सुरू' : '🚜 Machine + Worker — Cleaning in Progress')}
            </p>
          </div>

          {/* Fall / No Motion Alerts */}
          {(liveFall || liveNoMotion) && (
            <div className="p-3 rounded-xl bg-[hsl(var(--risk-red-bg))] border border-[hsl(var(--risk-red)/0.3)] text-center animate-blink">
              <p className="text-sm font-bold text-[hsl(var(--risk-red))]">
                {liveFall
                  ? (lang === 'mr' ? '🚨 पडणे शोधले! — MPU6050' : '🚨 FALL DETECTED! — MPU6050')
                  : (lang === 'mr' ? '🚨 हालचाल नाही 15 सेकंद! — MPU6050' : '🚨 NO MOVEMENT 15 sec! — MPU6050')}
              </p>
            </div>
          )}

          {/* VeerGuard Panel — REAL DATA */}
          <div className="gov-card p-3">
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {lang === 'mr' ? 'वीरगार्ड — लाइव्ह रीडिंग' : 'VeerGuard — Live Readings'}
              <span className={`ml-auto flex items-center gap-1 text-[10px] ${isLive ? 'text-[hsl(var(--risk-green))]' : 'text-muted-foreground'}`}>
                {isLive ? <><Wifi className="h-3 w-3" /> ESP32</> : <><WifiOff className="h-3 w-3" /> Sim</>}
              </span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'H₂S', value: liveH2S, unit: isLive ? ' ADC' : '' },
                { label: 'CH₄', value: liveCH4, unit: isLive ? ' ADC' : '' },
                { label: 'CO', value: liveCO, unit: isLive ? ' ADC' : '' },
                { label: 'O₂', value: liveO2, unit: '%' },
                { label: lang === 'mr' ? 'तापमान' : 'Temp', value: liveTemp, unit: '°C' },
                { label: lang === 'mr' ? 'आर्द्रता' : 'Hum', value: liveHum, unit: '%' },
                { label: lang === 'mr' ? 'पाणी' : 'Water', value: liveWater, unit: 'cm' },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded p-1.5">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="font-mono font-bold text-xs">{typeof s.value === 'number' ? Math.round(s.value * 10) / 10 : s.value}{s.unit}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px]">
              <span className={`px-1.5 py-0.5 rounded font-semibold ${liveFall || liveNoMotion ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' : 'bg-muted text-muted-foreground'}`}>
                MPU6050: {liveFall ? (lang === 'mr' ? 'पडले!' : 'FALL!') : liveNoMotion ? (lang === 'mr' ? 'हालचाल नाही!' : 'NO MOTION!') : (lang === 'mr' ? 'सामान्य' : 'Normal')}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-semibold ${liveStatus === 'DANGER' ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' : liveStatus === 'WARNING' ? 'bg-[hsl(var(--risk-yellow-bg))] text-[hsl(var(--risk-yellow))]' : 'bg-[hsl(var(--risk-green-bg))] text-[hsl(var(--risk-green))]'}`}>
                {liveStatus}
              </span>
            </div>
          </div>

          {/* Chat */}
          <ChatSection lang={lang} chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} handleChatSend={handleChatSend} t={t} />

          {/* End shift */}
          <button onClick={handleEndShift} className="w-full py-3 border-2 border-destructive/50 rounded-xl font-bold text-destructive flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Power className="h-5 w-5" />
            {lang === 'mr' ? 'शिफ्ट संपवा' : 'End Shift'}
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE DASHBOARD (shift started, tasks visible)
  return (
    <div className="max-w-md mx-auto flex flex-col h-full bg-background">
      <WorkerSelector selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} workers={workers} lang={lang} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SOS Button */}
        <button onClick={handleSOS} disabled={!!activeEmergency} className={`w-full py-4 sos-button text-lg ${activeEmergency === worker?.id ? 'animate-sos' : ''} ${activeEmergency ? 'opacity-60' : ''}`}>
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
                  {asset.riskLevel === 'low' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
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
              <Shield className="h-3 w-3 inline mr-1" />
              {asset.zone === 'red' ? t('general.machine_only') : asset.zone === 'yellow' ? t('general.machine_first') : t('general.controlled_manual')}
            </div>

            {/* Red zone: machine auto-allocated */}
            {asset.zone === 'red' && (
              <div className="p-2 rounded bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))] text-xs font-semibold flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" />
                {lang === 'mr' ? '🚜 लाल क्षेत्र — यंत्र स्वयंचलित नियुक्त' : '🚜 Red Zone — Machine Auto-Allocated'}
              </div>
            )}

            {/* I am on-site button */}
            <button
              onClick={startProbing}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <MapPin className="h-5 w-5" />
              {lang === 'mr' ? 'मी साइटवर आहे' : 'I am On-Site'}
            </button>
          </div>
        ) : (
          <div className="gov-card p-6 text-center text-muted-foreground text-sm">
            {lang === 'mr' ? 'सध्या कोणतेही कार्य नियुक्त नाही' : 'No task currently assigned'}
          </div>
        )}

        {/* VeerProbe Panel (idle readings) */}
        {asset && (
          <div className="gov-card p-3">
            <h4 className="text-xs font-bold mb-2">{lang === 'mr' ? 'वीरप्रोब — सेन्सर रीडिंग' : 'VeerProbe — Sensor Readings'}</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'H₂S', value: asset.sensors.h2s, unit: 'ppm' },
                { label: 'CH₄', value: asset.sensors.ch4, unit: '%' },
                { label: 'CO', value: asset.sensors.co, unit: 'ppm' },
                { label: lang === 'mr' ? 'तापमान' : 'Temp', value: asset.sensors.temp, unit: '°C' },
                { label: lang === 'mr' ? 'आर्द्रता' : 'Humidity', value: asset.sensors.humidity, unit: '%' },
                { label: lang === 'mr' ? 'पाणी खोली' : 'Water Depth', value: asset.sensors.waterDepth, unit: 'm' },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded p-1.5">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="font-mono font-bold text-xs">{s.value}{s.unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VeerGuard Panel */}
        {asset && (
          <div className="gov-card p-3">
            <h4 className="text-xs font-bold mb-2">{lang === 'mr' ? 'वीरगार्ड — सेन्सर रीडिंग' : 'VeerGuard — Sensor Readings'}</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'H₂S', value: asset.sensors.h2s, unit: 'ppm' },
                { label: 'O₂', value: asset.sensors.o2, unit: '%' },
                { label: lang === 'mr' ? 'तापमान' : 'Temp', value: asset.sensors.temp, unit: '°C' },
                { label: lang === 'mr' ? 'आर्द्रता' : 'Humidity', value: asset.sensors.humidity, unit: '%' },
                { label: lang === 'mr' ? 'बॅटरी' : 'Battery', value: Math.round(asset.sensors.battery), unit: '%' },
              ].map(s => (
                <div key={s.label} className="bg-muted/50 rounded p-1.5">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="font-mono font-bold text-xs">{s.value}{s.unit}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px]">
              <span className={`px-1.5 py-0.5 rounded ${asset.sensors.mpu6050Fallback ? 'bg-[hsl(var(--risk-red-bg))] text-[hsl(var(--risk-red))]' : 'bg-muted text-muted-foreground'}`}>
                MPU6050: {asset.sensors.mpu6050Fallback ? (lang === 'mr' ? 'फॉलबॅक सक्रिय!' : 'FALLBACK ACTIVE!') : (lang === 'mr' ? 'सामान्य' : 'Normal')}
              </span>
            </div>
          </div>
        )}

        {/* Chat */}
        <ChatSection lang={lang} chatMessages={chatMessages} chatInput={chatInput} setChatInput={setChatInput} handleChatSend={handleChatSend} t={t} />

        {/* End Shift */}
        <button onClick={handleEndShift} className="w-full py-3 border-2 border-destructive/50 rounded-xl font-bold text-destructive flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Power className="h-5 w-5" />
          {lang === 'mr' ? 'शिफ्ट संपवा' : 'End Shift'}
        </button>
      </div>
    </div>
  );
};

// ON-SITE phase - handled inside active phase
// We redirect onsite to probing
const WorkerAppWrapper: React.FC = () => {
  return <WorkerApp />;
};

// Subcomponents
const WorkerSelector: React.FC<{ selectedWorker: string; setSelectedWorker: (v: string) => void; workers: any[]; lang: string }> = ({ selectedWorker, workers, lang }) => {
  const w = workers.find((w: any) => w.id === selectedWorker);
  if (!w) return null;
  return (
    <div className="p-3 bg-muted/50 border-b">
      <div className="flex items-center gap-2 w-full p-2 text-sm rounded border bg-background">
        <User className="h-4 w-4 text-primary" />
        <span className="font-medium">{w.id} — {lang === 'mr' ? w.nameMr : w.name}</span>
        {w.assignedAsset && (
          <span className="ml-auto text-xs text-muted-foreground">{w.assignedAsset}</span>
        )}
      </div>
    </div>
  );
};

const ChatSection: React.FC<{ lang: string; chatMessages: any[]; chatInput: string; setChatInput: (v: string) => void; handleChatSend: () => void; t: (k: string) => string }> = ({ lang, chatMessages, chatInput, setChatInput, handleChatSend, t }) => (
  <div className="gov-card p-4">
    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
      <Phone className="h-4 w-4" />{lang === 'mr' ? 'प्रशासकाशी संवाद' : 'Chat with Admin'}
    </h4>
    <div className="h-28 overflow-y-auto space-y-1.5 mb-2 bg-muted/20 rounded p-2">
      {chatMessages.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">{lang === 'mr' ? 'संदेश पाठवा...' : 'Send a message...'}</p>
      ) : (
        chatMessages.slice(-10).map((msg: any) => (
          <div key={msg.id} className={`flex ${!msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-2 py-1 rounded text-xs ${!msg.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p>{lang === 'mr' ? msg.messageMr : msg.message}</p>
            </div>
          </div>
        ))
      )}
    </div>
    <div className="flex gap-2">
      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()} placeholder={t('comms.type_msg')} className="flex-1 px-3 py-2 text-sm border rounded bg-background" />
      <button onClick={handleChatSend} className="p-2 bg-primary text-primary-foreground rounded active:scale-95 transition-all"><Send className="h-4 w-4" /></button>
    </div>
  </div>
);

// Welfare schemes mock data
const welfareSchemes = [
  { title: 'Safai Karamchari Health Insurance', titleMr: 'सफाई कर्मचारी आरोग्य विमा', desc: 'Annual health coverage of ₹5 lakh for sanitation workers and family', descMr: 'सफाई कर्मचारी आणि कुटुंबासाठी ₹५ लाख वार्षिक आरोग्य विमा', status: 'Active', statusMr: 'सक्रिय', amount: '₹5,00,000/year', amountMr: '₹५,००,०००/वर्ष' },
  { title: 'Children Education Scholarship', titleMr: 'मुलांसाठी शिक्षण शिष्यवृत्ती', desc: 'Scholarship for children of sanitation workers up to graduation', descMr: 'पदवीपर्यंत सफाई कर्मचाऱ्यांच्या मुलांसाठी शिष्यवृत्ती', status: 'Active', statusMr: 'सक्रिय', amount: '₹20,000/year', amountMr: '₹२०,०००/वर्ष' },
  { title: 'Accident & Life Insurance', titleMr: 'अपघात आणि जीवन विमा', desc: '₹10 lakh accidental death cover, ₹2 lakh disability', descMr: '₹१० लाख अपघाती मृत्यू विमा, ₹२ लाख अपंगत्व', status: 'Active', statusMr: 'सक्रिय', amount: '₹10,00,000', amountMr: '₹१०,००,०००' },
  { title: 'Housing Assistance Scheme', titleMr: 'गृहनिर्माण सहाय्य योजना', desc: 'Financial aid for house construction or renovation', descMr: 'घर बांधकाम किंवा नूतनीकरणासाठी आर्थिक मदत', status: 'Available', statusMr: 'उपलब्ध', amount: '₹2,50,000', amountMr: '₹२,५०,०००' },
  { title: 'Retirement Pension Scheme', titleMr: 'सेवानिवृत्ती पेन्शन योजना', desc: 'Monthly pension after 20 years of service', descMr: '२० वर्षे सेवेनंतर मासिक पेन्शन', status: 'Active', statusMr: 'सक्रिय', amount: '₹5,000/month', amountMr: '₹५,०००/महिना' },
  { title: 'Festival Bonus', titleMr: 'सण बोनस', desc: 'Annual festival bonus equivalent to one month salary', descMr: 'एक महिन्याच्या पगाराएवढा वार्षिक सण बोनस', status: 'Active', statusMr: 'सक्रिय', amount: '1 month salary', amountMr: '१ महिन्याचा पगार' },
  { title: 'Free Medical Checkup', titleMr: 'मोफत वैद्यकीय तपासणी', desc: 'Quarterly health checkup at municipal hospital', descMr: 'महानगरपालिका रुग्णालयात त्रैमासिक आरोग्य तपासणी', status: 'Active', statusMr: 'सक्रिय', amount: 'Free', amountMr: 'मोफत' },
];

export default WorkerApp;
