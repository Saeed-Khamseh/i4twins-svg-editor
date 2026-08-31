export function isDraggableElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag !== 'svg' && element.namespaceURI === 'http://www.w3.org/2000/svg';
}

export function translateElement(element: Element, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) {
    return;
  }

  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case 'rect':
    case 'image':
      shiftAttribute(element, 'x', dx);
      shiftAttribute(element, 'y', dy);
      return;
    case 'circle':
      shiftAttribute(element, 'cx', dx);
      shiftAttribute(element, 'cy', dy);
      return;
    case 'ellipse':
      shiftAttribute(element, 'cx', dx);
      shiftAttribute(element, 'cy', dy);
      return;
    case 'line':
      shiftAttribute(element, 'x1', dx);
      shiftAttribute(element, 'y1', dy);
      shiftAttribute(element, 'x2', dx);
      shiftAttribute(element, 'y2', dy);
      return;
    case 'text':
    case 'tspan':
      shiftAttribute(element, 'x', dx);
      shiftAttribute(element, 'y', dy);
      return;
    case 'polyline':
    case 'polygon':
      shiftPoints(element, dx, dy);
      return;
    case 'path':
      shiftTransform(element, dx, dy);
      return;
    default:
      shiftTransform(element, dx, dy);
  }
}

export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: 0, y: 0 };
  }

  const transformed = point.matrixTransform(matrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

function shiftAttribute(element: Element, name: string, delta: number): void {
  const current = Number.parseFloat(element.getAttribute(name) ?? '0');
  element.setAttribute(name, formatCoordinate(current + delta));
}

function shiftPoints(element: Element, dx: number, dy: number): void {
  const rawPoints = element.getAttribute('points');
  if (!rawPoints) {
    return;
  }

  const values = rawPoints
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value));

  for (let index = 0; index < values.length; index += 2) {
    values[index] += dx;
    if (index + 1 < values.length) {
      values[index + 1] += dy;
    }
  }

  const pairs: string[] = [];
  for (let index = 0; index < values.length; index += 2) {
    const x = values[index];
    const y = values[index + 1];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push(`${formatCoordinate(x)},${formatCoordinate(y)}`);
    }
  }

  element.setAttribute('points', pairs.join(' '));
}

function shiftTransform(element: Element, dx: number, dy: number): void {
  const existing = element.getAttribute('transform')?.trim();
  const translateMatch = existing?.match(
    /^translate\(\s*([-\d.eE+]+)(?:[,\s]+([-\d.eE+]+))?\s*\)(.*)$/,
  );

  if (translateMatch) {
    const nextX = Number.parseFloat(translateMatch[1]) + dx;
    const nextY = Number.parseFloat(translateMatch[2] ?? '0') + dy;
    const suffix = translateMatch[3]?.trim();
    const translate = `translate(${formatCoordinate(nextX)}, ${formatCoordinate(nextY)})`;
    element.setAttribute('transform', suffix ? `${translate} ${suffix}` : translate);
    return;
  }

  const translate = `translate(${formatCoordinate(dx)}, ${formatCoordinate(dy)})`;
  element.setAttribute('transform', existing ? `${translate} ${existing}` : translate);
}

function formatCoordinate(value: number): string {
  return String(Math.round(value * 100) / 100);
}
