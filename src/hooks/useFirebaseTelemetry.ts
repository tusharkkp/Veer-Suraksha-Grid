/**
 * useFirebaseTelemetry — Real-time listener for ESP32 sensor data
 * 
 * Listens to telemetry/{WorkerX}/VeerProbe and VeerGuard paths
 * Returns live sensor readings as they arrive from the ESP32
 * 
 * ESP32 Data Contract (from esp.ino):
 *   VeerProbe:  H2S, CH4, CO, temperature, humidity, water_depth, oxygen, sos, status, timestamp
 *   VeerGuard:  H2S, CH4, CO, temperature, humidity, water_depth, oxygen, sos, fall_detected, no_movement, status, timestamp
 * 
 * Note: H2S/CH4/CO are raw ADC values (0-4095), NOT ppm
 * Thresholds from esp.ino: MQ2 WARN=1500 DANGER=2500 | MQ4 WARN=1200 DANGER=2200 | MQ7 WARN=1000 DANGER=2000
 */
import { useState, useEffect } from 'react';
import { dbRef, onValue } from '@/lib/firebase';

// Matches exact Firebase schema from ESP32 pushes
export interface VeerProbeData {
  H2S: number;
  CH4: number;
  CO: number;
  temperature: number;
  humidity: number;
  water_depth: number;
  oxygen: number;
  sos: boolean;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  timestamp: number;
}

export interface VeerGuardData {
  H2S: number;
  CH4: number;
  CO: number;
  temperature: number;
  humidity: number;
  water_depth: number;
  oxygen: number;
  sos: boolean;
  fall_detected: boolean;
  no_movement: boolean;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  timestamp: number;
}

export interface WorkerTelemetry {
  workerKey: string; // e.g. "Worker1"
  probe: VeerProbeData | null;
  guard: VeerGuardData | null;
  isLive: boolean; // true if data has been received at least once
  lastUpdated: number; // local timestamp of last Firebase update
}

const DEFAULT_PROBE: VeerProbeData = {
  H2S: 0, CH4: 0, CO: 0,
  temperature: 0, humidity: 0, water_depth: 0,
  oxygen: 0, sos: false, status: 'SAFE', timestamp: 0
};

const DEFAULT_GUARD: VeerGuardData = {
  H2S: 0, CH4: 0, CO: 0,
  temperature: 0, humidity: 0, water_depth: 0,
  oxygen: 0, sos: false, fall_detected: false, no_movement: false,
  status: 'SAFE', timestamp: 0
};

/**
 * Listen to a single worker's telemetry data in real-time
 */
export function useWorkerTelemetry(workerKey: string): WorkerTelemetry {
  const [probe, setProbe] = useState<VeerProbeData | null>(null);
  const [guard, setGuard] = useState<VeerGuardData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    if (!workerKey) return;

    // Listen to VeerProbe
    const probeRef = dbRef(`telemetry/${workerKey}/VeerProbe`);
    const unsubProbe = onValue(probeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProbe({
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
        });
        setIsLive(true);
        setLastUpdated(Date.now());
      }
    }, (error) => {
      console.error(`[Firebase] Error listening to ${workerKey}/VeerProbe:`, error);
    });

    // Listen to VeerGuard
    const guardRef = dbRef(`telemetry/${workerKey}/VeerGuard`);
    const unsubGuard = onValue(guardRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGuard({
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
        });
        setIsLive(true);
        setLastUpdated(Date.now());
      }
    }, (error) => {
      console.error(`[Firebase] Error listening to ${workerKey}/VeerGuard:`, error);
    });

    return () => {
      unsubProbe();
      unsubGuard();
    };
  }, [workerKey]);

  return { workerKey, probe, guard, isLive, lastUpdated };
}

/**
 * Listen to ALL workers' telemetry data simultaneously
 * Returns a map of workerKey -> WorkerTelemetry
 */
export function useAllWorkersTelemetry(workerKeys: string[]): Record<string, WorkerTelemetry> {
  const [telemetryMap, setTelemetryMap] = useState<Record<string, WorkerTelemetry>>({});

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    for (const workerKey of workerKeys) {
      // VeerProbe listener
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

      // VeerGuard listener
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
  }, [workerKeys.join(',')]);

  return telemetryMap;
}

/**
 * ESP32 ADC threshold helpers — match the firmware thresholds exactly
 * These classify raw ADC readings into SAFE/WARNING/DANGER
 */
export const ESP32_THRESHOLDS = {
  MQ2: { warn: 1500, danger: 2500 },  // H2S
  MQ4: { warn: 1200, danger: 2200 },  // CH4
  MQ7: { warn: 1000, danger: 2000 },  // CO
  TEMP: { warn: 38, danger: 45 },
  HUMIDITY: { warn: 85, danger: 95 },
  WATER_DEPTH: { warn: 60, danger: 30 }, // inverted — lower = more danger (cm)
  OXYGEN: { warn: 95, danger: 90 },      // inverted — lower = more danger (SpO2 %)
};

export function getStatusColor(status: string): 'green' | 'yellow' | 'red' {
  switch (status) {
    case 'SAFE': return 'green';
    case 'WARNING': return 'yellow';
    case 'DANGER': return 'red';
    default: return 'green';
  }
}

export function getSensorDangerLevel(sensorName: string, value: number): 'safe' | 'warning' | 'danger' {
  const t = ESP32_THRESHOLDS;
  switch (sensorName) {
    case 'H2S':
      return value >= t.MQ2.danger ? 'danger' : value >= t.MQ2.warn ? 'warning' : 'safe';
    case 'CH4':
      return value >= t.MQ4.danger ? 'danger' : value >= t.MQ4.warn ? 'warning' : 'safe';
    case 'CO':
      return value >= t.MQ7.danger ? 'danger' : value >= t.MQ7.warn ? 'warning' : 'safe';
    case 'temperature':
      return value >= t.TEMP.danger ? 'danger' : value >= t.TEMP.warn ? 'warning' : 'safe';
    case 'humidity':
      return value >= t.HUMIDITY.danger ? 'danger' : value >= t.HUMIDITY.warn ? 'warning' : 'safe';
    case 'water_depth':
      return value <= t.WATER_DEPTH.danger ? 'danger' : value <= t.WATER_DEPTH.warn ? 'warning' : 'safe';
    case 'oxygen':
      return value <= t.OXYGEN.danger ? 'danger' : value <= t.OXYGEN.warn ? 'warning' : 'safe';
    default:
      return 'safe';
  }
}
