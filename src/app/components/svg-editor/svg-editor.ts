import {
  AfterViewInit,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';

import { AppState } from '../../app.state';
import { DeviceSearch } from '../device-search/device-search';
import { isSelectableElement } from '../../models/attr-schema';
import { clientToSvgPoint } from '../../models/element-position';
import { SvgDocumentService } from '../../services/svg-document.service';
import { SvgPropertiesPanel } from '../svg-properties-panel/svg-properties-panel';
import { SvgToolbar } from '../svg-toolbar/svg-toolbar';

@Component({
  selector: 'app-svg-editor',
  imports: [SvgToolbar, SvgPropertiesPanel, MatSidenavModule, DeviceSearch],
  styleUrl: './svg-editor.scss',
  templateUrl: './svg-editor.html',
})
export class SvgEditor implements AfterViewInit {
  protected readonly document = inject(SvgDocumentService);
  protected readonly appState = inject(AppState);
  private readonly destroyRef = inject(DestroyRef);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly shell = viewChild.required<ElementRef<HTMLDivElement>>('shell');

  private hostReady = false;
  private panzoom: PanzoomObject | null = null;
  private fitFrame = 0;

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
    this.initCamera();
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
    if (event.button === 2) {
      event.stopImmediatePropagation();
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.focus();
    }

    if (this.appState.previewMode()) {
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

  private initCamera(): void {
    const hostElement = this.host().nativeElement;
    const shellElement = this.shell().nativeElement;

    const panzoom = Panzoom(hostElement, {
      canvas: true,
      minScale: 0.1,
      maxScale: 8,
    });

    this.panzoom = panzoom;

    const onWheel = panzoom.zoomWithWheel.bind(panzoom);
    shellElement.addEventListener('wheel', onWheel, { passive: false });

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.fitFrame);
      shellElement.removeEventListener('wheel', onWheel);
      panzoom.destroy();
      this.panzoom = null;
    });
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
      this.fitHostToSvg(null);
      this.panzoom?.reset({ animate: false });
      return;
    }

    hostElement.append(root);
    this.fitHostToSvg(root);
    this.scheduleFitCamera();
  }

  private scheduleFitCamera(): void {
    cancelAnimationFrame(this.fitFrame);
    this.fitFrame = requestAnimationFrame(() => {
      this.fitCameraToCanvas();
    });
  }

  private fitCameraToCanvas(): void {
    const panzoom = this.panzoom;
    const host = this.host().nativeElement;
    const shell = this.shell().nativeElement;

    if (!panzoom) {
      return;
    }

    const hostWidth = host.offsetWidth;
    const hostHeight = host.offsetHeight;
    if (hostWidth <= 0 || hostHeight <= 0) {
      panzoom.reset({ animate: false });
      return;
    }

    const styles = getComputedStyle(shell);
    const availableWidth =
      shell.clientWidth -
      Number.parseFloat(styles.paddingLeft) -
      Number.parseFloat(styles.paddingRight);
    const availableHeight =
      shell.clientHeight -
      Number.parseFloat(styles.paddingTop) -
      Number.parseFloat(styles.paddingBottom);

    if (availableWidth <= 0 || availableHeight <= 0) {
      panzoom.reset({ animate: false });
      return;
    }

    const minScale = panzoom.getOptions().minScale ?? 0.1;
    const scale = Math.min(
      1,
      availableWidth / hostWidth,
      availableHeight / hostHeight,
    );

    panzoom.zoom(Math.max(scale, minScale), { animate: false });
    panzoom.pan(0, 0, { animate: false });
  }

  private fitHostToSvg(root: SVGSVGElement | null): void {
    const hostElement = this.host().nativeElement;

    if (!root) {
      (['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'] as const).forEach(
        (prop) => hostElement.style.removeProperty(prop),
      );
      return;
    }

    const viewBox = root.viewBox.baseVal;
    const width = viewBox.width || root.width.baseVal.value;
    const height = viewBox.height || root.height.baseVal.value;
    const size =
      width > 0 && height > 0
        ? { width, height }
        : {
            width: Math.max(root.getBBox().width, 1),
            height: Math.max(root.getBBox().height, 1),
          };

    const widthPx = `${size.width}px`;
    const heightPx = `${size.height}px`;
    hostElement.style.width = widthPx;
    hostElement.style.height = heightPx;
    hostElement.style.minWidth = widthPx;
    hostElement.style.minHeight = heightPx;
    hostElement.style.maxWidth = widthPx;
    hostElement.style.maxHeight = heightPx;
  }
}
