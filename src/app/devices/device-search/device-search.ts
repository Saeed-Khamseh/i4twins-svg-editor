import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  of,
  switchMap,
} from 'rxjs';

import type { Device } from '../../../../shared/api-types';

import { AppState } from '../../app.state';
import { DeviceApiService } from '../device-api.service';

const MAX_RECENT = 5;

@Component({
  selector: 'app-device-search',
  imports: [
    ReactiveFormsModule,
    OverlayModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  styleUrl: './device-search.scss',
  templateUrl: './device-search.html',
})
export class DeviceSearch {
  protected readonly queryControl = new FormControl<string | Device>('', {
    nonNullable: true,
  });
  protected readonly results = signal<Device[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly queryText = signal('');
  protected readonly inputFocused = signal(false);
  protected readonly recents = signal<Device[]>([]);

  protected readonly selectedDevice = inject(AppState).selectedDevice;

  protected readonly hasQuery = computed(() => this.queryText().length > 0);

  protected readonly showRecents = computed(
    () =>
      this.inputFocused() &&
      !this.hasQuery() &&
      this.selectedDevice() === null &&
      this.recents().length > 0,
  );

  private readonly devices = inject(DeviceApiService);
  private readonly appState = inject(AppState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  private readonly searchOrigin = viewChild.required('searchOrigin', { read: ElementRef });
  private readonly recentsTemplate = viewChild.required<TemplateRef<unknown>>('recentsTemplate');

  private overlayRef: OverlayRef | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.overlayRef?.dispose();
      this.overlayRef = null;
    });

    this.queryControl.valueChanges
      .pipe(
        map((value) => this.toQueryText(value)),
        map((query) => {
          this.queryText.set(query);
          this.error.set(false);

          if (!query) {
            this.results.set([]);
            this.loading.set(false);
          }

          this.syncRecentsOverlay();
          return query;
        }),
        debounceTime(300),
        distinctUntilChanged(),
        filter((query) => query.length > 0 && this.selectedDevice() === null),
        switchMap((query) => {
          this.loading.set(true);
          return this.devices.search(query).pipe(
            catchError(() => {
              this.error.set(true);
              return of([] as Device[]);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((devices) => {
        if (this.selectedDevice() !== null) {
          return;
        }

        this.results.set(devices);
      });
  }

  protected displayDevice = (device: Device | string | null): string => {
    if (!device || typeof device === 'string') {
      return device ?? '';
    }

    return `${device.code} — ${this.displayName(device)}`;
  };

  protected displayName(device: Device): string {
    const name = device.name?.trim();
    return name && name.length > 0 ? name : device.id;
  }

  protected chipLabel(device: Device): string {
    return device.code;
  }

  protected onInputFocus(): void {
    this.inputFocused.set(true);
    this.syncRecentsOverlay();
  }

  protected onInputBlur(): void {
    this.inputFocused.set(false);
    this.syncRecentsOverlay();
  }

  protected keepInputFocus(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onDeviceSelected(device: Device): void {
    this.selectDevice(device);
  }

  protected selectRecent(device: Device): void {
    this.selectDevice(device);
    this.inputFocused.set(false);
    this.syncRecentsOverlay();
  }

  protected removeRecent(device: Device): void {
    const key = normalizeDeviceId(device.id);
    this.recents.update((entries) =>
      entries.filter((entry) => normalizeDeviceId(entry.id) !== key),
    );
    this.syncRecentsOverlay();
  }

  protected clearSelection(): void {
    this.appState.clearDevice();
    this.results.set([]);
    this.queryText.set('');
    this.error.set(false);
    this.loading.set(false);
    this.queryControl.setValue('', { emitEvent: false });
    this.inputFocused.set(true);
    this.syncRecentsOverlay();
    afterNextRender(
      () => {
        this.searchInput().nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  private selectDevice(device: Device): void {
    this.addRecent(device);
    this.appState.selectDevice(device);
    this.queryControl.setValue(this.displayDevice(device), { emitEvent: false });
    this.queryText.set('');
    this.results.set([]);
    this.loading.set(false);
    this.error.set(false);
    this.syncRecentsOverlay();
  }

  private addRecent(device: Device): void {
    const key = normalizeDeviceId(device.id);
    const next = [
      device,
      ...this.recents().filter((entry) => normalizeDeviceId(entry.id) !== key),
    ].slice(0, MAX_RECENT);

    this.recents.set(next);
  }

  private toQueryText(value: string | Device): string {
    return (typeof value === 'string' ? value : this.displayDevice(value)).trim();
  }

  private syncRecentsOverlay(): void {
    if (this.showRecents()) {
      this.openRecentsOverlay();
      return;
    }

    this.closeRecentsOverlay();
  }

  private openRecentsOverlay(): void {
    const originRef = this.searchOrigin();
    const template = this.recentsTemplate();
    const origin = originRef?.nativeElement as HTMLElement | undefined;

    if (!origin || !template) {
      return;
    }

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(origin)
          .withFlexibleDimensions(false)
          .withPush(false)
          .withPositions([
            {
              originX: 'start',
              originY: 'bottom',
              overlayX: 'start',
              overlayY: 'top',
              offsetY: 6,
            },
            {
              originX: 'start',
              originY: 'top',
              overlayX: 'start',
              overlayY: 'bottom',
              offsetY: -6,
            },
          ]),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        hasBackdrop: false,
        panelClass: 'device-search-recents-pane',
      });
    }

    this.overlayRef.updateSize({ width: origin.getBoundingClientRect().width });

    if (!this.overlayRef.hasAttached()) {
      this.overlayRef.attach(new TemplatePortal(template, this.viewContainerRef));
    }
  }

  private closeRecentsOverlay(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
  }
}

function normalizeDeviceId(id: string): string {
  return id.trim().toUpperCase();
}
