export type DeviceStatus = 'running' | 'stopped' | 'fault' | 'unknown';

export type DeviceRuntimeStatus = 'running' | 'stopped' | 'fault';

export interface Device {
  id: string;
  code: string;
  name: string | null;
  type: string;
  area: string;
  status: DeviceStatus;
  lastSeen: string | null;
  vendor: string;
}

export type DeviceStatusMap = Record<string, DeviceRuntimeStatus | null>;

/** Raw row shape as stored in devices.json (before normalization). */
export interface RawDeviceRecord {
  id: string;
  code: string;
  name?: string | null;
  type: string;
  area: string;
  status?: string | null;
  lastSeen?: string | null;
  vendor?: string;
}
