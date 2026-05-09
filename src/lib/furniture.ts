import type { FurnitureType } from '@/lib/types';

export const FURNITURE_TYPE_OPTIONS: { value: FurnitureType; label: string }[] = [
  { value: 'bed', label: 'Bed' },
  { value: 'crib', label: 'Crib' },
  { value: 'sofa', label: 'Sofa' },
  { value: 'sectional', label: 'Sectional' },
  { value: 'chair', label: 'Chair' },
  { value: 'dining_table', label: 'Dining Table' },
  { value: 'coffee_table', label: 'Coffee Table' },
  { value: 'side_table', label: 'Side Table' },
  { value: 'desk', label: 'Desk' },
  { value: 'dresser', label: 'Dresser' },
  { value: 'bookcase', label: 'Bookcase' },
  { value: 'tv_stand', label: 'TV Stand' },
  { value: 'storage', label: 'Storage' },
  { value: 'rug', label: 'Rug' },
  { value: 'lamp', label: 'Lamp' },
  { value: 'plant', label: 'Plant' },
  { value: 'box', label: 'General Item' },
];

const FURNITURE_TYPE_VALUES = new Set(FURNITURE_TYPE_OPTIONS.map(option => option.value));

export function furnitureTypeLabel(type: FurnitureType | null | undefined) {
  return FURNITURE_TYPE_OPTIONS.find(option => option.value === type)?.label ?? 'General Item';
}

export function normaliseFurnitureType(value: unknown, itemName?: string | null): FurnitureType {
  if (typeof value === 'string' && FURNITURE_TYPE_VALUES.has(value as FurnitureType)) {
    return value as FurnitureType;
  }

  return inferFurnitureType(itemName);
}

export function inferFurnitureType(itemName?: string | null): FurnitureType {
  const label = String(itemName ?? '').toLowerCase();

  if (label.includes('crib')) return 'crib';
  if (label.includes('sectional')) return 'sectional';
  if (label.includes('sofa') || label.includes('couch') || label.includes('loveseat')) return 'sofa';
  if (label.includes('recliner') || label.includes('chair') || label.includes('glider') || label.includes('stool')) return 'chair';
  if (label.includes('mattress') || label.includes('bed frame') || /\bbed\b/.test(label) || label.includes('headboard')) return 'bed';
  if (label.includes('coffee table')) return 'coffee_table';
  if (label.includes('side table') || label.includes('end table') || label.includes('nightstand')) return 'side_table';
  if (label.includes('dining') || label.includes('kitchen table') || label.includes('table set')) return 'dining_table';
  if (label.includes('desk') || label.includes('workstation')) return 'desk';
  if (label.includes('dresser') || label.includes('drawer') || label.includes('wardrobe') || label.includes('armoire')) return 'dresser';
  if (label.includes('bookcase') || label.includes('bookshelf') || label.includes('shelving') || label.includes('shelves')) return 'bookcase';
  if (label.includes('tv stand') || label.includes('media console') || label.includes('entertainment console')) return 'tv_stand';
  if (label.includes('cabinet') || label.includes('storage') || label.includes('trunk') || label.includes('toy chest')) return 'storage';
  if (label.includes('rug') || label.includes('runner')) return 'rug';
  if (label.includes('lamp') || label.includes('lighting')) return 'lamp';
  if (label.includes('plant') || label.includes('planter')) return 'plant';
  if (label.includes('table')) return 'dining_table';

  return 'box';
}
