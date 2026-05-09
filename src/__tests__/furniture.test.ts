import { describe, expect, it } from 'vitest';
import { inferFurnitureType, normaliseFurnitureType } from '@/lib/furniture';

describe('furniture helpers', () => {
  it('infers common item shapes from names', () => {
    expect(inferFurnitureType('Burrow sectional couch')).toBe('sectional');
    expect(inferFurnitureType('Walnut media console')).toBe('tv_stand');
    expect(inferFurnitureType('Nursery crib')).toBe('crib');
    expect(inferFurnitureType('Office bookshelves')).toBe('bookcase');
    expect(inferFurnitureType('Porch patio chair')).toBe('patio_chair');
    expect(inferFurnitureType('Weber grill')).toBe('grill');
  });

  it('preserves stored furniture types before falling back to inference', () => {
    expect(normaliseFurnitureType('dresser', 'Sofa')).toBe('dresser');
    expect(normaliseFurnitureType(null, 'Sofa')).toBe('sofa');
    expect(normaliseFurnitureType('unknown', 'Unlabeled tote')).toBe('box');
  });
});
