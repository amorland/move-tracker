import { syncBringItemsToLayout } from '@/lib/server/homeLayoutSync';
import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * POST /api/home-layout-sync
 *
 * Promotes all eligible "Bring" belongings into unplaced room_items rows.
 * Items are created without coordinates — the user drags them onto the
 * walls-authoritative layout once it's defined.
 *
 * The previous body knobs (includeRoomSeeds, overwriteRoomSeeds,
 * roomId, includeArchitecturalSeeds, resetArchitecturalFloor) are gone —
 * polygon-based room seeding and recommended-architectural-element seeding
 * were retired in Phase 4 when walls became authoritative.
 */
export async function POST() {
  const supabase = await getSupabaseServer();
  const layout = await syncBringItemsToLayout(supabase);

  if (layout.errors.length > 0) {
    return NextResponse.json({ error: layout.errors.join('; '), layout }, { status: 500 });
  }

  return NextResponse.json({ layout });
}
