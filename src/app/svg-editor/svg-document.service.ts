import { Injectable, computed, signal } from '@angular/core';

import { getElementSelectionKey, isSelectableElement } from './models/attr-schema';
import { formatCoordinate, isDraggableElement, translateElement } from './models/element-position';

const DEFAULT_SAMPLE_URL = '/samples/plant.svg';
const SELECTED_CLASS = 'svg-editor-selected';
const SAMPLE_TEXT = 'Sample text';
const SVG_NS = 'http://www.w3.org/2000/svg';

interface ClassSlot {
  readonly attrs: Readonly<Record<string, string>>;
  readonly classes: readonly string[];
  elements: Element[];
}

@Injectable({ providedIn: 'root' })
export class SvgDocumentService {
  readonly svgRoot = signal<SVGSVGElement | null>(null);
  readonly selectedElement = signal<Element | null>(null);
  readonly selectionKey = signal('');
  readonly elementVersion = signal(0);
  readonly fileName = signal('plant.svg');

  readonly documentTitle = computed(() => {
    const root = this.svgRoot();
    if (!root) {
      return 'SVG Editor';
    }

    const titleElement = root.querySelector('title');
    if (titleElement?.textContent?.trim()) {
      return titleElement.textContent.trim();
    }

    const firstText = root.querySelector('text');
    if (firstText?.textContent?.trim()) {
      return firstText.textContent.trim();
    }

    return this.fileName();
  });

  private readonly classSlots = new Map<string, ClassSlot>();
  private readonly managedClasses = new Set<string>();

  async loadDefault(): Promise<void> {
    const response = await fetch(DEFAULT_SAMPLE_URL);
    if (!response.ok) {
      throw new Error(`Failed to load default SVG (${response.status})`);
    }

    const svgText = await response.text();
    this.loadFromString(svgText, 'plant.svg');
  }

  loadFromString(svgText: string, fileName = 'document.svg'): void {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid SVG file.');
    }

    const svg = doc.documentElement;
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error('The file does not contain a root <svg> element.');
    }

    this.clearSelection();
    this.svgRoot.set(svg);
    this.fileName.set(fileName);
    this.resyncClassSlots();
  }

  async loadFromFile(file: File): Promise<void> {
    const svgText = await file.text();
    this.loadFromString(svgText, file.name);
  }

  setCssClass(
    attrs: Readonly<Record<string, string>>,
    classes: readonly string[],
  ): boolean {
    const slotKey = attrsKey(attrs);
    const existing = this.classSlots.get(slotKey);

    if (existing) {
      for (const element of existing.elements) {
        for (const className of existing.classes) {
          element.classList.remove(className);
        }
      }
    }

    if (classes.length === 0) {
      if (existing) {
        for (const className of existing.classes) {
          this.managedClasses.delete(className);
        }
        this.classSlots.delete(slotKey);
      }
      return false;
    }

    const matches = this.findElementsByAttrs(attrs);
    for (const className of classes) {
      this.managedClasses.add(className);
    }

    for (const element of matches) {
      for (const className of classes) {
        element.classList.add(className);
      }
    }

    this.classSlots.set(slotKey, { attrs, classes: [...classes], elements: matches });
    return matches.length > 0;
  }

  selectElement(element: Element | null): void {
    const previous = this.selectedElement();
    if (previous) {
      previous.classList.remove(SELECTED_CLASS);
    }

    if (element && isSelectableElement(element)) {
      element.classList.add(SELECTED_CLASS);
      this.selectedElement.set(element);
      this.selectionKey.set(getElementSelectionKey(element));
      return;
    }

    this.selectedElement.set(null);
    this.selectionKey.set('');
  }

  selectElementAtPoint(target: EventTarget | null): void {
    if (!(target instanceof Element)) {
      this.selectElement(null);
      return;
    }

    const root = this.svgRoot();
    if (!root) {
      return;
    }

    let current: Element | null = target;
    while (current && current !== root) {
      if (isSelectableElement(current)) {
        this.selectElement(current);
        return;
      }

      current = current.parentElement;
    }

    if (target === root) {
      this.selectElement(root);
      return;
    }

    this.selectElement(null);
  }

  updateAttribute(name: string, value: string): void {
    const element = this.selectedElement();
    if (!element) {
      return;
    }

    if (name === '#text') {
      element.textContent = value;
    } else if (value === '') {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }

    if (name === 'id') {
      this.selectionKey.set(getElementSelectionKey(element));
    }

    this.elementVersion.update((value) => value + 1);
  }

  addTextElement(x: number, y: number): SVGTextElement | null {
    const root = this.svgRoot();
    if (!root) {
      return null;
    }

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('id', this.nextTextElementId(root));
    text.setAttribute('x', formatCoordinate(x));
    text.setAttribute('y', formatCoordinate(y));
    text.setAttribute('font-family', 'Segoe UI, Roboto, sans-serif');
    text.setAttribute('font-size', '14');
    text.setAttribute('fill', '#2d3748');
    text.textContent = SAMPLE_TEXT;

    root.appendChild(text);
    this.elementVersion.update((value) => value + 1);
    this.selectElement(text);
    return text;
  }

  translateSelectedElement(dx: number, dy: number): void {
    const element = this.selectedElement();
    if (!element || !isDraggableElement(element)) {
      return;
    }

    translateElement(element, dx, dy);
    this.elementVersion.update((value) => value + 1);
  }

  exportSvg(): string {
    const root = this.svgRoot();
    if (!root) {
      return '';
    }

    const clone = root.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(`.${SELECTED_CLASS}`).forEach((node) => {
      node.classList.remove(SELECTED_CLASS);
    });

    for (const className of this.managedClasses) {
      clone.querySelectorAll(`.${className}`).forEach((node) => {
        node.classList.remove(className);
      });
    }

    const xml = new XMLSerializer().serializeToString(clone);
    return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  }

  downloadSvg(): void {
    const xml = this.exportSvg();
    if (!xml) {
      return;
    }

    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.fileName();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private resyncClassSlots(): void {
    for (const slot of this.classSlots.values()) {
      slot.elements = this.findElementsByAttrs(slot.attrs);
      for (const element of slot.elements) {
        for (const className of slot.classes) {
          element.classList.add(className);
        }
      }
    }
  }

  private findElementsByAttrs(attrs: Readonly<Record<string, string>>): Element[] {
    const root = this.svgRoot();
    if (!root) {
      return [];
    }

    const entries = Object.entries(attrs);
    if (entries.length === 0) {
      return [];
    }

    const matches: Element[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    let node = walker.currentNode as Element | null;
    while (node) {
      if (node !== root && matchesAttrs(node, entries)) {
        matches.push(node);
      }
      node = walker.nextNode() as Element | null;
    }

    return matches;
  }

  private nextTextElementId(root: SVGSVGElement): string {
    let index = 1;
    while (root.querySelector(`#text-${index}`)) {
      index += 1;
    }

    return `text-${index}`;
  }

  private clearSelection(): void {
    const selected = this.selectedElement();
    if (selected) {
      selected.classList.remove(SELECTED_CLASS);
    }

    this.selectedElement.set(null);
    this.selectionKey.set('');
  }
}

function attrsKey(attrs: Readonly<Record<string, string>>): string {
  return JSON.stringify(
    Object.entries(attrs)
      .map(([name, value]) => [name, value] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function matchesAttrs(element: Element, entries: readonly [string, string][]): boolean {
  return entries.every(([name, value]) => {
    const actual = element.getAttribute(name);
    if (actual == null) {
      return false;
    }

    return actual.trim().toUpperCase() === value.trim().toUpperCase();
  });
}
