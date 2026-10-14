import type { UnitSystem } from '@/context/AppState';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function kgToDisplayWeight(weightKg: number, unit: UnitSystem): number {
  const value = unit === 'Imperial' ? weightKg / KG_PER_LB : weightKg;
  return Math.round(value * 10) / 10;
}

export function displayWeightToKg(weight: number, unit: UnitSystem): number {
  return unit === 'Imperial' ? weight * KG_PER_LB : weight;
}

export function formatWeight(weightKg: number, unit: UnitSystem, digits = 1): string {
  return kgToDisplayWeight(weightKg, unit).toFixed(digits);
}

export function cmToDisplayHeight(heightCm: number, unit: UnitSystem): number {
  return Math.round((unit === 'Imperial' ? heightCm / CM_PER_IN : heightCm) * 10) / 10;
}

export function displayHeightToCm(height: number, unit: UnitSystem): number {
  return unit === 'Imperial' ? height * CM_PER_IN : height;
}

export function weightUnitLabel(unit: UnitSystem): string {
  return unit === 'Imperial' ? 'lb' : 'kg';
}

export function heightUnitLabel(unit: UnitSystem): string {
  return unit === 'Imperial' ? 'in' : 'cm';
}
