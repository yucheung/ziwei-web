export type StarType = 'major' | 'auspicious' | 'inauspicious';

export type FiveElement = '木' | '火' | '土' | '金' | '水';

export type StarCategory = '紫微系' | '天府系' | '六吉星' | '六煞星';

export type UnitSchool = 'sanhe' | 'classical_ziwei';

export type KnowledgeSourceStatus =
  | 'collected'
  | 'source_checked'
  | 'cross_supported'
  | 'human_approved'
  | 'disputed';

export interface KnowledgeSource {
  library: string;
  school?: UnitSchool;
  reference?: string;
  excerpt?: string;
  page?: string;
  reviewedBy: 'human' | 'opus' | null;
  reviewedAt?: string;
  status: KnowledgeSourceStatus;
}

export interface StarKnowledgeAttributes {
  element: FiveElement;
  brightnessRange: string[];
  category: StarCategory;
  /** Confidence that the cited excerpt supports the complete attributes object. */
  confidence?: number;
}

export interface StarKnowledgeEntry {
  starName: string;
  starType: StarType;
  knowledgeId: string;
  source: KnowledgeSource;
  school: UnitSchool;
  ruleSetVersion: 'sanhe-v1';
  attributes: StarKnowledgeAttributes;
}

function collectedSource(): KnowledgeSource {
  return {
    library: 'iztro-sanhe-v1',
    reviewedBy: null,
    status: 'collected',
  };
}

const HUMAN_APPROVED_ZIWEI_SOURCE: KnowledgeSource = {
  library: 'iztro-sanhe-v1',
  school: 'classical_ziwei',
  reference: 'https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E8%AF%B8%E6%98%9F%E5%95%8F%E7%AD%94%E8%AB%96',
  excerpt: '問紫微所主若何？答曰：紫微屬土，乃中天之尊星為帝座，主掌造化樞機，人生主宰。',
  page: '卷一·諸星問答論',
  reviewedBy: 'human',
  reviewedAt: '2026-08-08',
  status: 'human_approved',
};

function createStarKnowledge(
  starName: string,
  knowledgeKey: string,
  starType: StarType,
  element: FiveElement,
  brightnessRange: string[],
  category: StarCategory,
  source: KnowledgeSource = collectedSource(),
  school: UnitSchool = 'sanhe',
  attributesConfidence?: number,
): StarKnowledgeEntry {
  return {
    starName,
    starType,
    knowledgeId: `star-${knowledgeKey}`,
    source,
    school,
    ruleSetVersion: 'sanhe-v1',
    attributes: {
      element,
      brightnessRange,
      category,
      ...(attributesConfidence === undefined ? {} : { confidence: attributesConfidence }),
    },
  };
}

const STAR_KNOWLEDGE: StarKnowledgeEntry[] = [
  createStarKnowledge(
    '紫微',
    'ziwei',
    'major',
    '土',
    ['廟', '旺', '得', '平'],
    '紫微系',
    HUMAN_APPROVED_ZIWEI_SOURCE,
    'classical_ziwei',
    0.7,
  ),
  createStarKnowledge('天機', 'tianji', 'major', '木', ['廟', '旺', '得', '利', '平', '陷'], '紫微系'),
  createStarKnowledge('太陽', 'taiyang', 'major', '火', ['廟', '旺', '得', '不', '陷'], '紫微系'),
  createStarKnowledge('武曲', 'wuqu', 'major', '金', ['廟', '旺', '得', '利', '平'], '紫微系'),
  createStarKnowledge('天同', 'tiantong', 'major', '水', ['廟', '旺', '利', '平', '不', '陷'], '紫微系'),
  createStarKnowledge('廉貞', 'lianzhen', 'major', '火', ['廟', '利', '平', '陷'], '紫微系'),
  createStarKnowledge('天府', 'tianfu', 'major', '土', ['廟', '旺', '得'], '天府系'),
  createStarKnowledge('太陰', 'taiyin', 'major', '水', ['廟', '旺', '利', '不', '陷'], '天府系'),
  createStarKnowledge('貪狼', 'tanlang', 'major', '木', ['廟', '旺', '利', '平', '陷'], '天府系'),
  createStarKnowledge('巨門', 'jumen', 'major', '水', ['廟', '旺', '不', '陷'], '天府系'),
  createStarKnowledge('天相', 'tianxiang', 'major', '水', ['廟', '得', '陷'], '天府系'),
  createStarKnowledge('天梁', 'tianliang', 'major', '木', ['廟', '旺', '得', '陷'], '天府系'),
  createStarKnowledge('七殺', 'qisha', 'major', '金', ['廟', '旺', '平'], '天府系'),
  createStarKnowledge('破軍', 'pojun', 'major', '水', ['廟', '旺', '得', '平', '陷'], '天府系'),
  createStarKnowledge('文昌', 'wenchang', 'auspicious', '金', ['廟', '得', '利', '陷'], '六吉星'),
  createStarKnowledge('文曲', 'wenqu', 'auspicious', '水', ['廟', '旺', '得', '平', '陷'], '六吉星'),
  createStarKnowledge('左輔', 'zuofu', 'auspicious', '土', ['廟', '旺', '得', '利'], '六吉星'),
  createStarKnowledge('右弼', 'youbi', 'auspicious', '水', ['廟', '旺', '得', '利'], '六吉星'),
  createStarKnowledge('天魁', 'tiankui', 'auspicious', '火', ['廟', '旺', '得', '利'], '六吉星'),
  createStarKnowledge('天鉞', 'tianyue', 'auspicious', '火', ['廟', '旺', '得', '利'], '六吉星'),
  createStarKnowledge('祿存', 'lucun', 'auspicious', '土', ['廟', '旺', '得', '平'], '六吉星'),
  createStarKnowledge('擎羊', 'qingyang', 'inauspicious', '金', ['廟', '陷'], '六煞星'),
  createStarKnowledge('陀羅', 'tuoluo', 'inauspicious', '金', ['廟', '陷'], '六煞星'),
  createStarKnowledge('火星', 'huoxing', 'inauspicious', '火', ['廟', '利', '得', '陷'], '六煞星'),
  createStarKnowledge('鈴星', 'lingxing', 'inauspicious', '火', ['廟', '利', '得', '陷'], '六煞星'),
  createStarKnowledge('地空', 'dikong', 'inauspicious', '火', ['廟', '陷'], '六煞星'),
  createStarKnowledge('地劫', 'dijie', 'inauspicious', '火', ['廟', '陷'], '六煞星'),
];

const STAR_KNOWLEDGE_BY_NAME = new Map(STAR_KNOWLEDGE.map((entry) => [entry.starName, entry]));

export function getStarKnowledge(starName: string): StarKnowledgeEntry | undefined {
  return STAR_KNOWLEDGE_BY_NAME.get(starName);
}

export function getStarKnowledgeById(knowledgeId: string): StarKnowledgeEntry | undefined {
  return STAR_KNOWLEDGE.find((entry) => entry.knowledgeId === knowledgeId);
}

export function getAllStarKnowledge(): StarKnowledgeEntry[] {
  return [...STAR_KNOWLEDGE];
}
