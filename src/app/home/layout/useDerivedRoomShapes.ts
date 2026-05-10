'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HomeFloorPlan, Room, Wall } from '@/lib/types';
import { deriveRoomPolygon, type RoomPolygon } from './roomDerivation';

export type DerivedRoomShape = RoomPolygon & { roomId: number };

const DEBOUNCE_MS = 60;

/**
 * Computes derived room polygons (flood-fill from each room's anchor
 * across the wall graph). Keyed by roomId.
 *
 * Recomputes on a 60ms debounce when walls or rooms change so a fast
 * drag doesn't run flood-fill on every pointer-move tick.
 */
export function useDerivedRoomShapes(
  floorPlan: HomeFloorPlan | null,
  rooms: Room[],
  walls: Wall[],
): Map<number, DerivedRoomShape> {
  // Stable serialised key for change detection. Keeps the debounce
  // effect from re-running on identity-changed but value-equal arrays.
  const wallsKey = useMemo(() => walls.map(w =>
    `${w.id}:${w.startXFt},${w.startYFt}-${w.endXFt},${w.endYFt}@${w.thicknessIn}`).join('|'), [walls]);
  const roomsKey = useMemo(() => rooms.map(r =>
    `${r.id}:${r.anchorXFt},${r.anchorYFt}`).join('|'), [rooms]);
  const floorKey = floorPlan ? `${floorPlan.id}:${floorPlan.widthFt}x${floorPlan.depthFt}` : '';

  const [shapes, setShapes] = useState<Map<number, DerivedRoomShape>>(() => new Map());

  useEffect(() => {
    if (!floorPlan) {
      const handle = setTimeout(() => setShapes(new Map()), 0);
      return () => clearTimeout(handle);
    }
    const handle = setTimeout(() => {
      const next = new Map<number, DerivedRoomShape>();
      for (const room of rooms) {
        if (room.anchorXFt === null || room.anchorYFt === null) continue;
        const result = deriveRoomPolygon(walls, { x: room.anchorXFt, y: room.anchorYFt }, {
          widthFt: floorPlan.widthFt,
          depthFt: floorPlan.depthFt,
        });
        next.set(room.id, { ...result, roomId: room.id });
      }
      setShapes(next);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [floorKey, wallsKey, roomsKey, floorPlan, rooms, walls]);

  return shapes;
}
