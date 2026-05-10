import { getSupabaseServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const BUCKET = 'blueprints';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough for the
                                        // current page session, short enough
                                        // that a leaked URL expires fast.

/**
 * GET /api/blueprints/url?path=second-floor.png
 *
 * Returns a short-lived signed URL for an object in the private `blueprints`
 * Storage bucket. The bucket is read-only-via-RLS for authenticated users;
 * unauthenticated callers will get 401 from the Supabase auth wrapper.
 *
 * The path query parameter is the bucket-relative path (no leading slash).
 * The route does basic sanitisation to keep callers from probing other
 * buckets via path traversal.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const path = rawPath.replace(/^\/+/, '');
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
}
