import type { PlanPoint, Wall } from '@/lib/types';

export type RoomPolygon = {
  polygon: PlanPoint[];
  bounded: boolean;
  areaFt2: number;
};

const CELL_SIZE_FT = 0.25;
const WALL_SAFETY_FT = 0.05;
// Endpoint cap radius. Each wall endpoint contributes a disc obstacle of
// this radius in addition to the wall body. Two walls whose endpoints are
// within 2 * ENDPOINT_CAP_FT of each other will have overlapping caps,
// closing the obstacle band even if their endpoint coordinates don't
// match exactly (e.g., older walls drawn before endpoint snap was
// reliable).
const ENDPOINT_CAP_FT = 0.5;

/**
 * Flood-fill room derivation.
 *
 * Given a set of walls on a floor and an anchor point, returns the polygon
 * of the wall-bounded region containing the anchor.
 *
 * Implementation:
 * 1. Rasterise the floor onto a grid of `CELL_SIZE_FT` cells.
 * 2. Mark cells overlapping any wall (within thickness/2 + safety margin)
 *    as obstacles.
 * 3. BFS from the anchor cell, stopping at obstacles.
 * 4. If the fill reaches the floor edge, mark the region as unbounded.
 * 5. Trace the perimeter of the filled cells using marching squares to
 *    produce a polygon.
 *
 * Tolerant of imperfect walls: a small gap leaks the room (bounded=false)
 * but the polygon still covers what the fill reached.
 *
 * Pure function. No DOM, no browser globals.
 */
export function deriveRoomPolygon(
  walls: Wall[],
  anchor: PlanPoint,
  floor: { widthFt: number; depthFt: number },
): RoomPolygon {
  if (
    !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) ||
    anchor.x < 0 || anchor.x > floor.widthFt ||
    anchor.y < 0 || anchor.y > floor.depthFt
  ) {
    return { polygon: [], bounded: false, areaFt2: 0 };
  }

  const cols = Math.ceil(floor.widthFt / CELL_SIZE_FT);
  const rows = Math.ceil(floor.depthFt / CELL_SIZE_FT);
  if (cols <= 0 || rows <= 0) {
    return { polygon: [], bounded: false, areaFt2: 0 };
  }

  const obstacles = rasteriseWalls(walls, cols, rows);
  const filled = floodFillCells(obstacles, anchor, cols, rows);
  if (!filled) {
    return { polygon: [], bounded: false, areaFt2: 0 };
  }

  const polygon = simplifyPolygon(traceContour(filled.cells, cols, rows), CELL_SIZE_FT * 0.51);
  const areaFt2 = polygonAreaFt2(polygon);
  return { polygon, bounded: !filled.reachedEdge, areaFt2 };
}

function rasteriseWalls(walls: Wall[], cols: number, rows: number): boolean[] {
  const obstacles = new Array<boolean>(cols * rows).fill(false);
  // Pre-compute which endpoints need a cap. A cap is only useful for
  // bridging — i.e., when an endpoint is close to ANOTHER wall's endpoint
  // but not exactly co-located. Endpoints that share a point (within
  // CO_LOCATED_FT) with another endpoint don't need a cap because the
  // body bands already overlap there; adding a cap would push the
  // polygon back ~0.5 ft from properly-aligned corners.
  const CO_LOCATED_FT = 0.05;
  const BRIDGE_LIMIT_FT = 1.0;
  const needsCap = new Map<string, boolean>();
  const allEndpoints: { key: string; wallId: number; x: number; y: number }[] = [];
  for (const w of walls) {
    allEndpoints.push({ key: `${w.id}-start`, wallId: w.id, x: w.startXFt, y: w.startYFt });
    allEndpoints.push({ key: `${w.id}-end`, wallId: w.id, x: w.endXFt, y: w.endYFt });
  }
  for (const ep of allEndpoints) {
    let minDist = Infinity;
    for (const other of allEndpoints) {
      if (other.wallId === ep.wallId) continue; // skip same wall's endpoints
      const d = Math.hypot(other.x - ep.x, other.y - ep.y);
      if (d < minDist) minDist = d;
    }
    // Need a cap if the nearest other endpoint is BETWEEN co-located
    // and the bridge limit. Co-located = no cap needed (body bands meet);
    // beyond bridge limit = no cap needed (truly free endpoint, cap
    // would just push into the room).
    needsCap.set(ep.key, minDist > CO_LOCATED_FT && minDist <= BRIDGE_LIMIT_FT);
  }

  for (const wall of walls) {
    const halfThickness = (wall.thicknessIn ?? 5) / 12 / 2 + WALL_SAFETY_FT;
    const startCap = needsCap.get(`${wall.id}-start`) === true;
    const endCap = needsCap.get(`${wall.id}-end`) === true;
    const capReach = (startCap || endCap) ? ENDPOINT_CAP_FT : halfThickness;
    const reach = Math.max(halfThickness, capReach);
    const minX = Math.max(0, Math.min(wall.startXFt, wall.endXFt) - reach);
    const maxX = Math.min(cols * CELL_SIZE_FT, Math.max(wall.startXFt, wall.endXFt) + reach);
    const minY = Math.max(0, Math.min(wall.startYFt, wall.endYFt) - reach);
    const maxY = Math.min(rows * CELL_SIZE_FT, Math.max(wall.startYFt, wall.endYFt) + reach);

    const startCol = Math.floor(minX / CELL_SIZE_FT);
    const endCol = Math.min(cols - 1, Math.ceil(maxX / CELL_SIZE_FT));
    const startRow = Math.floor(minY / CELL_SIZE_FT);
    const endRow = Math.min(rows - 1, Math.ceil(maxY / CELL_SIZE_FT));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (obstacles[row * cols + col]) continue;
        const cellCenterX = (col + 0.5) * CELL_SIZE_FT;
        const cellCenterY = (row + 0.5) * CELL_SIZE_FT;
        const inBody = distanceToSegment(cellCenterX, cellCenterY, wall.startXFt, wall.startYFt, wall.endXFt, wall.endYFt) <= halfThickness;
        const inStartCap = startCap && Math.hypot(cellCenterX - wall.startXFt, cellCenterY - wall.startYFt) <= ENDPOINT_CAP_FT;
        const inEndCap = endCap && Math.hypot(cellCenterX - wall.endXFt, cellCenterY - wall.endYFt) <= ENDPOINT_CAP_FT;
        if (inBody || inStartCap || inEndCap) {
          obstacles[row * cols + col] = true;
        }
      }
    }
  }
  return obstacles;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

function floodFillCells(
  obstacles: boolean[],
  anchor: PlanPoint,
  cols: number,
  rows: number,
): { cells: boolean[]; reachedEdge: boolean } | null {
  const startCol = Math.max(0, Math.min(cols - 1, Math.floor(anchor.x / CELL_SIZE_FT)));
  const startRow = Math.max(0, Math.min(rows - 1, Math.floor(anchor.y / CELL_SIZE_FT)));
  if (obstacles[startRow * cols + startCol]) {
    // Anchor lands on a wall; nothing to fill.
    return null;
  }

  const cells = new Array<boolean>(cols * rows).fill(false);
  const queue: number[] = [startRow * cols + startCol];
  cells[startRow * cols + startCol] = true;
  let reachedEdge = false;

  while (queue.length > 0) {
    const idx = queue.shift()!;
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
      reachedEdge = true;
    }

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nextCol = col + dx;
      const nextRow = row + dy;
      if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) continue;
      const nextIdx = nextRow * cols + nextCol;
      if (cells[nextIdx] || obstacles[nextIdx]) continue;
      cells[nextIdx] = true;
      queue.push(nextIdx);
    }
  }

  return { cells, reachedEdge };
}

/**
 * Marching-squares contour trace of a binary cell grid.
 *
 * Walks the perimeter clockwise starting at the topmost-leftmost filled
 * cell, producing a polygon in feet (corners between filled and unfilled
 * cells). The output is a closed loop with the first/last vertex
 * coincident; we drop the duplicate.
 */
function traceContour(cells: boolean[], cols: number, rows: number): PlanPoint[] {
  // Find a starting cell on the perimeter — topmost-leftmost filled cell.
  let startCol = -1;
  let startRow = -1;
  for (let row = 0; row < rows && startRow < 0; row++) {
    for (let col = 0; col < cols; col++) {
      if (cells[row * cols + col]) {
        startCol = col;
        startRow = row;
        break;
      }
    }
  }
  if (startRow < 0) return [];

  // Walk the boundary using "left-hand wall following": starting facing
  // right at the top-left corner of the start cell, advance and turn at
  // boundaries until we return to the start.
  type Dir = 0 | 1 | 2 | 3; // 0=right, 1=down, 2=left, 3=up
  const corners: PlanPoint[] = [];
  const startVertex = { x: startCol * CELL_SIZE_FT, y: startRow * CELL_SIZE_FT };
  let x = startCol;
  let y = startRow;
  let dir: Dir = 0;
  corners.push(startVertex);

  const isFilled = (cx: number, cy: number) =>
    cx >= 0 && cx < cols && cy >= 0 && cy < rows && cells[cy * cols + cx];

  // Each edge of the current cell sits between the cell and a neighbor.
  // We walk along the boundary, hugging the unfilled side on the left.
  // For each step, look at the two cells adjacent to the next vertex:
  // - the cell we're "inside" (filled)
  // - the cell on the outside (unfilled or out-of-bounds)
  // Turn left if the inside-side cell becomes unfilled; turn right if the
  // outside-side cell becomes filled; otherwise go straight.
  const maxSteps = cols * rows * 4;
  let steps = 0;
  while (steps++ < maxSteps) {
    let nextX = x;
    let nextY = y;
    let nextDir: Dir = dir;

    // Move "forward" one cell along dir, also looking at the cell to the
    // left of the direction of motion.
    // Cells to "inside" (left-hand) and "outside" (right-hand) of the wall
    // boundary depend on dir.
    // For our convention (filled is to the right of motion), inside is
    // the cell at +90°.
    if (dir === 0) { // moving right along the top edge — filled cell is below us
      const ahead = isFilled(x + 1, y);
      const aheadAndUp = isFilled(x + 1, y - 1);
      if (!ahead) {
        // Reached a corner; turn right (down).
        nextDir = 1;
      } else if (aheadAndUp) {
        // Turn left (up) — we've gone past an indent.
        x = x + 1;
        y = y - 1;
        nextDir = 3;
        nextX = x;
        nextY = y;
      } else {
        x = x + 1;
        nextX = x;
      }
    } else if (dir === 1) { // moving down along the right edge — filled cell is to the left
      const ahead = isFilled(x, y + 1);
      const aheadAndRight = isFilled(x + 1, y + 1);
      if (!ahead) {
        nextDir = 2;
      } else if (aheadAndRight) {
        x = x + 1;
        y = y + 1;
        nextDir = 0;
        nextX = x;
        nextY = y;
      } else {
        y = y + 1;
        nextY = y;
      }
    } else if (dir === 2) { // moving left along the bottom edge — filled cell is above
      const ahead = isFilled(x - 1, y);
      const aheadAndDown = isFilled(x - 1, y + 1);
      if (!ahead) {
        nextDir = 3;
      } else if (aheadAndDown) {
        x = x - 1;
        y = y + 1;
        nextDir = 1;
        nextX = x;
        nextY = y;
      } else {
        x = x - 1;
        nextX = x;
      }
    } else { // dir === 3, moving up along the left edge — filled cell is to the right
      const ahead = isFilled(x, y - 1);
      const aheadAndLeft = isFilled(x - 1, y - 1);
      if (!ahead) {
        nextDir = 0;
      } else if (aheadAndLeft) {
        x = x - 1;
        y = y - 1;
        nextDir = 2;
        nextX = x;
        nextY = y;
      } else {
        y = y - 1;
        nextY = y;
      }
    }

    if (nextDir !== dir) {
      // Record the corner at the current position.
      const corner = vertexFor(x, y, dir, nextDir);
      if (corners.length === 0 || pointsDifferent(corners[corners.length - 1], corner)) {
        corners.push(corner);
      }
      dir = nextDir;
    }

    // Termination: returned to starting cell with starting direction.
    if (x === startCol && y === startRow && dir === 0 && corners.length > 1) {
      break;
    }
    void nextX; void nextY;
  }

  return corners;
}

function vertexFor(col: number, row: number, fromDir: number, toDir: number): PlanPoint {
  // The corner of the cell that we reach when turning from fromDir to toDir.
  // Cell (col, row) occupies [col*S, (col+1)*S] x [row*S, (row+1)*S].
  // For each (fromDir → toDir) pair, return the appropriate cell corner.
  if (fromDir === 0 && toDir === 1) return { x: (col + 1) * CELL_SIZE_FT, y: row * CELL_SIZE_FT };
  if (fromDir === 1 && toDir === 2) return { x: (col + 1) * CELL_SIZE_FT, y: (row + 1) * CELL_SIZE_FT };
  if (fromDir === 2 && toDir === 3) return { x: col * CELL_SIZE_FT, y: (row + 1) * CELL_SIZE_FT };
  if (fromDir === 3 && toDir === 0) return { x: col * CELL_SIZE_FT, y: row * CELL_SIZE_FT };
  // Inside corner (concave): we entered the cell going one way and turn
  // back along an inside corner.
  if (fromDir === 0 && toDir === 3) return { x: col * CELL_SIZE_FT, y: row * CELL_SIZE_FT };
  if (fromDir === 1 && toDir === 0) return { x: (col + 1) * CELL_SIZE_FT, y: row * CELL_SIZE_FT };
  if (fromDir === 2 && toDir === 1) return { x: (col + 1) * CELL_SIZE_FT, y: (row + 1) * CELL_SIZE_FT };
  if (fromDir === 3 && toDir === 2) return { x: col * CELL_SIZE_FT, y: (row + 1) * CELL_SIZE_FT };
  return { x: col * CELL_SIZE_FT, y: row * CELL_SIZE_FT };
}

function pointsDifferent(a: PlanPoint, b: PlanPoint): boolean {
  return Math.abs(a.x - b.x) > 1e-6 || Math.abs(a.y - b.y) > 1e-6;
}

function polygonAreaFt2(points: PlanPoint[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i++) {
    area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
  }
  return Math.abs(area / 2);
}

/**
 * Douglas-Peucker simplification with a tolerance in feet. Removes
 * intermediate points within `tolerance` of the line between their
 * neighbors. Tolerance ≈ 0.5 cell catches the staircase artefacts
 * marching squares produces along orthogonal walls.
 */
export function simplifyPolygon(points: PlanPoint[], toleranceFt: number): PlanPoint[] {
  if (points.length <= 3) return points;

  // Apply Douglas-Peucker on the open polyline first, then re-close.
  const simplified = douglasPeucker(points, toleranceFt);
  // Remove last point if it's a near-duplicate of the first (closed loop).
  if (simplified.length > 1) {
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < toleranceFt * 0.1) {
      simplified.pop();
    }
  }
  return simplified;
}

function douglasPeucker(points: PlanPoint[], tolerance: number): PlanPoint[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpendicularDistance(p: PlanPoint, a: PlanPoint, b: PlanPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  const closestX = a.x + t * dx;
  const closestY = a.y + t * dy;
  return Math.hypot(p.x - closestX, p.y - closestY);
}

/**
 * Point-in-polygon test for derived rooms. Used to assign items to
 * rooms based on their position.
 */
export function polygonContainsPoint(polygon: PlanPoint[], point: PlanPoint): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
