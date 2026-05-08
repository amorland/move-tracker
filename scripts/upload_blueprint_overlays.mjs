#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const HELP = `
Upload local blueprint overlay images to Supabase Storage and update home_floor_plans.

Required environment:
  NEXT_PUBLIC_SUPABASE_URL       Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY      Service role key for storage upload and DB update

Optional environment:
  SUPABASE_BLUEPRINT_BUCKET      Storage bucket name (default: home-blueprints)
  BLUEPRINT_OVERLAY_DIR          Local image directory (default: data/home-blueprints/derived/floor-overlays)
  BLUEPRINT_OVERLAY_PREFIX       Storage object prefix (default: 25-chestnut/floor-overlays)

Usage:
  npm run upload:blueprint-overlays
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP.trim());
  process.exit(0);
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BLUEPRINT_BUCKET || 'home-blueprints';
const overlayDir = process.env.BLUEPRINT_OVERLAY_DIR || 'data/home-blueprints/derived/floor-overlays';
const storagePrefix = trimSlashes(process.env.BLUEPRINT_OVERLAY_PREFIX || '25-chestnut/floor-overlays');

const overlays = [
  {
    name: 'Main Floor',
    label: 'First Floor',
    level: 1,
    widthFt: 50,
    depthFt: 50,
    blueprintPage: 1,
    fileName: 'first-floor.png',
    notes: 'Initial calibration from blueprint sheet A1, scale 1/8 inch = 1 foot.',
    sortIndex: 10,
  },
  {
    name: 'Second Floor',
    label: 'Second Floor',
    level: 2,
    widthFt: 50,
    depthFt: 50,
    blueprintPage: 1,
    fileName: 'second-floor.png',
    notes: 'Initial calibration from blueprint sheet A1, scale 1/8 inch = 1 foot.',
    sortIndex: 20,
  },
  {
    name: 'Third Floor',
    label: 'Third Floor',
    level: 3,
    widthFt: 50,
    depthFt: 50,
    blueprintPage: 2,
    fileName: 'third-floor.png',
    notes: 'Initial calibration from blueprint sheet A2, scale 1/8 inch = 1 foot.',
    sortIndex: 30,
  },
  {
    name: 'Exterior',
    label: 'Exterior',
    level: -1,
    widthFt: 80,
    depthFt: 80,
    blueprintPage: 6,
    fileName: 'site-plan.png',
    notes: 'Exterior planning area for garage, porch, and yard items.',
    sortIndex: 40,
  },
];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error(HELP.trim());
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

await ensureBucket();

const { data: existingFloorPlans, error: existingError } = await supabase
  .from('home_floor_plans')
  .select('name,notes,overlay_offset_x_ft,overlay_offset_y_ft,overlay_width_ft,overlay_depth_ft')
  .in('name', overlays.map(overlay => overlay.name));

if (existingError) {
  throw new Error(`Failed to read existing home_floor_plans: ${existingError.message}`);
}

const existingByName = new Map((existingFloorPlans || []).map(row => [row.name, row]));
const rows = [];
for (const overlay of overlays) {
  const existing = existingByName.get(overlay.name);
  const localPath = path.resolve(process.cwd(), overlayDir, overlay.fileName);
  if (!existsSync(localPath)) {
    throw new Error(`Missing overlay image: ${localPath}`);
  }

  const storagePath = `${storagePrefix}/${overlay.fileName}`;
  const bytes = readFileSync(localPath);
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload ${overlay.fileName}: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  rows.push({
    name: overlay.name,
    label: overlay.label,
    level: overlay.level,
    width_ft: overlay.widthFt,
    depth_ft: overlay.depthFt,
    blueprint_page: overlay.blueprintPage,
    blueprint_image_path: data.publicUrl,
    overlay_offset_x_ft: existing?.overlay_offset_x_ft ?? 0,
    overlay_offset_y_ft: existing?.overlay_offset_y_ft ?? 0,
    overlay_width_ft: existing?.overlay_width_ft ?? overlay.widthFt,
    overlay_depth_ft: existing?.overlay_depth_ft ?? overlay.depthFt,
    notes: existing?.notes ?? overlay.notes,
    sort_index: overlay.sortIndex,
  });
  console.log(`Uploaded ${overlay.fileName} -> ${data.publicUrl}`);
}

const { error: upsertError } = await supabase
  .from('home_floor_plans')
  .upsert(rows, { onConflict: 'name' });

if (upsertError) {
  throw new Error(`Failed to update home_floor_plans: ${upsertError.message}`);
}

console.log(`Updated ${rows.length} floor-plan overlay URLs in home_floor_plans.`);

async function ensureBucket() {
  const { error: getError } = await supabase.storage.getBucket(bucket);
  if (!getError) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ['image/png'],
    fileSizeLimit: '10485760',
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Failed to create storage bucket ${bucket}: ${createError.message}`);
  }
}

function loadEnvFile(fileName) {
  const envPath = path.resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = stripQuotes(trimmed.slice(equalsIndex + 1).trim());
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '');
}
