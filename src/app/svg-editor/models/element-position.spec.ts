import { describe, expect, it } from 'vitest';

import { translateElement } from './element-position';

describe('element-position', () => {
  it('translates a rect by updating x and y', () => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '20');

    translateElement(rect, 5, -3);

    expect(rect.getAttribute('x')).toBe('15');
    expect(rect.getAttribute('y')).toBe('17');
  });

  it('translates a circle by updating cx and cy', () => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '50');

    translateElement(circle, 10, 10);

    expect(circle.getAttribute('cx')).toBe('110');
    expect(circle.getAttribute('cy')).toBe('60');
  });

  it('translates a line by moving both endpoints', () => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '10');
    line.setAttribute('y2', '10');

    translateElement(line, 4, 2);

    expect(line.getAttribute('x1')).toBe('4');
    expect(line.getAttribute('y1')).toBe('2');
    expect(line.getAttribute('x2')).toBe('14');
    expect(line.getAttribute('y2')).toBe('12');
  });

  it('translates a path using transform', () => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 0 L10 10');

    translateElement(path, 3, 4);

    expect(path.getAttribute('transform')).toBe('translate(3, 4)');
  });
});
