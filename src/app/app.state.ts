import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, delay, of, pipe, switchMap, tap } from 'rxjs';

import type { Device, DeviceStatusMap } from '../../shared/api-types';

import { DeviceApiService } from './devices/device-api.service';

const DEVICE_ID_ATTR = 'data-device-id';
const POLL_INTERVAL_MS = 5000;

type AppStateModel = {
  selectedDevice: Device | null;
  previewMode: boolean;
  svgRoot: SVGSVGElement | null;
  _statusMap: DeviceStatusMap;
};

type PollContext = {
  readonly preview: boolean;
  readonly ids: readonly string[];
};

export const AppState = signalStore(
  { providedIn: 'root' },
  withState<AppStateModel>({
    selectedDevice: null,
    previewMode: false,
    svgRoot: null,
    _statusMap: {},
  }),
  withComputed((store) => ({
    referencedDeviceIds: computed(() => {
      const root = store.svgRoot();
      return root ? scanReferencedDeviceIds(root) : [];
    }),
    deviceStatuses: computed(() => store._statusMap()),
  })),
  withMethods((store) => ({
    selectDevice(device: Device) {
      patchState(store, { selectedDevice: device });
    },
    clearDevice() {
      patchState(store, { selectedDevice: null });
    },
    setSvg(root: SVGSVGElement | null) {
      if (store.svgRoot() === root) {
        return;
      }

      patchState(store, { svgRoot: root, _statusMap: {} });
    },
    setPreviewMode(enabled: boolean) {
      patchState(store, {
        previewMode: enabled,
        ...(enabled ? {} : { _statusMap: {} }),
      });
    },
  })),
  withHooks({
    onInit(store) {
      const deviceApi = inject(DeviceApiService);

      const refreshStatuses = rxMethod<PollContext>(
        pipe(
          switchMap(({ preview, ids }) => {
            if (!preview || ids.length === 0) {
              return EMPTY;
            }

            return pollStatuses(deviceApi, ids, (statusMap) => {
              patchState(store, { _statusMap: statusMap });
            });
          }),
        ),
      );

      effect(() => {
        refreshStatuses({
          preview: store.previewMode(),
          ids: store.referencedDeviceIds(),
        });
      });
    },
  }),
);

function pollStatuses(
  deviceApi: DeviceApiService,
  ids: readonly string[],
  onResult: (statusMap: DeviceStatusMap) => void,
): Observable<DeviceStatusMap> {
  return deviceApi.getStatuses(ids).pipe(
    catchError(() => of({} as DeviceStatusMap)),
    tap(onResult),
    delay(POLL_INTERVAL_MS),
    switchMap(() => pollStatuses(deviceApi, ids, onResult)),
  );
}

function scanReferencedDeviceIds(root: SVGSVGElement): readonly string[] {
  const ids = new Set<string>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node = walker.currentNode as Element | null;
  while (node) {
    const deviceId = node.getAttribute(DEVICE_ID_ATTR)?.trim();
    if (deviceId) {
      ids.add(deviceId.toUpperCase());
    }

    node = walker.nextNode() as Element | null;
  }

  return [...ids];
}
