import type { MatchConclusion, MatchRuleResult } from './types';

export type SensitivityLevel = MatchConclusion['sensitivity'];

export interface AssertionBoundary {
  topic: string;
  level: SensitivityLevel;
  allowedPhrasing: string[];
  forbiddenPhrasing: string[];
  disclaimer: string;
}

export const MARRIAGE_BOUNDARY: AssertionBoundary = {
  topic: '婚姻',
  level: 'high',
  allowedPhrasing: ['互動傾向', '溝通與相處參考'],
  forbiddenPhrasing: ['保證婚姻結果', '斷言必然結婚或離婚'],
  disclaimer: '此內容僅反映命盤互動傾向，不能保證婚姻結果，請以雙方溝通與實際相處為準。',
};

export const WEALTH_BOUNDARY: AssertionBoundary = {
  topic: '財富',
  level: 'high',
  allowedPhrasing: ['財務傾向', '風險與規劃參考'],
  forbiddenPhrasing: ['保證獲利', '斷言必然破財'],
  disclaimer: '此內容僅提供財務傾向與規劃參考，不保證獲利或損益，請審慎評估並尋求合格專業意見。',
};

export const HEALTH_BOUNDARY: AssertionBoundary = {
  topic: '健康',
  level: 'high',
  allowedPhrasing: ['健康關注', '留意身心狀態'],
  forbiddenPhrasing: ['診斷疾病', '取代醫療建議'],
  disclaimer: '此內容僅提供健康關注方向，不是醫療診斷或治療建議；如有疑慮請諮詢合格醫療專業人員。',
};

export const LONGEVITY_BOUNDARY: AssertionBoundary = {
  topic: '壽命',
  level: 'high',
  allowedPhrasing: ['生活照護', '風險意識參考'],
  forbiddenPhrasing: ['預測壽命', '斷言死亡時間'],
  disclaimer: '此內容不預測壽命或死亡時間，請以當下的照護、專業建議與實際情況為準。',
};

export const HIGH_SENSITIVITY_BOUNDARIES: AssertionBoundary[] = [
  MARRIAGE_BOUNDARY,
  WEALTH_BOUNDARY,
  HEALTH_BOUNDARY,
  LONGEVITY_BOUNDARY,
];

export const GENERIC_HIGH_SENSITIVITY_BOUNDARY: AssertionBoundary = {
  topic: '一般高敏感議題',
  level: 'high',
  allowedPhrasing: ['趨勢參考', '提醒與觀察方向'],
  forbiddenPhrasing: ['絕對斷言', '保證結果'],
  disclaimer: '此內容僅供趨勢與觀察方向參考，不構成確定預測、專業診斷或決策依據，請以實際情況與合格專業意見為準。',
};

const BOUNDARY_BY_TOPIC = new Map(
  HIGH_SENSITIVITY_BOUNDARIES.map((boundary) => [boundary.topic, boundary])
);

function boundaryFor(conclusion: MatchConclusion): AssertionBoundary {
  return (conclusion.topic && BOUNDARY_BY_TOPIC.get(conclusion.topic))
    || GENERIC_HIGH_SENSITIVITY_BOUNDARY;
}

function applyConclusionBoundary(conclusion: MatchConclusion): MatchConclusion {
  if (conclusion.sensitivity !== 'high' || conclusion.disclaimer?.trim()) {
    return { ...conclusion };
  }

  return {
    ...conclusion,
    disclaimer: boundaryFor(conclusion).disclaimer,
  };
}

/** Add high-sensitivity disclaimers without mutating rule results or evidence. */
export function applySensitivityBoundaries(results: MatchRuleResult[]): MatchRuleResult[] {
  return results.map((result) => ({
    ...result,
    conclusions: result.conclusions.map(applyConclusionBoundary),
  }));
}
