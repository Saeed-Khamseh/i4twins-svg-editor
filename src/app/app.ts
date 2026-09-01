import { Component, DestroyRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest, pairwise, startWith } from 'rxjs';

import type { Device, DeviceStatus } from '../../shared/api-types';

import { AppState } from './app.state';
import { SvgEditor } from './svg-editor/svg-editor';

interface HighlightContext {
  readonly device: Device | null;
  readonly svgRoot: SVGSVGElement | null;
  readonly editor: SvgEditor | undefined;
}

interface StatusContext {
  readonly previewMode: boolean;
  readonly deviceStatuses: Record<string, DeviceStatus | null>;
  readonly referencedDeviceIds: readonly string[];
  readonly svgRoot: SVGSVGElement | null;
  readonly editor: SvgEditor | undefined;
}

const STATUS_CLASSES: Record<DeviceStatus, string> = {
  running: 'svg-device-status-running',
  stopped: 'svg-device-status-stopped',
  fault: 'svg-device-status-fault',
};

@Component({
  imports: [SvgEditor],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: '<app-svg-editor #editor />',
})
export class App {
  private readonly appState = inject(AppState);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editor = viewChild.required<SvgEditor>('editor');

  constructor() {
    combineLatest({
      device: toObservable(this.appState.selectedDevice),
      svgRoot: toObservable(this.appState.svgRoot),
      editor: toObservable(this.editor),
    })
      .pipe(
        startWith<HighlightContext>({ device: null, svgRoot: null, editor: undefined }),
        pairwise(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([previous, current]) => {
        const editor = current.editor;
        if (!editor) {
          return;
        }

        void current.svgRoot;

        if (previous.device?.id) {
          editor.setCssClass({ 'data-device-id': previous.device.id }, []);
        }

        if (!current.device) {
          return;
        }

        const found = editor.setCssClass(
          { 'data-device-id': current.device.id },
          ['svg-device-highlight'],
        );

        if (!found) {
          this.snackBar.open('Not on this drawing.', 'Dismiss', {
            duration: 4000,
          });
        }
      });

    combineLatest({
      previewMode: toObservable(this.appState.previewMode),
      deviceStatuses: toObservable(this.appState.deviceStatuses),
      referencedDeviceIds: toObservable(this.appState.referencedDeviceIds),
      svgRoot: toObservable(this.appState.svgRoot),
      editor: toObservable(this.editor),
    })
      .pipe(
        startWith<StatusContext>({
          previewMode: false,
          deviceStatuses: {},
          referencedDeviceIds: [],
          svgRoot: null,
          editor: undefined,
        }),
        pairwise(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([previous, current]) => {
        const editor = current.editor;
        if (!editor) {
          return;
        }

        void current.svgRoot;

        const allIds = new Set([
          ...previous.referencedDeviceIds,
          ...current.referencedDeviceIds,
        ]);

        for (const id of allIds) {
          if (!current.previewMode || !current.referencedDeviceIds.includes(id)) {
            editor.setCssClass({ 'data-device-id': id }, []);
            continue;
          }

          const status = current.deviceStatuses[id] ?? null;
          editor.setCssClass(
            { 'data-device-id': id },
            status ? [STATUS_CLASSES[status]] : [],
          );
        }
      });
  }
}
