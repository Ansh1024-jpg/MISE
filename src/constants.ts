import { PantryItem, PantryCategory } from './types';
import { PANTRY as MatrixPantry, FREE_BASICS as MatrixFreeBasics } from './flavourMatrix';

export const CATEGORIES: PantryCategory[] = [
  'Protein', 'Vegetables', 'Fruit', 'Starch', 'Fat/Dairy', 'Aromatics', 'Flavour', 'Wildcard', 'Free basics'
];

const roleToCategory: Record<string, PantryCategory> = {
  protein: 'Protein',
  vegetable: 'Vegetables',
  fruit: 'Fruit',
  starch: 'Starch',
  fat: 'Fat/Dairy',
  aromatic: 'Aromatics',
  seasoning: 'Flavour',
  wildcard: 'Wildcard'
};

export const PANTRY: PantryItem[] = [
  ...Object.entries(MatrixPantry).map(([name, profile]) => ({
    name,
    category: roleToCategory[profile.role]
  })),
  ...MatrixFreeBasics.map(name => ({
    name,
    category: 'Free basics' as PantryCategory
  }))
];

export const FREE_BASICS = MatrixFreeBasics;
