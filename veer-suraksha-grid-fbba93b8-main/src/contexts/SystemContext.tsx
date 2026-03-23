import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// Types
export interface SensorData {
  h2s: number;
  ch4: number;
  co: number;
  o2: number;
  temp: number;
  battery: number;
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

// Initial data
const initialAssets: Asset[] = [
  {
    id: 'SMC-MH-001', name: 'Manhole - Hotgi Road Industrial', nameMr: 'मॅनहोल - होतगी रोड औद्योगिक',
    location: 'Hotgi Road Industrial Area', locationMr: 'होतगी रोड औद्योगिक क्षेत्र',
    lat: 17.6599, lng: 75.9064, zone: 'red', zoneType: 'Industrial', zoneTypeMr: 'औद्योगिक',
    riskLevel: 'high', sensors: { h2s: 18, ch4: 3.2, co: 28, o2: 18.5, temp: 34, battery: 82 },
    assignedWorker: 'W-003', approvalStatus: 'pending', taskRoute: 'machine', machineRequired: true,
    history: []
  },
  {
    id: 'SMC-MH-002', name: 'Manhole - MIDC Chemical Zone', nameMr: 'मॅनहोल - MIDC रासायनिक क्षेत्र',
    location: 'MIDC Phase II', locationMr: 'MIDC फेज II',
    lat: 17.6450, lng: 75.9200, zone: 'red', zoneType: 'Chemical', zoneTypeMr: 'रासायनिक',
    riskLevel: 'high', sensors: { h2s: 22, ch4: 4.1, co: 35, o2: 17.2, temp: 36, battery: 74 },
    assignedWorker: 'W-005', approvalStatus: 'pending', taskRoute: 'machine', machineRequired: true,
    history: []
  },
  {
    id: 'SMC-MH-003', name: 'Manhole - Main Market Road', nameMr: 'मॅनहोल - मुख्य बाजार रस्ता',
    location: 'Main Market, Mangalwar Peth', locationMr: 'मुख्य बाजार, मंगळवार पेठ',
    lat: 17.6720, lng: 75.9120, zone: 'yellow', zoneType: 'Commercial', zoneTypeMr: 'व्यापारी',
    riskLevel: 'medium', sensors: { h2s: 8, ch4: 1.5, co: 12, o2: 19.8, temp: 31, battery: 91 },
    assignedWorker: 'W-001', approvalStatus: 'approved', taskRoute: 'machine', machineRequired: false,
    history: []
  },
  {
    id: 'SMC-MH-004', name: 'Manhole - Akkalkot Road Mixed', nameMr: 'मॅनहोल - अक्कलकोट रोड मिश्र',
    location: 'Akkalkot Road Mixed Use', locationMr: 'अक्कलकोट रोड मिश्र वापर',
    lat: 17.6550, lng: 75.9300, zone: 'yellow', zoneType: 'Mixed-use', zoneTypeMr: 'मिश्र-वापर',
    riskLevel: 'medium', sensors: { h2s: 6, ch4: 1.1, co: 9, o2: 20.1, temp: 30, battery: 88 },
    assignedWorker: 'W-007', approvalStatus: 'pending', taskRoute: 'pending', machineRequired: false,
    history: []
  },
  {
    id: 'SMC-MH-005', name: 'Manhole - Siddheshwar Peth Residential', nameMr: 'मॅनहोल - सिद्धेश्वर पेठ निवासी',
    location: 'Siddheshwar Peth', locationMr: 'सिद्धेश्वर पेठ',
    lat: 17.6780, lng: 75.9050, zone: 'green', zoneType: 'Residential', zoneTypeMr: 'निवासी',
    riskLevel: 'low', sensors: { h2s: 2, ch4: 0.3, co: 3, o2: 20.8, temp: 28, battery: 95 },
    assignedWorker: 'W-002', approvalStatus: 'approved', taskRoute: 'manual', machineRequired: false,
    history: []
  },
  {
    id: 'SMC-MH-006', name: 'Manhole - Kumatha Naka Residential', nameMr: 'मॅनहोल - कुमठा नाका निवासी',
    location: 'Kumatha Naka', locationMr: 'कुमठा नाका',
    lat: 17.6650, lng: 75.8980, zone: 'green', zoneType: 'Residential', zoneTypeMr: 'निवासी',
    riskLevel: 'low', sensors: { h2s: 1.5, ch4: 0.2, co: 2, o2: 20.9, temp: 27, battery: 97 },
    assignedWorker: null, approvalStatus: 'approved', taskRoute: 'manual', machineRequired: false,
    history: []
  },
];

const initialWorkers: Worker[] = [
  { id: 'W-001', name: 'Ramesh Jadhav', nameMr: 'रमेश जाधव', status: 'active', currentTask: 'Cleaning MH-003', currentTaskMr: 'MH-003 सफाई', deviceStatus: 'online', assignedAsset: 'SMC-MH-003', ppeComplete: true, ppeChecklist: { helmet: true, gloves: true, mask: true, suit: true, boots: true, harness: true } },
  { id: 'W-002', name: 'Sunil Kamble', nameMr: 'सुनील कांबळे', status: 'active', currentTask: 'Inspection MH-005', currentTaskMr: 'MH-005 तपासणी', deviceStatus: 'online', assignedAsset: 'SMC-MH-005', ppeComplete: true, ppeChecklist: { helmet: true, gloves: true, mask: true, suit: true, boots: true, harness: false } },
  { id: 'W-003', name: 'Prakash Gaikwad', nameMr: 'प्रकाश गायकवाड', status: 'idle', currentTask: 'Awaiting approval MH-001', currentTaskMr: 'MH-001 मंजुरी प्रतीक्षा', deviceStatus: 'online', assignedAsset: 'SMC-MH-001', ppeComplete: false, ppeChecklist: { helmet: true, gloves: true, mask: false, suit: false, boots: true, harness: false } },
  { id: 'W-004', name: 'Vijay More', nameMr: 'विजय मोरे', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'online', assignedAsset: null, ppeComplete: false, ppeChecklist: { helmet: false, gloves: false, mask: false, suit: false, boots: false, harness: false } },
  { id: 'W-005', name: 'Santosh Pawar', nameMr: 'संतोष पवार', status: 'active', currentTask: 'Monitoring MH-002', currentTaskMr: 'MH-002 निगराणी', deviceStatus: 'low_battery', assignedAsset: 'SMC-MH-002', ppeComplete: true, ppeChecklist: { helmet: true, gloves: true, mask: true, suit: true, boots: true, harness: true } },
  { id: 'W-006', name: 'Anil Shinde', nameMr: 'अनिल शिंदे', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'offline', assignedAsset: null, ppeComplete: false, ppeChecklist: { helmet: false, gloves: false, mask: false, suit: false, boots: false, harness: false } },
  { id: 'W-007', name: 'Manoj Bhosale', nameMr: 'मनोज भोसले', status: 'active', currentTask: 'Pre-inspection MH-004', currentTaskMr: 'MH-004 पूर्व-तपासणी', deviceStatus: 'online', assignedAsset: 'SMC-MH-004', ppeComplete: true, ppeChecklist: { helmet: true, gloves: true, mask: true, suit: true, boots: true, harness: true } },
  { id: 'W-008', name: 'Deepak Mane', nameMr: 'दीपक माने', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'online', assignedAsset: null, ppeComplete: false, ppeChecklist: { helmet: true, gloves: true, mask: false, suit: false, boots: true, harness: false } },
  { id: 'W-009', name: 'Rajesh Salunkhe', nameMr: 'राजेश साळुंखे', status: 'active', currentTask: 'Route patrol', currentTaskMr: 'मार्ग गस्त', deviceStatus: 'online', assignedAsset: null, ppeComplete: true, ppeChecklist: { helmet: true, gloves: true, mask: true, suit: true, boots: true, harness: false } },
  { id: 'W-010', name: 'Sachin Kale', nameMr: 'सचिन काळे', status: 'idle', currentTask: null, currentTaskMr: null, deviceStatus: 'online', assignedAsset: null, ppeComplete: false, ppeChecklist: { helmet: false, gloves: true, mask: false, suit: false, boots: true, harness: false } },
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
  setSelectedAsset: (id: string | null) => void;
  approveTask: (assetId: string) => void;
  rejectTask: (assetId: string) => void;
  holdTask: (assetId: string) => void;
  triggerSOS: (workerId: string) => void;
  clearEmergency: () => void;
  sendChat: (msg: string, msgMr: string, isAdmin: boolean) => void;
  toggleWorkerPPE: (workerId: string, item: keyof Worker['ppeChecklist']) => void;
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

  const addEvent = useCallback((event: Omit<EventLog, 'id' | 'timestamp'>) => {
    setEventLog(prev => [{
      ...event,
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    }, ...prev].slice(0, 200));
  }, []);

  // Simulate sensor fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prev => prev.map(asset => {
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
        };

        // Determine dynamic risk
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
  }, []);

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
      // Random machine status change
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

  return (
    <SystemContext.Provider value={{
      assets, workers, machines, eventLog, chatMessages, activeEmergency, selectedAsset,
      setSelectedAsset, approveTask, rejectTask, holdTask, triggerSOS, clearEmergency, sendChat, toggleWorkerPPE,
    }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => useContext(SystemContext);
