import { describe, expect, it } from 'vitest';
import { appLabel, computeStats, EMPTY_METRICS, needsBackupNudge, normalizeMetrics, type Metrics } from './metrics';
import type { CupEntry } from './types';

const cup = (id: string, captureMs: number | null = null): CupEntry => ({
  id,
  createdAt: '2026-11-20T09:00:00.000Z',
  photoUri: null,
  method: 'filter',
  placeName: null,
  venueKind: 'home',
  notes: [],
  origin: null,
  captureMs,
  score: 65,
  parts: { base: 40, effort: 25, depth: 0, discovery: 0, selectivity: 0 },
  palateTypeId: 'pourover_philosopher',
});

describe('ölçüm', () => {
  it('bozuk veri güvenli varsayılana döner', () => {
    expect(normalizeMetrics(null)).toEqual(EMPTY_METRICS);
    const m = normalizeMetrics({ newOpened: '3', shareTaps: { cup: '2' }, activeDays: ['2026-11-21', '2026-11-20', '2026-11-21', 5] });
    expect(m.newOpened).toBe(3);
    expect(m.shareTaps).toEqual({ cup: 2, wrapped: 0, palateCard: 0 });
    expect(m.activeDays).toEqual(['2026-11-20', '2026-11-21']);
  });

  it('paylaşım hedefi adları', () => {
    expect(appLabel('com.burbn.instagram.shareextension')).toBe('Instagram');
    expect(appLabel('net.whatsapp.WhatsApp.ShareExtension')).toBe('WhatsApp');
    expect(appLabel('com.apple.UIKit.activity.Message')).toBe('Mesajlar');
    expect(appLabel(undefined)).toBe('Bilinmiyor');
  });

  it('H2 paylaşım oranı, H3 süre, H4 geri dönüş, H6 ilgi', () => {
    const m: Metrics = {
      ...EMPTY_METRICS,
      activeDays: ['2026-11-01', '2026-11-02', '2026-11-09'],
      newOpened: 5,
      newSaved: 4,
      sharedCupIds: ['a', 'silinmis'],
      sharesByApp: { Instagram: 2, WhatsApp: 3 },
      clubInterestAt: '2026-11-05T10:00:00.000Z',
    };
    const s = computeStats(m, [cup('a', 6000), cup('b', 8000), cup('c', 14000), cup('d')], '2026-11-01T08:00:00.000Z', new Date(2026, 10, 21));
    expect(s.cupsShared).toBe(1);
    expect(s.shareRate).toBe(0.25);
    expect(s.medianCaptureSec).toBe(8);
    expect(s.under10sRate).toBeCloseTo(2 / 3);
    expect(s.abandonRate).toBeCloseTo(0.2);
    expect(s.daysSinceInstall).toBe(20);
    expect([s.returnedD1, s.returnedD7, s.returnedD30]).toEqual([true, true, false]);
    expect(s.topApps[0]).toEqual(['WhatsApp', 3]);
    expect(s.clubInterested).toBe(true);
  });

  it('veri yokken boş değerler', () => {
    const s = computeStats(EMPTY_METRICS, [], null);
    expect(s.shareRate).toBeNull();
    expect(s.medianCaptureSec).toBeNull();
    expect(s.daysSinceInstall).toBeNull();
  });
});

describe('yedek hatırlatması', () => {
  const base = normalizeMetrics(null);
  const now = new Date(2026, 10, 22);
  it('10 fincandan önce ya da son 30 günde yedek/erteleme varsa gösterilmez', () => {
    expect(needsBackupNudge(base, 9, now)).toBe(false);
    expect(needsBackupNudge(base, 10, now)).toBe(true);
    expect(needsBackupNudge({ ...base, lastBackupAt: new Date(2026, 10, 1).toISOString() }, 50, now)).toBe(false);
    expect(needsBackupNudge({ ...base, backupNudgeAt: new Date(2026, 9, 1).toISOString() }, 50, now)).toBe(true);
  });
});
