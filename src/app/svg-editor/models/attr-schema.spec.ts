import { describe, expect, it } from 'vitest';

import {
  getElementSelectionKey,
  getFieldsForElement,
  isSelectableElement,
  readFieldValue,
} from './attr-schema';

describe('attr-schema', () => {
  it('returns geometry fields for a rect', () => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('width', '100');

    const fieldNames = getFieldsForElement(rect).map((field) => field.name);

    expect(fieldNames).toContain('x');
    expect(fieldNames).toContain('width');
    expect(fieldNames).toContain('fill');
  });

  it('returns line endpoints for a line', () => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '1');
    line.setAttribute('y2', '2');

    const fieldNames = getFieldsForElement(line).map((field) => field.name);

    expect(fieldNames).toEqual(
      expect.arrayContaining(['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width']),
    );
    expect(fieldNames).not.toContain('cx');
  });

  it('does not treat groups as selectable elements', () => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    expect(isSelectableElement(group)).toBe(false);
  });

  it('omits paint fields for groups in the schema', () => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('fill', 'none');

    const fieldNames = getFieldsForElement(group).map((field) => field.name);

    expect(fieldNames).toEqual(expect.arrayContaining(['id', 'transform']));
    expect(fieldNames).not.toContain('fill');
    expect(fieldNames).not.toContain('stroke');
  });

  it('reads text content via the #text field', () => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = 'PUMP P-101';

    expect(readFieldValue(text, '#text')).toBe('PUMP P-101');
  });

  it('builds a stable selection key from element ancestry', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('id', 'pump-p101-body');

    group.append(circle);
    svg.append(group);

    expect(getElementSelectionKey(circle)).toBe('svg:0/g:0/circle#pump-p101-body');
  });
});
