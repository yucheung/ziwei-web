import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import type { AnalyzedChart } from '../lib/chartAnalyzer';
import type { HoroscopeSummary } from '../lib/fortunes';
import { FortuneChart } from './FortuneChart';
import { buildFortuneTimeline } from './fortuneTimeline';

function makeChart(): AnalyzedChart {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-07T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '2000-08-16', timeIndex: 2, gender: 'male' },
    palaces: [
      {
        index: 0,
        name: '官祿',
        heavenlyStem: '甲',
        earthlyBranch: '子',
        isBodyPalace: false,
        isOriginalPalace: false,
        majorStars: [{ starName: '紫微' }],
        minorStars: [],
        adjectiveStars: [],
      },
      {
        index: 1,
        name: '財帛',
        heavenlyStem: '乙',
        earthlyBranch: '丑',
        isBodyPalace: false,
        isOriginalPalace: false,
        majorStars: [{ starName: '武曲' }],
        minorStars: [],
        adjectiveStars: [],
      },
    ],
    mutagens: { entries: [] },
    patterns: { patterns: [] },
  };
}

function makeHoroscope(): HoroscopeSummary {
  return {
    solarDate: '2026-08-07',
    lunarDate: '二〇二六年六月廿四',
    nominalAge: 27,
    decadal: {
      index: 0,
      name: '官祿',
      stemBranch: '甲子',
      mutagen: { lu: '廉貞', quan: '破軍', ke: '武曲', ji: '太陽' },
      palaceNames: ['官祿', '財帛'],
    },
    yearly: {
      index: 0,
      name: '官祿',
      stemBranch: '丙午',
      mutagen: { lu: '天同', quan: '天機', ke: '文昌', ji: '廉貞' },
      palaceNames: ['官祿', '財帛'],
    },
    monthly: {
      index: 0,
      name: '流月',
      stemBranch: '乙未',
      mutagen: { lu: '天機', quan: '天梁', ke: '紫微', ji: '太陰' },
      palaceNames: ['官祿', '財帛'],
    },
    daily: {
      index: 0,
      name: '流日',
      stemBranch: '丙申',
      mutagen: { lu: '天同', quan: '天機', ke: '文昌', ji: '廉貞' },
      palaceNames: ['官祿', '財帛'],
    },
    hourly: {
      index: 0,
      name: '流時',
      stemBranch: '丁酉',
      mutagen: { lu: '太陰', quan: '天同', ke: '天機', ji: '巨門' },
      palaceNames: ['官祿', '財帛'],
    },
    palaceScopeStars: {},
    decadalTable: [
      {
        index: 0,
        palaceName: '官祿',
        heavenlyStem: '甲',
        earthlyBranch: '子',
        stemBranch: '甲子',
        range: [3, 12],
        rangeText: '3 - 12 歲',
        majorStars: ['紫微'],
        mutagen: { lu: '廉貞', quan: '破軍', ke: '武曲', ji: '太陽' },
        isCurrent: true,
      },
      {
        index: 1,
        palaceName: '財帛',
        heavenlyStem: '乙',
        earthlyBranch: '丑',
        stemBranch: '乙丑',
        range: [13, 22],
        rangeText: '13 - 22 歲',
        majorStars: ['武曲'],
        mutagen: { lu: '天機', quan: '天梁', ke: '紫微', ji: '太陰' },
        isCurrent: false,
      },
    ],
    rawHoroscope: {} as HoroscopeSummary['rawHoroscope'],
  };
}

describe('FortuneChart', () => {
  it('maps every decadal table item into a timeline period with themes and four transformations', () => {
    const periods = buildFortuneTimeline(makeChart(), makeHoroscope());

    expect(periods).toHaveLength(2);
    expect(periods[0]).toMatchObject({
      range: [3, 12],
      palace: '官祿',
      stars: ['紫微'],
      mutagens: { lu: '廉貞', quan: '破軍', ke: '武曲', ji: '太陽' },
      isCurrent: true,
    });
    expect(periods[0].themes).toContain('職業方向');
  });

  it('uses the analyzed palace name when a decadal item omits its name', () => {
    const horoscope = makeHoroscope();
    horoscope.decadalTable[0].palaceName = '';

    const [period] = buildFortuneTimeline(makeChart(), horoscope);

    expect(period.palace).toBe('官祿');
    expect(period.themes).toContain('職業方向');
  });

  it('shows the selected period details after a timeline item is clicked', () => {
    render(
      <I18nProvider defaultLocale="zh-TW">
        <FortuneChart chart={makeChart()} horoscope={makeHoroscope()} />
      </I18nProvider>,
    );

    expect(screen.getByText('大限流分析圖')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 - 12 歲.*官祿/u })).toHaveTextContent('紫微');
    expect(screen.getByRole('button', { name: /13 - 22 歲.*財帛/u })).toHaveTextContent('武曲');

    fireEvent.click(screen.getByRole('button', { name: /13 - 22 歲.*財帛/u }));

    expect(screen.getByRole('region', { name: '選取的大限詳情' })).toHaveTextContent('財帛');
    expect(screen.getByRole('region', { name: '選取的大限詳情' })).toHaveTextContent('天機');
    expect(screen.getByRole('region', { name: '選取的大限詳情' })).toHaveTextContent('收入模式');
  });
});
