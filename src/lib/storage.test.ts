import { beforeEach, describe, expect, it } from 'vitest';
import type { StoredChart, StoredReading } from './storage';
import {
  clearAll,
  deleteChart,
  deleteReading,
  getChart,
  getReading,
  listCharts,
  listReadings,
  saveChart,
  saveReading,
} from './storage';
import type { RuleResult } from './rules/types';

const storedRule: RuleResult = {
  ruleId: 'pattern-test',
  ruleName: '測試規則',
  matched: true,
  evidence: [],
  confidence: 0.9,
};

const firstChart: StoredChart = {
  id: 'chart-1',
  name: 'First chart',
  birthData: {
    solarDate: '2000-08-16',
    calendarType: 'solar',
    isLeapMonth: false,
    hour: 6,
    gender: 'male',
    algorithm: 'zhongzhou',
    yearDivide: 'normal',
    dayDivide: 'forward',
    astroType: 'heaven',
  },
  createdAt: '2026-08-07T08:00:00.000Z',
};

const secondChart: StoredChart = {
  ...firstChart,
  id: 'chart-2',
  name: 'Second chart',
  createdAt: '2026-08-07T09:00:00.000Z',
};

const firstReading: StoredReading = {
  id: 'reading-1',
  chartId: 'chart-1',
  reading: 'First reading',
  rules: [storedRule],
  createdAt: '2026-08-07T10:00:00.000Z',
};

beforeEach(async () => {
  await clearAll();
});

describe('chart storage', () => {
  it('saves, retrieves, and updates charts by id without exposing stored references', async () => {
    await saveChart(firstChart);

    const fetched = await getChart('chart-1');
    expect(fetched).toEqual(firstChart);
    expect(await getChart('missing-chart')).toBeUndefined();

    fetched!.birthData.hour = 1;
    expect((await getChart('chart-1'))!.birthData.hour).toBe(6);

    const updated = { ...firstChart, name: 'Renamed chart' };
    await saveChart(updated);

    expect(await listCharts()).toEqual([updated]);
  });

  it('lists charts by newest creation time first', async () => {
    await saveChart(firstChart);
    await saveChart(secondChart);

    expect((await listCharts()).map((chart) => chart.id)).toEqual(['chart-2', 'chart-1']);
  });

  it('deletes a chart by id', async () => {
    await saveChart(firstChart);
    await deleteChart('chart-1');

    expect(await getChart('chart-1')).toBeUndefined();
    expect(await listCharts()).toEqual([]);
  });
});

describe('reading storage', () => {
  it('saves, retrieves, and updates readings by id', async () => {
    await saveReading(firstReading);

    expect(await getReading('reading-1')).toEqual(firstReading);
    expect(await getReading('missing-reading')).toBeUndefined();

    const updated = { ...firstReading, reading: 'Updated reading' };
    await saveReading(updated);

    expect(await listReadings()).toEqual([updated]);
  });

  it('normalizes legacy reading rules at the storage boundary', async () => {
    const legacyReading = {
      ...firstReading,
      id: 'legacy-reading',
      rules: [storedRule, { id: 'legacy-rule-only' }],
    } as unknown as StoredReading;

    await saveReading(legacyReading);

    expect(await getReading('legacy-reading')).toEqual({
      ...legacyReading,
      rules: [storedRule],
    });
    expect(await listReadings()).toEqual([{
      ...legacyReading,
      rules: [storedRule],
    }]);
  });

  it('lists readings by newest creation time and optionally filters by chart', async () => {
    const newerForFirstChart: StoredReading = {
      ...firstReading,
      id: 'reading-2',
      reading: 'Second reading',
      createdAt: '2026-08-07T11:00:00.000Z',
    };
    const readingForSecondChart: StoredReading = {
      ...firstReading,
      id: 'reading-3',
      chartId: 'chart-2',
      createdAt: '2026-08-07T12:00:00.000Z',
    };
    await saveReading(firstReading);
    await saveReading(newerForFirstChart);
    await saveReading(readingForSecondChart);

    expect((await listReadings()).map((reading) => reading.id)).toEqual([
      'reading-3',
      'reading-2',
      'reading-1',
    ]);
    expect((await listReadings('chart-1')).map((reading) => reading.id)).toEqual([
      'reading-2',
      'reading-1',
    ]);
  });

  it('deletes readings and clears both stores', async () => {
    await saveChart(firstChart);
    await saveReading(firstReading);
    await deleteReading('reading-1');
    expect(await getReading('reading-1')).toBeUndefined();

    await saveReading(firstReading);
    await clearAll();

    expect(await listCharts()).toEqual([]);
    expect(await listReadings()).toEqual([]);
  });
});
