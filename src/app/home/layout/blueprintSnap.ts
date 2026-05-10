'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomeFloorPlan, PlanPoint } from '@/lib/types';

const DEFAULT_LUMINANCE_THRESHOLD = 0.45;
const SAMPLE_GRID_PX = 4; // sample every 4 px when building the dark-pixel index

export type BlueprintSnap = {
  ready: boolean;
  /**
   * Given a floor-coordinate point in feet, returns the nearest dark-pixel
   * point in feet, or null if no dark pixel falls within the search radius.
   * Search radius is in feet.
   */
  snap(point: PlanPoint, radiusFt: number): PlanPoint | null;
  /** True when there's a usable image, false when the floor has no
   * blueprint or the load failed. */
  hasImage: boolean;
};

const NO_OP: BlueprintSnap = {
  ready: true,
  hasImage: false,
  snap: () => null,
};

/**
 * Loads the resolved blueprint URL for the active floor into an offscreen
 * canvas, builds a sparse spatial index of dark pixels keyed by 0.25 ft
 * grid cells, and exposes a `snap` function that returns the nearest
 * dark-pixel centroid to a given point in feet.
 *
 * Used by the wall tracer (and Phase 4.1's room anchor placement) to pull
 * cursor positions onto the visible blueprint lines.
 */
export function useBlueprintSnap(
  floorPlan: HomeFloorPlan | null,
  blueprintUrl: string | null,
  threshold: number = DEFAULT_LUMINANCE_THRESHOLD,
): BlueprintSnap {
  const [snap, setSnap] = useState<BlueprintSnap>(NO_OP);
  const indexRef = useRef<DarkPixelIndex | null>(null);

  useEffect(() => {
    if (!floorPlan || !blueprintUrl || typeof window === 'undefined') {
      const handle = setTimeout(() => setSnap(NO_OP), 0);
      indexRef.current = null;
      return () => clearTimeout(handle);
    }

    let cancelled = false;
    const overlay = {
      offsetXFt: floorPlan.overlayOffsetXFt ?? 0,
      offsetYFt: floorPlan.overlayOffsetYFt ?? 0,
      widthFt: floorPlan.overlayWidthFt ?? floorPlan.widthFt,
      depthFt: floorPlan.overlayDepthFt ?? floorPlan.depthFt,
    };

    void buildDarkPixelIndex(blueprintUrl, threshold, overlay).then(index => {
      if (cancelled) return;
      indexRef.current = index;
      const snapper: BlueprintSnap = {
        ready: true,
        hasImage: index !== null,
        snap: (point, radiusFt) => index ? index.nearestDarkPoint(point, radiusFt) : null,
      };
      setSnap(snapper);
    });

    return () => {
      cancelled = true;
    };
  }, [floorPlan, blueprintUrl, threshold]);

  return snap;
}

type DarkPixelIndex = {
  nearestDarkPoint(point: PlanPoint, radiusFt: number): PlanPoint | null;
};

async function buildDarkPixelIndex(
  url: string,
  threshold: number,
  overlay: { offsetXFt: number; offsetYFt: number; widthFt: number; depthFt: number },
): Promise<DarkPixelIndex | null> {
  const image = await loadImage(url).catch(() => null);
  if (!image) return null;

  const canvas = document.createElement('canvas');
  // Cap canvas resolution to avoid OOM on huge blueprints.
  const maxPx = 2048;
  const scale = Math.min(1, maxPx / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.floor(image.naturalWidth * scale);
  canvas.height = Math.floor(image.naturalHeight * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // For each sample pixel, compute its position in floor feet using the
  // overlay calibration, and store (x, y) in feet if dark enough.
  const pixelToFootX = overlay.widthFt / canvas.width;
  const pixelToFootY = overlay.depthFt / canvas.height;
  const cellSizeFt = 0.25;
  const cells = new Map<string, PlanPoint[]>();
  const limitFt = 4; // search radius is bounded; precompute bucketed.

  for (let py = 0; py < canvas.height; py += SAMPLE_GRID_PX) {
    for (let px = 0; px < canvas.width; px += SAMPLE_GRID_PX) {
      const idx = (py * canvas.width + px) * 4;
      const r = pixelData[idx];
      const g = pixelData[idx + 1];
      const b = pixelData[idx + 2];
      const a = pixelData[idx + 3];
      if (a < 128) continue;
      const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      if (luminance > threshold) continue;

      const xFt = overlay.offsetXFt + px * pixelToFootX;
      const yFt = overlay.offsetYFt + py * pixelToFootY;
      const cellKey = `${Math.floor(xFt / cellSizeFt)},${Math.floor(yFt / cellSizeFt)}`;
      const bucket = cells.get(cellKey);
      if (bucket) {
        bucket.push({ x: xFt, y: yFt });
      } else {
        cells.set(cellKey, [{ x: xFt, y: yFt }]);
      }
    }
  }

  const radiusCells = Math.ceil(limitFt / cellSizeFt);

  return {
    nearestDarkPoint(point, radiusFt) {
      const cellX = Math.floor(point.x / cellSizeFt);
      const cellY = Math.floor(point.y / cellSizeFt);
      const cellRange = Math.min(radiusCells, Math.ceil(radiusFt / cellSizeFt));
      let best: PlanPoint | null = null;
      let bestDistSq = radiusFt * radiusFt;
      for (let dy = -cellRange; dy <= cellRange; dy++) {
        for (let dx = -cellRange; dx <= cellRange; dx++) {
          const bucket = cells.get(`${cellX + dx},${cellY + dy}`);
          if (!bucket) continue;
          for (const candidate of bucket) {
            const ddx = candidate.x - point.x;
            const ddy = candidate.y - point.y;
            const distSq = ddx * ddx + ddy * ddy;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              best = candidate;
            }
          }
        }
      }
      return best;
    },
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load blueprint image: ${url}`));
    image.src = url;
  });
}
