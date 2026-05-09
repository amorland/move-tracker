import { applySuggestedRoomGeometries, syncBringItemsToLayout, syncRecommendedArchitecturalElements } from '@/lib/server/homeLayoutSync';
import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json().catch(() => ({})) as {
    includeRoomSeeds?: boolean;
    overwriteRoomSeeds?: boolean;
    roomId?: number;
    floorPlanId?: number;
    reflowItems?: boolean;
    includeArchitecturalSeeds?: boolean;
    resetArchitecturalFloor?: boolean;
  };

  const floorPlanId = Number.isFinite(Number(body.floorPlanId)) ? Number(body.floorPlanId) : null;
  const layout = await syncBringItemsToLayout(supabase, { reflowExisting: Boolean(body.reflowItems) });
  const roomSeeds = body.includeRoomSeeds
    ? await applySuggestedRoomGeometries(supabase, {
      overwrite: Boolean(body.overwriteRoomSeeds),
      roomId: Number.isFinite(Number(body.roomId)) ? Number(body.roomId) : null,
      floorPlanId,
    })
    : null;
  const architectural = body.includeArchitecturalSeeds
    ? await syncRecommendedArchitecturalElements(supabase, {
      floorPlanId,
      resetFloor: Boolean(body.resetArchitecturalFloor),
    })
    : null;

  const errors = [
    ...layout.errors,
    ...(roomSeeds?.errors ?? []),
    ...(architectural?.errors ?? []),
  ];

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; '), layout, roomSeeds, architectural }, { status: 500 });
  }

  if (body.roomId && roomSeeds && roomSeeds.updated === 0) {
    return NextResponse.json({ error: 'No suggested outline is available for this room.', layout, roomSeeds, architectural }, { status: 404 });
  }

  return NextResponse.json({ layout, roomSeeds, architectural });
}
