import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings, timeLabel } from './settings';

describe('ayarlar', () => {
  it('boş/bozuk veri varsayılanlara döner', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ reminderHour: 99, haptics: 'evet', caffeineRef: '300' })).toEqual({
      ...DEFAULT_SETTINGS,
      caffeineRef: 300,
    });
  });
  it('saat etiketi', () => {
    expect(timeLabel(9, 0)).toBe('09:00');
    expect(timeLabel(20, 30)).toBe('20:30');
  });
});
