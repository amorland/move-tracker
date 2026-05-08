import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME_FLOOR_PLANS, LOCAL_BLUEPRINT_ASSET_PATHS } from '@/lib/homeLayout';

describe('home layout defaults', () => {
  it('uses 50x50 measured canvases for house levels', () => {
    const floorNames = ['Basement', 'Main Floor', 'Second Floor', 'Third Floor'];

    for (const floorName of floorNames) {
      const floor = DEFAULT_HOME_FLOOR_PLANS.find(entry => entry.name === floorName);
      expect(floor).toMatchObject({
        widthFt: 50,
        depthFt: 50,
        overlayOffsetXFt: 0,
        overlayOffsetYFt: 0,
        overlayWidthFt: 50,
        overlayDepthFt: 50,
      });
    }
  });

  it('defaults known blueprint floors to local-only overlay assets', () => {
    expect(LOCAL_BLUEPRINT_ASSET_PATHS).toMatchObject({
      'Main Floor': '/blueprints/first-floor.png',
      'Second Floor': '/blueprints/second-floor.png',
      'Third Floor': '/blueprints/third-floor.png',
      Exterior: '/blueprints/site-plan.png',
    });
  });
});
