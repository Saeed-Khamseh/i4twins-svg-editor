import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import type { Device } from '../../shared/api-types';

type AppStateModel = {
  selectedDevice: Device | null;
};

export const AppState = signalStore(
  { providedIn: 'root' },
  withState<AppStateModel>({ selectedDevice: null }),
  withMethods((store) => ({
    selectDevice(device: Device) {
      patchState(store, { selectedDevice: device });
    },
    clearDevice() {
      patchState(store, { selectedDevice: null });
    },
  })),
);
