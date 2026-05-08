import { applySuggestedRoomGeometries, syncBringItemsToLayout } from '@/lib/server/homeLayoutSync';
import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const body = await request.json().catch(() => ({})) as {
    includeRoomSeeds?: boolean;
    overwriteRoomSeeds?: boolean;
  };

  const layout = await syncBringItemsToLayout(supabase);
  const roomSeeds = body.includeRoomSeeds
    ? await applySuggestedRoomGeometries(supabase, Boolean(body.overwriteRoomSeeds))
    : null;

  const errors = [
    ...layout.errors,
    ...(roomSeeds?.errors ?? []),
  ];

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; '), layout, roomSeeds }, { status: 500 });
  }

  return NextResponse.json({ layout, roomSeeds });
}
