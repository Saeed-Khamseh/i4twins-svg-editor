import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';

import { DeviceSearch } from '../devices/device-search/device-search';
import { SvgCanvas } from './svg-canvas/svg-canvas';
import { SvgPropertiesPanel } from './svg-properties-panel/svg-properties-panel';
import { SvgToolbar } from './svg-toolbar/svg-toolbar';

@Component({
  selector: 'app-svg-editor',
  imports: [SvgToolbar, SvgCanvas, SvgPropertiesPanel, MatSidenavModule, DeviceSearch],
  styleUrl: './svg-editor.scss',
  template: `
    <div class="editor-layout">
      <app-svg-toolbar />

      <div class="editor-body">
        <div class="editor-canvas-wrap">
          <app-device-search class="editor-device-search" />
          <app-svg-canvas class="editor-canvas" />
        </div>
        <app-svg-properties-panel class="editor-sidebar" />
      </div>
    </div>
  `,
})
export class SvgEditor {}
