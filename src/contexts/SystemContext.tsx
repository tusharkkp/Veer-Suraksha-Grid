import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { dbRef, onValue } from '@/lib/firebase';
import type { VeerProbeData, VeerGuardData, WorkerTelemetry } from '@/hooks/useFirebaseTelemetry';
import { getStatusColor } from '@/hooks/useFirebaseTelemetry';

// Types
export interface ProbeSensorData {
  h2s: number;
  ch4: number;
  co: number;
  temp: number;
  humidity: number;
  waterDepth: number; // ultrasonic
}

export interface GuardSensorData {
  h2s: number;
  ch4: number;
  co: number;
  o2: number;
  temp: number;
  humidity: number;
  mpu6050Fallback: boolean;
  battery: number;
}

export interface SensorData {
  h2s: number;
  ch4: number;
  co: number;
  o2: number;
  temp: number;
  battery: number;
  humidity: number;
  waterDepth: number;
  mpu6050Fallback: boolean;
}

export type RiskLevel = 'high' | 'medium' | 'low';
export type ZoneColor = 'red' | 'yellow' | 'green';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'hold';
export type WorkerStatus = 'active' | 'idle' | 'emergency';
export type MachineStatus = 'available' | 'inuse' | 'maintenance';
export type TaskRoute = 'machine' | 'manual' | 'pending';

export interface Asset {
  id: string;
  name: string;
  nameMr: string;
  location: string;
  locationMr: string;
  lat: number;
  lng: number;
  zone: ZoneColor;
  zoneType: string;
  zoneTypeMr: string;
  riskLevel: RiskLevel;
  sensors: SensorData;
  assignedWorker: string | null;
  approvalStatus: ApprovalStatus;
  taskRoute: TaskRoute;
  machineRequired: boolean;
  history: EventLog[];
}

export interface Worker {
  id: string;
  name: string;
  nameMr: string;
  status: WorkerStatus;
  currentTask: string | null;
  currentTaskMr: string | null;
  deviceStatus: 'online' | 'offline' | 'low_battery';
  assignedAsset: string | null;
  ppeComplete: boolean;
  ppeChecklist: { helmet: boolean; gloves: boolean; mask: boolean; suit: boolean; boots: boolean; harness: boolean };
}

export interface Machine {
  id: string;
  type: 'jetting' | 'rodding' | 'sludge' | 'crawler';
  typeName: string;
  typeNameMr: string;
  status: MachineStatus;
  assignedAsset: string | null;
  location: string;
}

export interface EventLog {
  id: string;
  timestamp: Date;
  type: 'approval' | 'alert' | 'sos' | 'task' | 'sensor' | 'machine' | 'communication';
  message: string;
  messageMr: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromMr: string;
  to: string;
  message: string;
  messageMr: string;
  timestamp: Date;
  isAdmin: boolean;
}

// Worker ID → Firebase telemetry path mapping
// Since there's only 1 physical ESP32, it writes to whichever Worker path is active
export const WORKER_FIREBASE_MAP: Record<string, string> = {
  'W-001': 'Worker1', // Pranshu Bobade — Red Zone
  'W-002': 'Worker2', // Sheel Gaikwad — Yellow Zone
  'W-003': 'Worker3', // Aradhya Avhad — Green Zone
};

export const ALL_WORKER_KEYS = ['Worker1', 'Worker2', 'Worker3'];

// Initial data — updated for 3 real workers + 3 assets
const initialAssets: Asset[] = [
  {
    id: 'SMC-MH-001', name: 'Manhole - Hotgi Road Industrial', nameMr: 'मॅनहोल - होतगी रोड औद्योगिक',
    location: 'Hotgi Road Industrial Area', locationMr: 'होतगी रोड औद्योगिक क्षेत्र',
    lat: 17.6599, lng: 75.9064, zone: 'red', zoneType: 'Industrial (High Risk)', zoneTypeMr: 'औद्योगिक (उच्च जोखीम)',
    riskLevel: 'high', sensors: { h2s: 0, ch4: 0, co: 0, o2: 98, temp: 0, battery: 100, humidity: 0, waterDepth: 0, mpu6050Fallback: false },
    assignedWorker: 'W-001', approvalStatus: 'pending', taskRoute: 'machine', machineRequired: true,
    history: []
  },
  {
    id: 'SMC-MH-002', name: 'Manhole - Mangalwarpet Commercial', nameMr: 'मॅनहोल - मंगळवारपेठ व्यापारी',
    location: 'Mangalwarpet', locationMr: 'मंगळवारपेठ',
    lat: 17.6450, lng: 75.9200, zone: 'red', zoneType: 'Chemical', zoneTypeMr: 'रासायनिक',
    riskLevel: 'high', sensors: { h2s: 22, ch4: 4.1, co: 35, o2: 17.2, temp: 36, battery: 74, humidity: 82, waterDepth: 2.5, mpu6050Fallback: false },
    assignedWorker: null, approvalStatus: 'pending', taskRoute: 'machine', machineRequired: true,
    history: []
  },
  {
    id: 'SMC-MH-003', name: 'Manhole - Shivajinagar Industrial', nameMr: 'मॅनहोल - शिवाजीनगर औद्योगिक',
    location: 'Shivajinagar', locationMr: 'शिवाजीनगर',
    lat: 17.6720, lng: 75.9120, zone: 'red', zoneType: 'Chemical / Industrial', zoneTypeMr: 'रासायनिक / औद्योगिक',
    riskLevel: 'high', sensors: { h2s: 16, ch4: 2.8, co: 22, o2: 18.0, temp: 33, battery: 88, humidity: 75, waterDepth: 1.5, mpu6050Fallback: false },
    assignedWorker: null, approvalStatus: 'pending', taskRoute: 'machine', machineRequired: true,
    history: []
  },
  {
    id: 'SMC-MH-004', name: 'Manhole - Akkalkot Road Commercial', nameMr: 'मॅनहोल - अक्कलकोट रोड व्यापारी',
    location: 'Akkalkot Road', locationMr: 'अक्कलकोट रोड',
    lat: 17.6550, lng: 75.9300, zone: 'yellow', zoneType: 'Commercial', zoneTypeMr: 'व्यापारी',
    riskLevel: 'medium', sensors: { h2s: 0, ch4: 0, co: 0, o2: 98, temp: 0, battery: 100, humidity: 0, waterDepth: 0, mpu6050Fallback: false },
    assignedWorker: 'W-002', approvalStatus: 'pending', taskRoute: 'pending', machineRequired: false,
    history: []
  },
  {
    id: 'SMC-MH-005', name: 'Manhole - Laxmi Nagar', nameMr: 'मॅनहोल - लक्ष्मी नगर',
    location: 'Laxmi Nagar', locationMr: 'लक्ष्मी नगर',
    lat: 17.6780, lng: 75.9050, zone: 'yellow', zoneType: 'Commercial', zoneTypeMr: 'व्यापारी',
    riskLevel: 'medium', sensors: { h2s: 7, ch4: 1.3, co: 11, o2: 19.9, temp: 29, battery: 92, humidity: 60, waterDepth: 0.5, mpu6050Fallback: false },
    assignedWorker: null, approvalStatus: 'approved', taskRoute: 'manual', machineRequired: false,
    history: []
  },
  {
    id: 'SMC-MH-006', name: 'Manhole - Siddheshwar Peth Residential', nameMr: 'मॅनहोल - सिद्धेश्वर पेठ निवासी',
    location: 'Siddheshwar Peth', locationMr: 'सिद्धेश्वर पेठ',
    lat: 17.6650, lng: 75.8980, zone: 'green', zoneType: 'Residential', zoneTypeMr: 'निवासी',
    riskLevel: 'low', sensors: { h2s: 0, ch4: 0, co: 0, o2: 98, temp: 0, battery: 100, humidity: 0, waterDepth: 0, mpu6050Fallback: false },
    assignedWorker: 'W-003', approvalStatus: 'approved', taskRoute: 'manual', machineRequired: false,
    history: []
  },
];

const initialWorkers: Worker[] = [
  { id: 'W-001', name: 'Pranshu Bobade', nameMr: 'प्रांशू बोबडे', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'online', assignedAsset: 'SMC-MH-001', ppeComplete: false, ppeChecklist: { helmet: false, gloves: false, mask: false, suit: false, boots: false, harness: false } },
  { id: 'W-002', name: 'Sheel Gaikwad', nameMr: 'शील गायकवाड', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'online', assignedAsset: 'SMC-MH-004', ppeComplete: false, ppeChecklist: { helmet: false, gloves: false, mask: false, suit: false, boots: false, harness: false } },
  { id: 'W-003', name: 'Aradhya Avhad', nameMr: 'आराध्या अवहाड', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'online', assignedAsset: 'SMC-MH-006', ppeComplete: false, ppeChecklist: { helmet: false, gloves: false, mask: false, suit: false, boots: false, harness: false } },
];

const initialMachines: Machine[] = [
  { id: 'JET-01', type: 'jetting', typeName: 'Jetting Machine', typeNameMr: 'जेटिंग मशीन', status: 'available', assignedAsset: null, location: 'Depot A' },
  { id: 'JET-02', type: 'jetting', typeName: 'Jetting Machine', typeNameMr: 'जेटिंग मशीन', status: 'inuse', assignedAsset: 'SMC-MH-003', location: 'Mangalwar Peth' },
  { id: 'JET-03', type: 'jetting', typeName: 'Jetting Machine', typeNameMr: 'जेटिंग मशीन', status: 'maintenance', assignedAsset: null, location: 'Workshop' },
  { id: 'ROD-01', type: 'rodding', typeName: 'Rodding Machine', typeNameMr: 'रॉडिंग मशीन', status: 'available', assignedAsset: null, location: 'Depot B' },
  { id: 'ROD-02', type: 'rodding', typeName: 'Rodding Machine', typeNameMr: 'रॉडिंग मशीन', status: 'inuse', assignedAsset: 'SMC-MH-001', location: 'Hotgi Road' },
  { id: 'SLG-01', type: 'sludge', typeName: 'Sludge Machine', typeNameMr: 'स्लज मशीन', status: 'available', assignedAsset: null, location: 'Depot A' },
  { id: 'SLG-02', type: 'sludge', typeName: 'Sludge Machine', typeNameMr: 'स्लज मशीन', status: 'maintenance', assignedAsset: null, location: 'Workshop' },
  { id: 'CRW-01', type: 'crawler', typeName: 'Robotic Crawler', typeNameMr: 'रोबोटिक क्रॉलर', status: 'available', assignedAsset: null, location: 'Depot A' },
  { id: 'CRW-02', type: 'crawler', typeName: 'Robotic Crawler', typeNameMr: 'रोबोटिक क्रॉलर', status: 'inuse', assignedAsset: 'SMC-MH-002', location: 'MIDC' },
];

interface SystemContextType {
  assets: Asset[];
  workers: Worker[];
  machines: Machine[];
  eventLog: EventLog[];
  chatMessages: ChatMessage[];
  activeEmergency: string | null;
  selectedAsset: string | null;
  telemetryMap: Record<string, WorkerTelemetry>;
  setSelectedAsset: (id: string | null) => void;
  approveTask: (assetId: string) => void;
  rejectTask: (assetId: string) => void;
  holdTask: (assetId: string) => void;
  triggerSOS: (workerId: string) => void;
  clearEmergency: () => void;
  sendChat: (msg: string, msgMr: string, isAdmin: boolean) => void;
  toggleWorkerPPE: (workerId: string, item: keyof Worker['ppeChecklist']) => void;
  addTask: (assetId: string, name: string, nameMr: string) => void;
}

const SystemContext = createContext<SystemContextType>({} as SystemContextType);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeEmergency, setActiveEmergency] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [telemetryMap, setTelemetryMap] = useState<Record<string, WorkerTelemetry>>({});

  // Track which assets have live Firebase data (to prevent SOS alert duplication)
  const prevSOSRef = useRef<Record<string, boolean>>({});

  const addEvent = useCallback((event: Omit<EventLog, 'id' | 'timestamp'>) => {
    setEventLog(prev => [{
      ...event,
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    }, ...prev].slice(0, 200));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  FIREBASE REAL-TIME TELEMETRY LISTENERS
  //  Listens to telemetry/Worker1, Worker2, Worker3
  //  Updates sensor data on assets that have assigned workers
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    for (const workerKey of ALL_WORKER_KEYS) {
      // Listen to VeerProbe
      const probeRef = dbRef(`telemetry/${workerKey}/VeerProbe`);
      const unsubProbe = onValue(probeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTelemetryMap(prev => ({
            ...prev,
            [workerKey]: {
              ...prev[workerKey],
              workerKey,
              probe: {
                H2S: data.H2S ?? 0,
                CH4: data.CH4 ?? 0,
                CO: data.CO ?? 0,
                temperature: data.temperature ?? 0,
                humidity: data.humidity ?? 0,
                water_depth: data.water_depth ?? 0,
                oxygen: data.oxygen ?? 0,
                sos: data.sos ?? false,
                status: data.status ?? 'SAFE',
                timestamp: data.timestamp ?? 0,
              },
              guard: prev[workerKey]?.guard ?? null,
              isLive: true,
              lastUpdated: Date.now(),
            }
          }));
        }
      });
      unsubscribers.push(unsubProbe);

      // Listen to VeerGuard
      const guardRef = dbRef(`telemetry/${workerKey}/VeerGuard`);
      const unsubGuard = onValue(guardRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTelemetryMap(prev => ({
            ...prev,
            [workerKey]: {
              ...prev[workerKey],
              workerKey,
              probe: prev[workerKey]?.probe ?? null,
              guard: {
                H2S: data.H2S ?? 0,
                CH4: data.CH4 ?? 0,
                CO: data.CO ?? 0,
                temperature: data.temperature ?? 0,
                humidity: data.humidity ?? 0,
                water_depth: data.water_depth ?? 0,
                oxygen: data.oxygen ?? 0,
                sos: data.sos ?? false,
                fall_detected: data.fall_detected ?? false,
                no_movement: data.no_movement ?? false,
                status: data.status ?? 'SAFE',
                timestamp: data.timestamp ?? 0,
              },
              isLive: true,
              lastUpdated: Date.now(),
            }
          }));
        }
      });
      unsubscribers.push(unsubGuard);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  //  SYNC FIREBASE TELEMETRY → ASSET SENSOR DATA
  //  When Firebase data arrives for a worker, update the matching
  //  asset's sensors and risk level in real-time
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    setAssets(prevAssets => prevAssets.map(asset => {
      if (!asset.assignedWorker) return asset;

      const fbKey = WORKER_FIREBASE_MAP[asset.assignedWorker];
      if (!fbKey) return asset;

      const telemetry = telemetryMap[fbKey];
      if (!telemetry?.isLive) return asset;

      // Prefer VeerGuard data (live monitoring), fall back to VeerProbe
      const source = telemetry.guard || telemetry.probe;
      if (!source) return asset;

      // Map Firebase data → asset sensor format
      const newSensors: SensorData = {
        h2s: source.H2S,
        ch4: source.CH4,
        co: source.CO,
        o2: source.oxygen,
        temp: source.temperature,
        humidity: source.humidity,
        waterDepth: source.water_depth,
        battery: 100, // ESP32 doesn't track its own battery in current firmware
        mpu6050Fallback: telemetry.guard?.fall_detected || telemetry.guard?.no_movement || false,
      };

      // Determine risk level from ESP32's classification
      const espStatus = source.status;
      let riskLevel: RiskLevel = asset.riskLevel;
      if (espStatus === 'DANGER') riskLevel = 'high';
      else if (espStatus === 'WARNING') riskLevel = 'medium';
      else if (espStatus === 'SAFE') riskLevel = 'low';

      return { ...asset, sensors: newSensors, riskLevel };
    }));
  }, [telemetryMap]);

  // ═══════════════════════════════════════════════════════════════
  //  AUTO-DETECT SOS FROM FIREBASE
  //  If any worker's telemetry shows sos=true, trigger emergency
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    for (const workerKey of ALL_WORKER_KEYS) {
      const telemetry = telemetryMap[workerKey];
      if (!telemetry) continue;

      const sosActive = telemetry.guard?.sos || telemetry.probe?.sos;
      const prevSOS = prevSOSRef.current[workerKey];

      if (sosActive && !prevSOS) {
        // Find which worker this Firebase path belongs to
        const workerId = Object.entries(WORKER_FIREBASE_MAP).find(([_, v]) => v === workerKey)?.[0];
        if (workerId && !activeEmergency) {
          setActiveEmergency(workerId);
          setWorkers(prev => prev.map(w =>
            w.id === workerId ? { ...w, status: 'emergency' as WorkerStatus } : w
          ));
          addEvent({ type: 'sos', message: `SOS from ESP32 — ${workerId} (${workerKey})!`, messageMr: `ESP32 वरून SOS — ${workerId} (${workerKey})!`, severity: 'critical', source: workerKey });
          addEvent({ type: 'sos', message: 'Ambulance dispatched to location', messageMr: 'स्थानावर रुग्णवाहिका पाठवली', severity: 'critical', source: 'System' });
        }
      }

      prevSOSRef.current[workerKey] = !!sosActive;
    }
  }, [telemetryMap, activeEmergency, addEvent]);

  // Simulate sensor fluctuation ONLY for assets that do NOT have live Firebase data
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prev => prev.map(asset => {
        // Skip assets with live Firebase data
        if (asset.assignedWorker) {
          const fbKey = WORKER_FIREBASE_MAP[asset.assignedWorker];
          if (fbKey && telemetryMap[fbKey]?.isLive) return asset;
        }

        const fluctuate = (val: number, range: number, min: number, max: number) => {
          const delta = (Math.random() - 0.5) * range;
          return Math.round(Math.min(max, Math.max(min, val + delta)) * 10) / 10;
        };
        const baseMultiplier = asset.zone === 'red' ? 1.5 : asset.zone === 'yellow' ? 1 : 0.5;
        const newSensors: SensorData = {
          h2s: fluctuate(asset.sensors.h2s, 2 * baseMultiplier, 0, 50),
          ch4: fluctuate(asset.sensors.ch4, 0.5 * baseMultiplier, 0, 10),
          co: fluctuate(asset.sensors.co, 3 * baseMultiplier, 0, 60),
          o2: fluctuate(asset.sensors.o2, 0.3, 15, 21),
          temp: fluctuate(asset.sensors.temp, 0.5, 20, 45),
          battery: fluctuate(asset.sensors.battery, 0.2, 0, 100),
          humidity: fluctuate(asset.sensors.humidity, 2, 30, 99),
          waterDepth: fluctuate(asset.sensors.waterDepth, 0.2, 0, 5),
          mpu6050Fallback: Math.random() < 0.02,
        };

        let riskLevel: RiskLevel = asset.riskLevel;
        if (newSensors.h2s > 15 || newSensors.ch4 > 3 || newSensors.co > 25 || newSensors.o2 < 18) {
          riskLevel = 'high';
        } else if (newSensors.h2s > 5 || newSensors.ch4 > 1 || newSensors.co > 10 || newSensors.o2 < 19.5) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }

        return { ...asset, sensors: newSensors, riskLevel };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [telemetryMap]);

  // Simulate random events
  const eventCounterRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      eventCounterRef.current++;
      if (eventCounterRef.current % 3 === 0) {
        const types: EventLog['type'][] = ['sensor', 'task', 'machine', 'alert'];
        const t = types[Math.floor(Math.random() * types.length)];
        const messages: Record<string, { en: string; mr: string }> = {
          sensor: { en: 'Sensor threshold crossed on SMC-MH-001', mr: 'SMC-MH-001 वर सेन्सर मर्यादा ओलांडली' },
          task: { en: 'Task status updated for SMC-MH-004', mr: 'SMC-MH-004 कार्य स्थिती अद्यतनित' },
          machine: { en: 'JET-01 dispatched to Depot A', mr: 'JET-01 डेपो A ला पाठवले' },
          alert: { en: 'High H₂S detected at SMC-MH-002', mr: 'SMC-MH-002 येथे उच्च H₂S आढळले' },
        };
        addEvent({
          type: t,
          message: messages[t].en,
          messageMr: messages[t].mr,
          severity: t === 'alert' ? 'warning' : 'info',
          source: 'System',
        });
      }
      if (eventCounterRef.current % 5 === 0) {
        setMachines(prev => {
          const idx = Math.floor(Math.random() * prev.length);
          const statuses: MachineStatus[] = ['available', 'inuse', 'maintenance'];
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          return prev.map((m, i) => i === idx ? { ...m, status: newStatus } : m);
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [addEvent]);

  const approveTask = useCallback((assetId: string) => {
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, approvalStatus: 'approved' as ApprovalStatus } : a
    ));
    addEvent({ type: 'approval', message: `Task approved for ${assetId}`, messageMr: `${assetId} साठी कार्य मंजूर`, severity: 'info', source: 'Admin' });
  }, [addEvent]);

  const rejectTask = useCallback((assetId: string) => {
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, approvalStatus: 'rejected' as ApprovalStatus } : a
    ));
    addEvent({ type: 'approval', message: `Task rejected for ${assetId}`, messageMr: `${assetId} साठी कार्य नाकारले`, severity: 'warning', source: 'Admin' });
  }, [addEvent]);

  const holdTask = useCallback((assetId: string) => {
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, approvalStatus: 'hold' as ApprovalStatus } : a
    ));
    addEvent({ type: 'approval', message: `Task held for ${assetId}`, messageMr: `${assetId} साठी कार्य रोखले`, severity: 'info', source: 'Admin' });
  }, [addEvent]);

  const triggerSOS = useCallback((workerId: string) => {
    setActiveEmergency(workerId);
    setWorkers(prev => prev.map(w =>
      w.id === workerId ? { ...w, status: 'emergency' as WorkerStatus } : w
    ));
    addEvent({ type: 'sos', message: `SOS triggered by ${workerId}!`, messageMr: `${workerId} ने SOS दाबला!`, severity: 'critical', source: workerId });
    addEvent({ type: 'sos', message: 'Ambulance dispatched to location', messageMr: 'स्थानावर रुग्णवाहिका पाठवली', severity: 'critical', source: 'System' });
  }, [addEvent]);

  const clearEmergency = useCallback(() => {
    if (activeEmergency) {
      setWorkers(prev => prev.map(w =>
        w.id === activeEmergency ? { ...w, status: 'idle' as WorkerStatus } : w
      ));
      setActiveEmergency(null);
      addEvent({ type: 'sos', message: 'Emergency cleared', messageMr: 'आपत्कालीन स्थिती समाप्त', severity: 'info', source: 'Admin' });
    }
  }, [activeEmergency, addEvent]);

  const sendChat = useCallback((msg: string, msgMr: string, isAdmin: boolean) => {
    setChatMessages(prev => [...prev, {
      id: `MSG-${Date.now()}`,
      from: isAdmin ? 'Admin' : 'Worker',
      fromMr: isAdmin ? 'प्रशासक' : 'कर्मचारी',
      to: isAdmin ? 'Worker' : 'Admin',
      message: msg,
      messageMr: msgMr,
      timestamp: new Date(),
      isAdmin,
    }]);
  }, []);

  const toggleWorkerPPE = useCallback((workerId: string, item: keyof Worker['ppeChecklist']) => {
    setWorkers(prev => prev.map(w => {
      if (w.id !== workerId) return w;
      const newChecklist = { ...w.ppeChecklist, [item]: !w.ppeChecklist[item] };
      const allDone = Object.values(newChecklist).every(Boolean);
      return { ...w, ppeChecklist: newChecklist, ppeComplete: allDone };
    }));
  }, []);

  const addTask = useCallback((assetId: string, name: string, nameMr: string) => {
    addEvent({ type: 'task', message: `New task created: ${name} at ${assetId}`, messageMr: `नवीन कार्य तयार: ${nameMr} - ${assetId}`, severity: 'info', source: 'Admin' });
  }, [addEvent]);

  return (
    <SystemContext.Provider value={{
      assets, workers, machines, eventLog, chatMessages, activeEmergency, selectedAsset, telemetryMap,
      setSelectedAsset, approveTask, rejectTask, holdTask, triggerSOS, clearEmergency, sendChat, toggleWorkerPPE, addTask,
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => useContext(SystemContext);
