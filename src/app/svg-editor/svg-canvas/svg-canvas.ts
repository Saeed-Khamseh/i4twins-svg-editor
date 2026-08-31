import { AfterViewInit, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';

import { isSelectableElement } from '../models/attr-schema';
import { clientToSvgPoint, isDraggableElement } from '../models/element-position';
import { SvgDocumentService } from '../svg-document.service';

interface DragState {
  readonly pointerId: number;
  lastSvgPoint: { x: number; y: number };
  didDrag: boolean;
}

@Component({
  selector: 'app-svg-canvas',
  styleUrl: './svg-canvas.scss',
  template: `
    <div
      class="canvas-shell"
      [class.is-dragging]="isDragging()"
      role="application"
      aria-label="SVG canvas"
      tabindex="0"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (keydown.escape)="onEscape($event)"
    >
      <div #host class="canvas-host"></div>
      @if (!document.svgRoot()) {
        <p class="empty-state">No SVG loaded.</p>
      }
    </div>
  `,
})
export class SvgCanvas implements AfterViewInit {
  protected readonly document = inject(SvgDocumentService);
  protected readonly isDragging = signal(false);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  private hostReady = false;
  private dragState: DragState | null = null;

  constructor() {
    effect(() => {
      const root = this.document.svgRoot();
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

  protected onPointerDown(event: PointerEvent): void {
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
    event.preventDefault();
    this.document.selectElement(null);
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
