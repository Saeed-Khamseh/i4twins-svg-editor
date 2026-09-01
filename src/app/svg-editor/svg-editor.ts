import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';

import { DeviceSearch } from '../devices/device-search/device-search';
import { AppState } from '../app.state';
import { isSelectableElement } from './models/attr-schema';
import { clientToSvgPoint, isDraggableElement } from './models/element-position';
import { SvgDocumentService } from './svg-document.service';
import { SvgPropertiesPanel } from './svg-properties-panel/svg-properties-panel';
import { SvgToolbar } from './svg-toolbar/svg-toolbar';

interface DragState {
  readonly pointerId: number;
  lastSvgPoint: { x: number; y: number };
  didDrag: boolean;
}

@Component({
  selector: 'app-svg-editor',
  imports: [SvgToolbar, SvgPropertiesPanel, MatSidenavModule, DeviceSearch],
  styleUrl: './svg-editor.scss',
  template: `
    <div class="editor-layout" [class.editor-preview]="appState.previewMode()">
      <app-svg-toolbar />

      <div class="editor-body">
        <div class="editor-canvas-wrap">
          @if (!appState.previewMode()) {
            <app-device-search class="editor-device-search" />
          }

          <div
            class="canvas-shell editor-canvas"
            [class.is-dragging]="isDragging()"
            role="application"
            aria-label="SVG canvas"
            tabindex="0"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="onPointerUp($event)"
            (keydown.escape)="onEscape($event)"
            (contextmenu)="onContextMenu($event)"
          >
            <div #host class="canvas-host"></div>
            @if (!document.svgRoot()) {
              <p class="empty-state">No SVG loaded.</p>
            }
          </div>
        </div>
        @if (!appState.previewMode()) {
          <app-svg-properties-panel class="editor-sidebar" />
        }
      </div>
    </div>
  `,
})
export class SvgEditor implements AfterViewInit {
  protected readonly document = inject(SvgDocumentService);
  protected readonly appState = inject(AppState);
  protected readonly isDragging = signal(false);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  private hostReady = false;
  private dragState: DragState | null = null;

  constructor() {
    effect(() => {
      const root = this.document.svgRoot();
      this.appState.setSvg(root);

      if (!this.hostReady) {
        return;
      }

      this.mountSvg(root);
    });
  }

  ngAfterViewInit(): void {
    this.hostReady = true;
    this.mountSvg(this.document.svgRoot());

    void this.document.loadDefault().catch(() => {
      // Default sample load failure is surfaced via empty canvas state.
    });
  }

  setCssClass(
    attrs: Readonly<Record<string, string>>,
    classes: readonly string[],
  ): boolean {
    return this.document.setCssClass(attrs, classes);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.appState.previewMode()) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const root = this.document.svgRoot();
    if (!root) {
      return;
    }

    const hitElement = this.resolveSelectableElement(event.target);
    if (!hitElement) {
      this.document.selectElement(null);
      return;
    }

    this.document.selectElement(hitElement);

    if (!isDraggableElement(hitElement)) {
      return;
    }

    this.dragState = {
      pointerId: event.pointerId,
      lastSvgPoint: clientToSvgPoint(root, event.clientX, event.clientY),
      didDrag: false,
    };

    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    const root = this.document.svgRoot();
    if (!root) {
      return;
    }

    const point = clientToSvgPoint(root, event.clientX, event.clientY);
    const dx = point.x - this.dragState.lastSvgPoint.x;
    const dy = point.y - this.dragState.lastSvgPoint.y;

    if (dx === 0 && dy === 0) {
      return;
    }

    this.dragState.didDrag = true;
    this.dragState.lastSvgPoint = point;
    this.isDragging.set(true);
    this.document.translateSelectedElement(dx, dy);
    event.preventDefault();
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    this.dragState = null;
    this.isDragging.set(false);

    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  protected onEscape(event: Event): void {
    if (this.appState.previewMode()) {
      return;
    }

    event.preventDefault();
    this.document.selectElement(null);
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.appState.previewMode()) {
      return;
    }

    event.preventDefault();

    const root = this.document.svgRoot();
    if (!root) {
      return;
    }

    const point = clientToSvgPoint(root, event.clientX, event.clientY);
    this.document.addTextElement(point.x, point.y);
  }

  private resolveSelectableElement(target: EventTarget | null): Element | null {
    if (!(target instanceof Element)) {
      return null;
    }

    const root = this.document.svgRoot();
    if (!root) {
      return null;
    }

    let current: Element | null = target;
    while (current && current !== root) {
      if (isSelectableElement(current)) {
        return current;
      }

      current = current.parentElement;
    }

    return target === root ? root : null;
  }

  private mountSvg(root: SVGSVGElement | null): void {
    const hostElement = this.host().nativeElement;
    hostElement.replaceChildren();

    if (!root) {
      return;
    }

    hostElement.append(root);
  }
}
