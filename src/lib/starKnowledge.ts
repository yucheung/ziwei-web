export type StarType = 'major' | 'auspicious' | 'inauspicious';

export type FiveElement = '木' | '火' | '土' | '金' | '水';

export type StarCategory = '紫微系' | '天府系' | '六吉星' | '六煞星';

export interface StarKnowledgeAttributes {
  element: FiveElement;
  brightnessRange: string[];
  category: StarCategory;
}

export interface StarKnowledgeEntry {
  starName: string;
  starType: StarType;
  knowledgeId: string;
  source: 'iztro-sanhe-v1';
  school: 'sanhe';
  ruleSetVersion: 'sanhe-v1';
  attributes: StarKnowledgeAttributes;
}

function createStarKnowledge(
  starName: string,
  knowledgeKey: string,
  starType: StarType,
  element: FiveElement,
  brightnessRange: string[],
  category: StarCategory
): StarKnowledgeEntry {
  return {
    starName,
    starType,
    knowledgeId: `star-${knowledgeKey}`,
    source: 'iztro-sanhe-v1',
    school: 'sanhe',
    ruleSetVersion: 'sanhe-v1',
    attributes: { element, brightnessRange, category },
  };
}

const STAR_KNOWLEDGE: StarKnowledgeEntry[] = [
  createStarKnowledge('紫微', 'ziwei', 'major', '土', ['廟', '旺', '得', '平'], '紫微系'),
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

export function getAllStarKnowledge(): StarKnowledgeEntry[] {
  return [...STAR_KNOWLEDGE];
}
