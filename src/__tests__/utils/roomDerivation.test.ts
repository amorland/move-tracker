import { describe, expect, it } from 'vitest';
import { deriveRoomPolygon, polygonContainsPoint } from '@/app/home/layout/roomDerivation';
import type { Wall } from '@/lib/types';

let nextWallId = 1;
function wall(startXFt: number, startYFt: number, endXFt: number, endYFt: number, thicknessIn = 5): Wall {
  return {
    id: nextWallId++,
    floorPlanId: 1,
    startXFt,
    startYFt,
    endXFt,
    endYFt,
    thicknessIn,
    heightFt: null,
    notes: null,
    sortIndex: 0,
  };
}

const FLOOR = { widthFt: 50, depthFt: 50 };

describe('deriveRoomPolygon', () => {
  it('returns unbounded when there are no walls', () => {
    const result = deriveRoomPolygon([], { x: 25, y: 25 }, FLOOR);
    expect(result.bounded).toBe(false);
    expect(result.areaFt2).toBeGreaterThan(2400); // ≈ 50×50 = 2500, allowing for cell rounding
  });

  it('returns a closed rectangular polygon when walls form a closed box', () => {
    // 10x10 box centered at (25, 25), so corners are at (20,20)-(30,30).
    const walls: Wall[] = [
      wall(20, 20, 30, 20),
      wall(30, 20, 30, 30),
      wall(30, 30, 20, 30),
      wall(20, 30, 20, 20),
    ];
    const result = deriveRoomPolygon(walls, { x: 25, y: 25 }, FLOOR);
    expect(result.bounded).toBe(true);
    // Expect area ~= 10x10 = 100 ft², minus the wall thickness band.
    // Walls are 5 inches thick (~0.42 ft). The interior is roughly
    // (10 - 0.85) × (10 - 0.85) ≈ 83 ft². Allow generous tolerance.
    expect(result.areaFt2).toBeGreaterThan(60);
    expect(result.areaFt2).toBeLessThan(100);
    expect(result.polygon.length).toBeGreaterThanOrEqual(4);
  });

  it('marks the region as unbounded when a wall has a gap', () => {
    // Same 10x10 box but the right wall is missing.
    const walls: Wall[] = [
      wall(20, 20, 30, 20),
      wall(30, 30, 20, 30),
      wall(20, 30, 20, 20),
    ];
    const result = deriveRoomPolygon(walls, { x: 25, y: 25 }, FLOOR);
    expect(result.bounded).toBe(false);
  });

  it('bridges small endpoint gaps via the endpoint caps', () => {
    // 10x10 box where two walls don't quite touch — the right wall ends
    // at y=29.4 instead of y=30. Endpoint caps (0.5 ft radius) should
    // close the 0.6 ft gap to the top wall's right endpoint.
    const walls: Wall[] = [
      wall(20, 20, 30, 20),    // top
      wall(30, 20, 30, 29.4),  // right — short by 0.6 ft
      wall(30, 30, 20, 30),    // bottom
      wall(20, 30, 20, 20),    // left
    ];
    const result = deriveRoomPolygon(walls, { x: 25, y: 25 }, FLOOR);
    expect(result.bounded).toBe(true);
  });

  it('returns empty when the anchor sits on a wall', () => {
    const walls: Wall[] = [wall(20, 25, 30, 25, 12)]; // 12-inch wall right under the anchor
    const result = deriveRoomPolygon(walls, { x: 25, y: 25 }, FLOOR);
    expect(result.polygon).toEqual([]);
    expect(result.bounded).toBe(false);
  });

  it('returns empty for an anchor outside the floor bounds', () => {
    const result = deriveRoomPolygon([], { x: -5, y: 25 }, FLOOR);
    expect(result.polygon).toEqual([]);
    expect(result.bounded).toBe(false);
  });

  it('handles an L-shaped room', () => {
    // L-shaped box: a 10x10 outer corner plus a 6x4 inset on the
    // bottom-right that we exclude.
    //   (10,10)----(30,10)
    //     |          |
    //     |          |
    //   (10,30)--(20,30)
    //              |
    //              |
    //              (20,40)----(30,40)
    //                         |
    //              (30,40)----(30,10) — already drawn above
    // Simpler: outer rectangle 10..30 x 10..40, with an internal wall
    // splitting off the bottom-left into the L. Anchor in the L region.
    const walls: Wall[] = [
      // outer
      wall(10, 10, 30, 10),
      wall(30, 10, 30, 40),
      wall(30, 40, 20, 40),
      wall(20, 40, 20, 30),
      wall(20, 30, 10, 30),
      wall(10, 30, 10, 10),
    ];
    const result = deriveRoomPolygon(walls, { x: 15, y: 20 }, FLOOR);
    expect(result.bounded).toBe(true);
    // L-shape area ≈ outer rect - missing 10x10 corner = 20*30 - 10*10 = 500.
    // Account for ~10% loss to wall band; expect > 400.
    expect(result.areaFt2).toBeGreaterThan(400);
    expect(result.areaFt2).toBeLessThan(500);
    expect(result.polygon.length).toBeGreaterThanOrEqual(6);
  });
});

describe('polygonContainsPoint', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('returns true for points inside', () => {
    expect(polygonContainsPoint(square, { x: 5, y: 5 })).toBe(true);
    expect(polygonContainsPoint(square, { x: 0.1, y: 0.1 })).toBe(true);
  });

  it('returns false for points outside', () => {
    expect(polygonContainsPoint(square, { x: -1, y: 5 })).toBe(false);
    expect(polygonContainsPoint(square, { x: 11, y: 5 })).toBe(false);
    expect(polygonContainsPoint(square, { x: 5, y: -1 })).toBe(false);
    expect(polygonContainsPoint(square, { x: 5, y: 11 })).toBe(false);
  });

  it('returns false for empty or degenerate polygons', () => {
    expect(polygonContainsPoint([], { x: 0, y: 0 })).toBe(false);
    expect(polygonContainsPoint([{ x: 0, y: 0 }, { x: 1, y: 1 }], { x: 0.5, y: 0.5 })).toBe(false);
  });
});
