import { Injectable, computed, signal } from '@angular/core';

import {
  getFieldsForElement,
  isSelectableElement,
  readFieldValue,
  writeFieldValue,
} from '../models/attr-schema';
import { formatCoordinate, isDraggableElement, translateElement } from '../models/element-position';

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

  private readonly revision = signal(0);
  private readonly classSlots = new Map<string, ClassSlot>();
  private downloadName = 'plant.svg';

  readonly selectedAttributes = computed(() => {
    this.revision();
    const element = this.selectedElement();
    if (!element) {
      return {};
    }

    const values: Record<string, string> = {};
    for (const field of getFieldsForElement(element)) {
      values[field.name] = readFieldValue(element, field.name);
    }

    return values;
  });

  async loadDefault(): Promise<void> {
    const response = await fetch(DEFAULT_SAMPLE_URL);
    if (!response.ok) {
      throw new Error(`Failed to load default SVG (${response.status})`);
    }

    this.loadFromString(await response.text(), 'plant.svg');
  }

  async loadFromFile(file: File): Promise<void> {
    this.loadFromString(await file.text(), file.name);
  }

  setCssClass(attrs: Readonly<Record<string, string>>, classes: readonly string[]): boolean {
    const slotKey = attrsKey(attrs);
    this.clearSlot(slotKey);

    if (classes.length === 0) {
      return false;
    }

    const matches = this.findElementsByAttrs(attrs);
    for (const element of matches) {
      element.classList.add(...classes);
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
      this.touch();
      return;
    }

    this.selectedElement.set(null);
    this.touch();
  }

  updateAttribute(name: string, value: string): void {
    const element = this.selectedElement();
    if (!element) {
      return;
    }

    writeFieldValue(element, name, value);
    this.touch();
  }

  addTextElement(x: number, y: number): void {
    const root = this.svgRoot();
    if (!root) {
      return;
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
    this.selectElement(text);
  }

  translateSelectedElement(dx: number, dy: number): void {
    const element = this.selectedElement();
    if (!element || !isDraggableElement(element)) {
      return;
    }

    translateElement(element, dx, dy);
    this.touch();
  }

  downloadSvg(): void {
    const xml = this.serializeSvg();
    if (!xml) {
      return;
    }

    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.downloadName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private loadFromString(svgText: string, fileName: string): void {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid SVG file.');
    }

    const svg = doc.documentElement;
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error('The file does not contain a root <svg> element.');
    }

    this.selectElement(null);
    this.svgRoot.set(svg);
    this.downloadName = fileName;
    this.resyncClassSlots();
  }

  private serializeSvg(): string {
    const root = this.svgRoot();
    if (!root) {
      return '';
    }

    const clone = root.cloneNode(true) as SVGSVGElement;
    const overlayClasses = new Set([
      SELECTED_CLASS,
      ...[...this.classSlots.values()].flatMap((slot) => slot.classes),
    ]);

    for (const className of overlayClasses) {
      clone.querySelectorAll(`.${className}`).forEach((node) => {
        node.classList.remove(className);
      });
    }

    const xml = new XMLSerializer().serializeToString(clone);
    return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  }

  private clearSlot(slotKey: string): void {
    const existing = this.classSlots.get(slotKey);
    if (!existing) {
      return;
    }

    for (const element of existing.elements) {
      element.classList.remove(...existing.classes);
    }

    this.classSlots.delete(slotKey);
  }

  private resyncClassSlots(): void {
    for (const slot of this.classSlots.values()) {
      slot.elements = this.findElementsByAttrs(slot.attrs);
      for (const element of slot.elements) {
        element.classList.add(...slot.classes);
      }
    }
  }

  private findElementsByAttrs(attrs: Readonly<Record<string, string>>): Element[] {
    const root = this.svgRoot();
    const entries = Object.entries(attrs);
    if (!root || entries.length === 0) {
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

  private touch(): void {
    this.revision.update((value) => value + 1);
  }
}

function attrsKey(attrs: Readonly<Record<string, string>>): string {
  return JSON.stringify(
    Object.entries(attrs).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function matchesAttrs(element: Element, entries: readonly [string, string][]): boolean {
  return entries.every(([name, value]) => {
    const actual = element.getAttribute(name);
    return actual != null && actual.trim().toUpperCase() === value.trim().toUpperCase();
  });
}
