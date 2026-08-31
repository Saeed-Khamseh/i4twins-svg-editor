import { Component } from '@angular/core';

import { SvgEditor } from './svg-editor/svg-editor';

@Component({
  imports: [SvgEditor],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: '<app-svg-editor />',
})
export class App {}
