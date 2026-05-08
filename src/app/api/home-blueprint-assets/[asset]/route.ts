import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ASSETS: Record<string, string> = {
  'first-floor': 'first-floor.png',
  'first-floor.png': 'first-floor.png',
  'second-floor': 'second-floor.png',
  'second-floor.png': 'second-floor.png',
  'third-floor': 'third-floor.png',
  'third-floor.png': 'third-floor.png',
  'site-plan': 'site-plan.png',
  'site-plan.png': 'site-plan.png',
};

export async function GET(_request: Request, context: { params: Promise<{ asset: string }> }) {
  const { asset } = await context.params;
  const fileName = ASSETS[asset];

  if (!fileName) {
    return NextResponse.json({ error: 'Unknown blueprint asset' }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), 'data/home-blueprints/derived/floor-overlays', fileName);
    const bytes = await readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'image/png',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Blueprint asset is not available locally' }, { status: 404 });
  }
}
