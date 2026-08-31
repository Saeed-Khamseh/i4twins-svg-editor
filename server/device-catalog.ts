import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Device, DeviceStatus, DeviceStatusMap, RawDeviceRecord } from '../shared/api-types.js';

const KNOWN_STATUSES = new Set<DeviceStatus>(['running', 'stopped', 'fault']);
const SEARCH_LIMIT = 20;

const __dirname = dirname(fileURLToPath(import.meta.url));
const devicesPath = join(__dirname, '../public/data/devices.json');

function normalizeStatus(raw: string | null | undefined): DeviceStatus {
  if (raw == null || raw.trim() === '') {
    return 'unknown';
  }

  const normalized = raw.trim().toLowerCase();
  return KNOWN_STATUSES.has(normalized as DeviceStatus) ? (normalized as DeviceStatus) : 'unknown';
}

function normalizeLastSeen(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim() === '' || raw.trim().toLowerCase() === 'n/a') {
    return null;
  }

  return raw.trim();
}

function normalizeDevice(raw: RawDeviceRecord): Device {
  const name = raw.name?.trim() ?? '';
  return {
    id: raw.id.trim(),
    code: raw.code.trim(),
    name: name.length > 0 ? name : null,
    type: raw.type.trim(),
    area: raw.area.trim(),
    status: normalizeStatus(raw.status),
    lastSeen: normalizeLastSeen(raw.lastSeen),
    vendor: raw.vendor?.trim() ?? '—',
  };
}

function searchScore(device: Device, term: string): number {
  const id = device.id.toLowerCase();
  const code = device.code.toLowerCase();
  const name = (device.name ?? '').toLowerCase();

  if (id.startsWith(term) || code.startsWith(term)) {
    return 0;
  }

  if (name.startsWith(term)) {
    return 1;
  }

  return 2;
}

export class DeviceCatalog {
  private readonly index = new Map<string, Device>();

  constructor(records: RawDeviceRecord[]) {
    for (const raw of records) {
      if (!raw.id?.trim()) {
        continue;
      }

      const key = raw.id.trim().toUpperCase();
      this.index.set(key, normalizeDevice(raw));
    }
  }

  static loadFromFile(path = devicesPath): DeviceCatalog {
    const contents = readFileSync(path, 'utf8');
    const records = JSON.parse(contents) as RawDeviceRecord[];
    return new DeviceCatalog(records);
  }

  search(query: string): Device[] {
    const term = query.trim().toLowerCase();
    if (!term) {
      return [];
    }

    return [...this.index.values()]
      .filter(
        (device) =>
          device.id.toLowerCase().includes(term) ||
          (device.name ?? '').toLowerCase().includes(term) ||
          device.code.toLowerCase().includes(term),
      )
      .sort((left, right) => {
        const scoreDiff = searchScore(left, term) - searchScore(right, term);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        return left.code.localeCompare(right.code);
      })
      .slice(0, SEARCH_LIMIT);
  }

  statusMap(): DeviceStatusMap {
    return Object.fromEntries([...this.index.values()].map((device) => [device.id, device.status]));
  }
}
