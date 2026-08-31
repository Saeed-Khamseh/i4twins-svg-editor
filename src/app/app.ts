import { Component, DestroyRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { combineLatest, pairwise, startWith } from 'rxjs';

import type { Device } from '../../shared/api-types';

import { AppState } from './app.state';
import { SvgEditor } from './svg-editor/svg-editor';
import { SvgDocumentService } from './svg-editor/svg-document.service';

interface HighlightContext {
  readonly device: Device | null;
  readonly svgRoot: SVGSVGElement | null;
  readonly editor: SvgEditor | undefined;
}

@Component({
  imports: [SvgEditor],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: '<app-svg-editor #editor />',
})
export class App {
  private readonly appState = inject(AppState);
  private readonly document = inject(SvgDocumentService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editor = viewChild.required<SvgEditor>('editor');

  constructor() {
    combineLatest({
      device: toObservable(this.appState.selectedDevice),
      svgRoot: toObservable(this.document.svgRoot),
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
  }
}
