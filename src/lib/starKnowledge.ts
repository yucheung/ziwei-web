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
    school: 'sanhe',
    reviewedBy: null,
    status: 'collected',
  };
}

function checkedSource(excerpt: string): KnowledgeSource {
  return {
    library: 'iztro-sanhe-v1',
    school: 'classical_ziwei',
    reference:
      'https://zh.wikisource.org/wiki/%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/%E5%8D%B7%E4%B8%80#%E8%AF%B8%E6%98%9F%E5%95%8F%E7%AD%94%E8%AB%96',
    excerpt,
    page: '卷一·諸星問答論',
    reviewedBy: null,
    status: 'source_checked',
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
  createStarKnowledge(
    '天機',
    'tianji',
    'major',
    '木',
    ['廟', '旺', '得', '利', '平', '陷'],
    '紫微系',
    checkedSource('問天機所主如何？答曰：天機屬木，南斗第三益算之善星也。後化氣曰善，又得地合之行事，解諸星之順逆。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '太陽',
    'taiyang',
    'major',
    '火',
    ['廟', '旺', '得', '不', '陷'],
    '紫微系',
    checkedSource('問太陽所主若何？答曰：太陽星屬火，日之精也。乃造化之表儀，在數主人有貴氣，能為文為武。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '武曲',
    'wuqu',
    'major',
    '金',
    ['廟', '旺', '得', '利', '平'],
    '紫微系',
    checkedSource('問武曲星所主為何？答曰：武曲北斗第六星，屬金，乃財帛宮主。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '天同',
    'tiantong',
    'major',
    '水',
    ['廟', '旺', '利', '平', '不', '陷'],
    '紫微系',
    checkedSource('問天同星所主若何？答曰：天同星屬水，乃南方第四星也，為福德宮之主宰。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '廉貞',
    'lianzhen',
    'major',
    '火',
    ['廟', '利', '平', '陷'],
    '紫微系',
    checkedSource('問廉貞所主若何？答曰：廉貞屬火，北斗第五星也。在斗司品秩，在數司權令。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '天府',
    'tianfu',
    'major',
    '土',
    ['廟', '旺', '得'],
    '天府系',
    checkedSource('問天府所主若何？答曰：天府屬土，南斗主令第一星也。為財帛之主宰，在斗司福權之宿，會吉皆為富貴之基，定作文昌之論。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '太陰',
    'taiyin',
    'major',
    '水',
    ['廟', '旺', '利', '不', '陷'],
    '天府系',
    checkedSource('問太陰星所主若何？答曰：太陰乃水之精，為田宅主，化富，與日為配。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '貪狼',
    'tanlang',
    'major',
    '木',
    ['廟', '旺', '利', '平', '陷'],
    '天府系',
    checkedSource('問貪狼所主若何？答曰：貪狼北斗解厄之神，第一星也。屬水，化氣為桃花，為標準，乃主禍福之神。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '巨門',
    'jumen',
    'major',
    '水',
    ['廟', '旺', '不', '陷'],
    '天府系',
    checkedSource('問巨門所主若何？答曰：巨門屬水、金。北斗第二星也，為陰精之星，化氣為暗。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '天相',
    'tianxiang',
    'major',
    '水',
    ['廟', '得', '陷'],
    '天府系',
    checkedSource('問天相星所主若何？答曰：天相屬水，南斗第五星也。為司爵之宿，為福善，化氣曰印，是為官祿文星，佐帝之位。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '天梁',
    'tianliang',
    'major',
    '木',
    ['廟', '旺', '得', '陷'],
    '天府系',
    checkedSource('問天梁星所主若何？答曰：天梁屬土，南斗第二星也。司壽化氣為蔭為福壽，乃父母之主命化暴戾為祥和。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '七殺',
    'qisha',
    'major',
    '金',
    ['廟', '旺', '平'],
    '天府系',
    checkedSource('問七殺星所主若何？答曰：七殺南斗第六星也，屬火、金。乃斗中之上將，實成敗之孤辰。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '破軍',
    'pojun',
    'major',
    '水',
    ['廟', '旺', '得', '平', '陷'],
    '天府系',
    checkedSource('問破軍所主若何？答曰：破軍屬水，北斗第七星也，司夫妻、子息、奴僕之神。居子午入廟，在天為殺氣，在數為耗星，故化氣曰耗。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '文昌',
    'wenchang',
    'auspicious',
    '金',
    ['廟', '得', '利', '陷'],
    '六吉星',
    checkedSource('問文昌星所主若何？答曰：文昌主科甲，守身命主人幽閑儒雅，清秀魁梧，博文廣記，機變異常，一舉成名，披緋衣紫，福壽雙全。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '文曲',
    'wenqu',
    'auspicious',
    '水',
    ['廟', '旺', '得', '平', '陷'],
    '六吉星',
    checkedSource('问文曲星所主若何？答曰：文曲属水，北斗第四星也，主科甲文车之宿。其象属水，与文昌同协，吉数最为祥，临身命中作科第之客。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '左輔',
    'zuofu',
    'auspicious',
    '土',
    ['廟', '旺', '得', '利'],
    '六吉星',
    checkedSource('问左辅所主若何？希夷先生答曰：左辅帝极主宰之星，守身命诸宫降福。主人形貌敦厚慷慨风流。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '右弼',
    'youbi',
    'auspicious',
    '水',
    ['廟', '旺', '得', '利'],
    '六吉星',
    checkedSource('问右弼所主若何？希夷先生答曰：右弼帝极主宰之星，守身命文墨精通。紫府吉星同垣，财官双美，文武双全。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '天魁',
    'tiankui',
    'auspicious',
    '火',
    ['廟', '旺', '得', '利'],
    '六吉星',
    checkedSource('问天魁天钺星所主若何？希夷先生答曰：魁钺斗中司科之星，入命坐贵向贵，或得左右吉聚无不富贵。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '天鉞',
    'tianyue',
    'auspicious',
    '火',
    ['廟', '旺', '得', '利'],
    '六吉星',
    checkedSource('问天魁天钺星所主若何？希夷先生答曰：魁钺斗中司科之星，入命坐贵向贵，或得左右吉聚无不富贵。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '祿存',
    'lucun',
    'auspicious',
    '土',
    ['廟', '旺', '得', '平'],
    '六吉星',
    checkedSource('问禄存星所主若何？希夷先生答曰：禄存北斗第三星，真人之宿，主人贵爵，掌人寿基。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '擎羊',
    'qingyang',
    'inauspicious',
    '金',
    ['廟', '陷'],
    '六煞星',
    checkedSource('问擎羊星所主若何？希夷先生答曰：擎羊北斗之助星。守身命性粗行暴，孤单，视亲为疏，翻恩为怨。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '陀羅',
    'tuoluo',
    'inauspicious',
    '金',
    ['廟', '陷'],
    '六煞星',
    checkedSource('问陀罗星所主若何？希夷先生答曰：陀罗北斗之助星。守身命心行不正，暗泪长流，性刚威猛，作事进退。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '火星',
    'huoxing',
    'inauspicious',
    '火',
    ['廟', '利', '得', '陷'],
    '六煞星',
    checkedSource('问火星所主若何？答曰：火星乃南斗浮星也。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge(
    '鈴星',
    'lingxing',
    'inauspicious',
    '火',
    ['廟', '利', '得', '陷'],
    '六煞星',
    checkedSource('问铃星所主若何？答曰：铃星乃南斗助星也。'),
    'sanhe',
    0.7,
  ),
  createStarKnowledge('地空', 'dikong', 'inauspicious', '火', ['廟', '陷'], '六煞星'),
  createStarKnowledge(
    '地劫',
    'dijie',
    'inauspicious',
    '火',
    ['廟', '陷'],
    '六煞星',
    checkedSource('问天空地劫所主若何？希夷先生曰：二星守身命，遇吉则吉，遇凶则凶。如四杀冲照，轻者下贱，重者六畜之命。'),
    'sanhe',
    0.7,
  ),
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
