import type { AnalyzedChart } from '../lib/chartAnalyzer';
import { canonicalPalaceName } from '../lib/rules/chartFacts';
import { getPalaceKnowledge } from '../lib/palaceKnowledge';
import type { DecadalItem, HoroscopeSummary } from '../lib/fortunes';

export interface FortuneTimelinePeriod {
  index: number;
  range: [number, number];
  rangeText: string;
  palace: string;
  stemBranch: string;
  stars: string[];
  mutagens: DecadalItem['mutagen'];
  themes: string[];
  isCurrent: boolean;
}

function getKnowledgeThemes(chart: AnalyzedChart, palaceName: string): string[] {
  const canonicalName = canonicalPalaceName(chart, palaceName);
  const knowledge = getPalaceKnowledge(canonicalName)
    ?? getPalaceKnowledge(canonicalName.replace(/宮$/u, ''));
  return knowledge ? [...knowledge.themes] : [];
}

/** Project the authoritative HoroscopeSummary decadal table into timeline data. */
export function buildFortuneTimeline(
  chart: AnalyzedChart,
  horoscope: HoroscopeSummary,
): FortuneTimelinePeriod[] {
  return horoscope.decadalTable.map((item) => {
    const palaceName = item.palaceName
      || chart.palaces.find((palace) => palace.index === item.index)?.name
      || '';

    return {
      index: item.index,
      range: [item.range[0], item.range[1]],
      rangeText: item.rangeText,
      palace: palaceName,
      stemBranch: item.stemBranch,
      stars: [...item.majorStars],
      mutagens: { ...item.mutagen },
      themes: getKnowledgeThemes(chart, palaceName),
      isCurrent: item.isCurrent,
    };
  });
}
