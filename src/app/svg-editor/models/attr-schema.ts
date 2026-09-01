export type AttrFieldType = 'text' | 'number' | 'color' | 'select' | 'textarea';

export interface AttrFieldDef {
  readonly name: string;
  readonly label: string;
  readonly type: AttrFieldType;
  readonly options?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export const COMMON_ATTRS: readonly AttrFieldDef[] = [
  { name: 'id', label: 'ID', type: 'text' },
  { name: 'transform', label: 'Transform', type: 'text' },
  { name: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 1, step: 0.05 },
  { name: 'fill', label: 'Fill', type: 'color' },
  { name: 'stroke', label: 'Stroke', type: 'color' },
  { name: 'stroke-width', label: 'Stroke width', type: 'number', min: 0, step: 0.5 },
  {
    name: 'stroke-linecap',
    label: 'Stroke linecap',
    type: 'select',
    options: ['butt', 'round', 'square'],
  },
  {
    name: 'stroke-linejoin',
    label: 'Stroke linejoin',
    type: 'select',
    options: ['miter', 'round', 'bevel'],
  },
  { name: 'stroke-dasharray', label: 'Stroke dasharray', type: 'text' },
];

export const TAG_ATTRS: Record<string, readonly AttrFieldDef[]> = {
  svg: [
    { name: 'viewBox', label: 'ViewBox', type: 'text' },
    { name: 'width', label: 'Width', type: 'text' },
    { name: 'height', label: 'Height', type: 'text' },
  ],
  rect: [
    { name: 'x', label: 'X', type: 'number' },
    { name: 'y', label: 'Y', type: 'number' },
    { name: 'width', label: 'Width', type: 'number', min: 0 },
    { name: 'height', label: 'Height', type: 'number', min: 0 },
    { name: 'rx', label: 'Corner radius X', type: 'number', min: 0 },
    { name: 'ry', label: 'Corner radius Y', type: 'number', min: 0 },
  ],
  circle: [
    { name: 'cx', label: 'Center X', type: 'number' },
    { name: 'cy', label: 'Center Y', type: 'number' },
    { name: 'r', label: 'Radius', type: 'number', min: 0 },
  ],
  ellipse: [
    { name: 'cx', label: 'Center X', type: 'number' },
    { name: 'cy', label: 'Center Y', type: 'number' },
    { name: 'rx', label: 'Radius X', type: 'number', min: 0 },
    { name: 'ry', label: 'Radius Y', type: 'number', min: 0 },
  ],
  line: [
    { name: 'x1', label: 'X1', type: 'number' },
    { name: 'y1', label: 'Y1', type: 'number' },
    { name: 'x2', label: 'X2', type: 'number' },
    { name: 'y2', label: 'Y2', type: 'number' },
  ],
  polyline: [{ name: 'points', label: 'Points', type: 'textarea' }],
  polygon: [{ name: 'points', label: 'Points', type: 'textarea' }],
  path: [{ name: 'd', label: 'Path data', type: 'textarea' }],
  text: [
    { name: '#text', label: 'Text content', type: 'text' },
    { name: 'x', label: 'X', type: 'number' },
    { name: 'y', label: 'Y', type: 'number' },
    { name: 'font-size', label: 'Font size', type: 'number', min: 0, step: 0.5 },
    {
      name: 'font-weight',
      label: 'Font weight',
      type: 'select',
      options: ['normal', 'bold', '300', '400', '500', '600', '700'],
    },
    {
      name: 'text-anchor',
      label: 'Text anchor',
      type: 'select',
      options: ['start', 'middle', 'end'],
    },
    {
      name: 'dominant-baseline',
      label: 'Dominant baseline',
      type: 'select',
      options: ['auto', 'middle', 'central', 'hanging', 'alphabetic'],
    },
  ],
  g: [],
};

const PRESENTATION_ATTRS = new Set([
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
]);

const SKIP_TAGS = new Set(['defs', 'title', 'desc', 'metadata', 'style', 'script']);

const GEOMETRY_TAGS = new Set([
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
]);

export function isSelectableElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag) || tag === 'g') {
    return false;
  }

  return element.namespaceURI === 'http://www.w3.org/2000/svg';
}

export function getFieldsForElement(element: Element): AttrFieldDef[] {
  const tag = element.tagName.toLowerCase();
  const tagFields = TAG_ATTRS[tag] ?? [];
  const commonFields =
    tag === 'svg'
      ? []
      : COMMON_ATTRS.filter((field) => {
          if (PRESENTATION_ATTRS.has(field.name)) {
            return supportsPresentationAttrs(element);
          }

          return true;
        });

  const svgFields = tag === 'svg' ? (TAG_ATTRS['svg'] ?? []) : [];

  const seen = new Set<string>();
  const fields: AttrFieldDef[] = [];

  for (const field of [...commonFields, ...tagFields, ...svgFields]) {
    if (!seen.has(field.name)) {
      seen.add(field.name);
      fields.push(field);
    }
  }

  return fields;
}

function supportsPresentationAttrs(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'g') {
    return false;
  }

  return GEOMETRY_TAGS.has(tag) || tag === 'svg';
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function readFieldValue(element: Element, fieldName: string): string {
  if (fieldName === '#text') {
    return element.textContent ?? '';
  }

  return element.getAttribute(fieldName) ?? '';
}

export function writeFieldValue(element: Element, fieldName: string, value: string): void {
  if (fieldName === '#text') {
    element.textContent = value;
    return;
  }

  if (value === '') {
    element.removeAttribute(fieldName);
    return;
  }

  element.setAttribute(fieldName, value);
}
