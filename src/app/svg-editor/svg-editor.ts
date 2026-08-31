import { AfterViewInit, Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';

import { SvgCanvas } from './svg-canvas/svg-canvas';
import { SvgPropertiesPanel } from './svg-properties-panel/svg-properties-panel';
import { SvgDocumentService } from './svg-document.service';
import { SvgToolbar } from './svg-toolbar/svg-toolbar';

@Component({
  selector: 'app-svg-editor',
  imports: [SvgToolbar, SvgCanvas, SvgPropertiesPanel, MatSidenavModule],
  styleUrl: './svg-editor.scss',
  template: `
    <div class="editor-layout">
      <app-svg-toolbar />

      <div class="editor-body">
        <app-svg-canvas class="editor-canvas" />
        <app-svg-properties-panel class="editor-sidebar" />
      </div>
    </div>
  `,
})
export class SvgEditor {}
