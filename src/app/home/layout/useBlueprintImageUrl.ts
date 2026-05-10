'use client';

import { useEffect, useState } from 'react';
import { toBlueprintImageSrc } from './helpers';

/**
 * Resolve a blueprint image path to a URL the browser can fetch.
 *
 * - `/foo/bar.png` and `https://...` paths resolve synchronously.
 * - Anything else is treated as a Supabase Storage bucket-relative path
 *   inside the private `blueprints` bucket. The hook calls
 *   /api/blueprints to get a short-lived signed URL.
 *
 * Returns `null` while resolving an async URL. Returns the resolved URL
 * once available. If the input changes, the previous resolution is
 * discarded.
 */
export function useBlueprintImageUrl(path: string | null | undefined): string | null {
  const trimmed = path?.trim() ?? '';
  const syncUrl = trimmed ? toBlueprintImageSrc(trimmed) : null;
  const isPrivatePath = !!trimmed && !syncUrl;

  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isPrivatePath) return;

    let cancelled = false;
    const abort = new AbortController();
    (async () => {
      try {
        const url = `/api/blueprints?path=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) {
          if (!cancelled) setSignedUrl(null);
          return;
        }
        const body = await res.json() as { url?: string };
        if (!cancelled && body.url) setSignedUrl(body.url);
      } catch {
        if (!cancelled) setSignedUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [isPrivatePath, trimmed]);

  if (syncUrl) return syncUrl;
  if (isPrivatePath) return signedUrl;
  return null;
}
