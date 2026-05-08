import { applySuggestedRoomGeometries, syncBringItemsToLayout } from '@/lib/server/homeLayoutSync';
import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json().catch(() => ({})) as {
    includeRoomSeeds?: boolean;
    overwriteRoomSeeds?: boolean;
    roomId?: number;
    reflowItems?: boolean;
  };

  const layout = await syncBringItemsToLayout(supabase, { reflowExisting: Boolean(body.reflowItems) });
  const roomSeeds = body.includeRoomSeeds
    ? await applySuggestedRoomGeometries(supabase, {
      overwrite: Boolean(body.overwriteRoomSeeds),
      roomId: Number.isFinite(Number(body.roomId)) ? Number(body.roomId) : null,
    })
    : null;

  const errors = [
    ...layout.errors,
    ...(roomSeeds?.errors ?? []),
  ];

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; '), layout, roomSeeds }, { status: 500 });
  }

  if (body.roomId && roomSeeds && roomSeeds.updated === 0) {
    return NextResponse.json({ error: 'No suggested outline is available for this room.', layout, roomSeeds }, { status: 404 });
  }

  return NextResponse.json({ layout, roomSeeds });
}
