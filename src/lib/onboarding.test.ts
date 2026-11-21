import { describe, expect, it } from 'vitest';
import { starterPalateTypeId } from './onboarding';

describe('başlangıç damak tipi', () => {
  it('tat seçildiyse tatlardan', () => {
    expect(starterPalateTypeId({ usualPlace: 'cafe', favMethod: 'milk', notes: ['fruity', 'bright'] })).toBe('floral_explorer');
  });
  it('tat yoksa yöntem + yer', () => {
    expect(starterPalateTypeId({ usualPlace: 'home', favMethod: 'filter', notes: [] })).toBe('pourover_philosopher');
    expect(starterPalateTypeId({ usualPlace: 'cafe', favMethod: 'filter', notes: [] })).toBe('third_wave_nomad');
    expect(starterPalateTypeId({ usualPlace: 'office', favMethod: 'milk', notes: [] })).toBe('oat_milk_diplomat');
  });
  it('2den fazla tat verilirse ilk ikisi kullanılır', () => {
    expect(starterPalateTypeId({ usualPlace: 'home', favMethod: 'espresso', notes: ['chocolate', 'nutty', 'bold'] })).toBe('classic_master');
  });
});
