import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

import { SvgDocumentService } from '../svg-document.service';
import { AppState } from '../../app.state';

@Component({
  selector: 'app-svg-toolbar',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  styleUrl: './svg-toolbar.scss',
  templateUrl: './svg-toolbar.html',
})
export class SvgToolbar {
  protected readonly document = inject(SvgDocumentService);
  protected readonly appState = inject(AppState);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    try {
      await this.document.loadFromFile(file);
    } catch {
      this.snackBar.open('Could not load the selected SVG file.', 'Dismiss', {
        duration: 4000,
      });
    }
  }

  protected exportSvg(): void {
    if (!this.document.svgRoot()) {
      return;
    }

    this.document.downloadSvg();
    this.snackBar.open('SVG exported.', 'Dismiss', { duration: 2500 });
  }
}
