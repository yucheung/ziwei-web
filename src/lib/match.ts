import { astro } from 'iztro';
import { GetChartOptions } from './astro';
import { getCanonicalAstrolabe } from './chartModel';

export type IFunctionalAstrolabe = ReturnType<typeof astro.bySolar>;
export type IFunctionalPalace = IFunctionalAstrolabe['palaces'][number];

export interface PersonMatchInput extends Partial<GetChartOptions> {
  name?: string;
  date: string | Date;
  timeIndex: number | string;
  gender: 'male' | 'female' | '男' | '女' | '乾' | '坤';
}

export interface AnalyzeMatchOptions {
  personA: PersonMatchInput;
  personB: PersonMatchInput;
}

export interface PersonInfo {
  name: string;
  gender: string;
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  yearStem: string;
  yearBranch: string;
  fiveElementsClass: string;
  soulPalaceBranch: string;
  soulPalaceStem: string;
  mingMajorStars: string[];
  fuqiMajorStars: string[];
  propertyMajorStars: string[];
  wealthMajorStars: string[];
}

export type MutagenKind = '祿' | '權' | '科' | '忌';

export interface FlyingMutagenDetail {
  mutagen: MutagenKind;
  starName: string;
  targetPalaceName: string;
  targetPalaceIndex: number;
  description: string;
}

export interface CrossMutagenGroup {
  sourcePerson: string;
  targetPerson: string;
  stemType: '生年天干' | '命宮天干' | '夫妻宮天干';
  stem: string;
  details: FlyingMutagenDetail[];
}

export interface MatchCompatibility {
  overallScore: number;
  emotionalHarmony: number;
  personalityMatch: number;
  careerWealthSynergy: number;
  longtermStability: number;
  ratingLabel: string;
  branchRelation: string;
}

export interface RelationshipKeyPoints {
  mingVsMingText: string;
  mingVsFuQiText: string;
  flyingMutagenText: string;
  strengths: string[];
  risks: string[];
  advice: string[];
}

export interface MatchResult {
  personA: PersonInfo;
  personB: PersonInfo;
  compatibility: MatchCompatibility;
  crossMutagens: CrossMutagenGroup[];
  relationshipPoints: RelationshipKeyPoints;
  chartA: IFunctionalAstrolabe;
  chartB: IFunctionalAstrolabe;
}

/** 十天干名稱 */
export const HEAVENLY_STEMS_MAP: Record<string, string> = {
  甲: '甲', 乙: '乙', 丙: '丙', 丁: '丁', 戊: '戊',
  己: '己', 庚: '庚', 辛: '辛', 壬: '壬', 癸: '癸',
  jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊',
  ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸',
};

/** 十干四化對照表 */
export const MUTAGEN_STARS_MAP: Record<string, Record<MutagenKind, string>> = {
  甲: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
  乙: { 祿: '天機', 權: '天梁', 科: '紫微', 忌: '太陰' },
  丙: { 祿: '天同', 權: '天機', 科: '文昌', 忌: '廉貞' },
  丁: { 祿: '太陰', 權: '天同', 科: '天機', 忌: '巨門' },
  戊: { 祿: '貪狼', 權: '太陰', 科: '右弼', 忌: '天機' },
  己: { 祿: '武曲', 權: '貪狼', 科: '天梁', 忌: '文曲' },
  庚: { 祿: '太陽', 權: '武曲', 科: '太陰', 忌: '天同' },
  辛: { 祿: '巨門', 權: '太陽', 科: '文曲', 忌: '文昌' },
  壬: { 祿: '天梁', 權: '紫微', 科: '左輔', 忌: '武曲' },
  癸: { 祿: '破軍', 權: '巨門', 科: '太陰', 忌: '貪狼' },
};

/** 簡繁星曜名稱對映 */
const STAR_NAME_NORMALIZE: Record<string, string> = {
  廉贞: '廉貞', 破军: '破軍', 武曲: '武曲', 太阳: '太陽',
  天机: '天機', 天梁: '天梁', 紫微: '紫微', 太阴: '太陰',
  天同: '天同', 文昌: '文昌', 巨门: '巨門', 贪狼: '貪狼',
  右弼: '右弼', 文曲: '文曲', 左辅: '左輔', 天府: '天府',
  七杀: '七殺', 禄存: '祿存', 天魁: '天魁', 天钺: '天鉞',
  擎羊: '擎羊', 陀罗: '陀羅', 火星: '火星', 铃星: '鈴星', 天马: '天馬',
};

/** 規範化星曜名稱 */
export function normalizeStarName(name: string): string {
  if (!name) return '';
  return STAR_NAME_NORMALIZE[name] || name;
}

/** 提取標準天干 */
export function normalizeStem(stemInput?: string): string {
  if (!stemInput) return '甲';
  const clean = stemInput.replace(/干|Heavenly/g, '').trim();
  return HEAVENLY_STEMS_MAP[clean] || clean[0] || '甲';
}

/** 在星盤中搜尋包含指定星曜的宮位 */
export function getPalaceContainingStar(astrolabe: IFunctionalAstrolabe, starName: string): IFunctionalPalace | undefined {
  const targetNorm = normalizeStarName(starName);

  return astrolabe.palaces.find((palace) => {
    const allStars = [
      ...palace.majorStars.map((s) => normalizeStarName(s.name)),
      ...palace.minorStars.map((s) => normalizeStarName(s.name)),
      ...palace.adjectiveStars.map((s) => normalizeStarName(s.name)),
    ];
    return allStars.includes(targetNorm);
  });
}

/** 計算天干飛入目標星盤之四化細節 */
export function calculateFlyingMutagens(
  sourceStem: string,
  targetAstrolabe: IFunctionalAstrolabe,
  sourcePersonName: string,
  targetPersonName: string,
  stemType: '生年天干' | '命宮天干' | '夫妻宮天干'
): CrossMutagenGroup {
  const stem = normalizeStem(sourceStem);
  const mutagenMap = MUTAGEN_STARS_MAP[stem] || MUTAGEN_STARS_MAP['甲'];
  const mutagens: MutagenKind[] = ['祿', '權', '科', '忌'];

  const details: FlyingMutagenDetail[] = mutagens.map((mutagen) => {
    const starName = mutagenMap[mutagen];
    const targetPalace = getPalaceContainingStar(targetAstrolabe, starName);

    const palaceName = targetPalace ? targetPalace.name : '未知宮位';
    const palaceIndex = targetPalace ? targetPalace.index : 0;

    let desc = '';
    switch (mutagen) {
      case '祿':
        desc = `${sourcePersonName}的${stemType}【${stem}】化祿入${targetPersonName}的${palaceName}（${starName}），代表帶來情意、財富或順遂能量。`;
        break;
      case '權':
        desc = `${sourcePersonName}的${stemType}【${stem}】化權入${targetPersonName}的${palaceName}（${starName}），代表主導、帶動或積極督促的影響力。`;
        break;
      case '科':
        desc = `${sourcePersonName}的${stemType}【${stem}】化科入${targetPersonName}的${palaceName}（${starName}），代表文雅交流、名聲幫助與理性溝通。`;
        break;
      case '忌':
        desc = `${sourcePersonName}的${stemType}【${stem}】化忌入${targetPersonName}的${palaceName}（${starName}），代表關注執著、課業提醒或需多耐心的溝通點。`;
        break;
    }

    return {
      mutagen,
      starName,
      targetPalaceName: palaceName,
      targetPalaceIndex: palaceIndex,
      description: desc,
    };
  });

  return {
    sourcePerson: sourcePersonName,
    targetPerson: targetPersonName,
    stemType,
    stem,
    details,
  };
}

/** 地支關係計算 */
export function calculateEarthlyBranchRelation(branchA: string, branchB: string): string {
  const sanitize = (b: string) => b.replace(/宮|Earthly/g, '').trim();
  const a = sanitize(branchA);
  const b = sanitize(branchB);

  if (a === b) return '命宮同支 (比和)';

  const sanHeGroup = [
    ['申', '子', '辰'],
    ['巳', '酉', '丑'],
    ['寅', '午', '戌'],
    ['亥', '卯', '未'],
  ];
  for (const group of sanHeGroup) {
    if (group.includes(a) && group.includes(b)) {
      return '地支三合 (相生相成)';
    }
  }

  const liuHePairs: [string, string][] = [
    ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']
  ];
  for (const [x, y] of liuHePairs) {
    if ((a === x && b === y) || (a === y && b === x)) {
      return '地支六合 (暗合情深)';
    }
  }

  const liuChongPairs: [string, string][] = [
    ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']
  ];
  for (const [x, y] of liuChongPairs) {
    if ((a === x && b === y) || (a === y && b === x)) {
      return '地支六沖 (性格火花，需多包容)';
    }
  }

  const liuHaiPairs: [string, string][] = [
    ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']
  ];
  for (const [x, y] of liuHaiPairs) {
    if ((a === x && b === y) || (a === y && b === x)) {
      return '地支六害 (微有磨合，需細心照顧)';
    }
  }

  return '地支相和 (平穩順遂)';
}

/** 獲取宮位主星名稱列表 */
export function getPalaceMajorStarNames(palace?: IFunctionalPalace): string[] {
  if (!palace) return ['空宮'];
  if (!palace.majorStars || palace.majorStars.length === 0) return ['空宮'];
  return palace.majorStars.map((s: { name: string }) => normalizeStarName(s.name));
}

/** 從 Astrolabe 提取個人摘要 */
export function extractPersonInfo(astrolabe: IFunctionalAstrolabe, name: string): PersonInfo {
  const mingPalace = astrolabe.palaces.find((p) => String(p.name).includes('命')) || astrolabe.palaces[0];
  const fuqiPalace = astrolabe.palaces.find((p) => String(p.name).includes('夫妻'));
  const propertyPalace = astrolabe.palaces.find((p) => String(p.name).includes('田宅'));
  const wealthPalace = astrolabe.palaces.find((p) => String(p.name).includes('财') || String(p.name).includes('財'));

  // 解析生年天干地支
  let yearStem = '甲';
  let yearBranch = '子';
  if (astrolabe.rawDates && astrolabe.rawDates.chineseDate && astrolabe.rawDates.chineseDate.yearly) {
    const yearly = astrolabe.rawDates.chineseDate.yearly;
    yearStem = normalizeStem(yearly[0]);
    yearBranch = yearly[1] || '子';
  } else if (astrolabe.chineseDate) {
    yearStem = normalizeStem(astrolabe.chineseDate[0]);
    yearBranch = astrolabe.chineseDate[1] || '子';
  }

  return {
    name,
    gender: astrolabe.gender === 'male' || astrolabe.gender === '男' ? '乾造 (男)' : '坤造 (女)',
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate || `${yearStem}${yearBranch}年`,
    yearStem,
    yearBranch,
    fiveElementsClass: String(astrolabe.fiveElementsClass || '五行局'),
    soulPalaceBranch: mingPalace ? mingPalace.earthlyBranch : '子',
    soulPalaceStem: mingPalace ? normalizeStem(mingPalace.heavenlyStem) : '甲',
    mingMajorStars: getPalaceMajorStarNames(mingPalace),
    fuqiMajorStars: getPalaceMajorStarNames(fuqiPalace),
    propertyMajorStars: getPalaceMajorStarNames(propertyPalace),
    wealthMajorStars: getPalaceMajorStarNames(wealthPalace),
  };
}

/** 計算契合度分數 */
export function calculateCompatibility(
  personA: PersonInfo,
  personB: PersonInfo,
  crossGroups: CrossMutagenGroup[]
): MatchCompatibility {
  let emotional = 78;
  let personality = 80;
  let careerWealth = 75;
  let stability = 82;

  // 1. 地支關係調整
  const branchRelation = calculateEarthlyBranchRelation(personA.soulPalaceBranch, personB.soulPalaceBranch);
  if (branchRelation.includes('六合')) {
    emotional += 10;
    stability += 8;
  } else if (branchRelation.includes('三合')) {
    personality += 10;
    careerWealth += 8;
  } else if (branchRelation.includes('六沖')) {
    personality -= 6;
    stability -= 5;
  }

  // 2. 四化互飛加分
  crossGroups.forEach((group) => {
    group.details.forEach((item) => {
      const target = item.targetPalaceName;
      if (item.mutagen === '祿') {
        if (['命宮', '夫妻宮', '福德宮'].includes(target)) emotional += 4;
        if (['財帛宮', '田宅宮', '官祿宮'].includes(target)) careerWealth += 4;
      } else if (item.mutagen === '權') {
        if (['官祿宮', '命宮'].includes(target)) careerWealth += 3;
      } else if (item.mutagen === '科') {
        if (['命宮', '福德宮', '夫妻宮'].includes(target)) {
          emotional += 3;
          stability += 3;
        }
      } else if (item.mutagen === '忌') {
        if (['命宮', '夫妻宮'].includes(target)) {
          emotional -= 2;
          stability -= 2;
        }
      }
    });
  });

  // 邊界限制 50 - 99
  const clamp = (val: number) => Math.min(98, Math.max(55, val));
  emotional = clamp(emotional);
  personality = clamp(personality);
  careerWealth = clamp(careerWealth);
  stability = clamp(stability);

  const overallScore = Math.round((emotional * 0.35 + personality * 0.25 + careerWealth * 0.2 + stability * 0.2));

  let ratingLabel = '相輔相成';
  if (overallScore >= 90) ratingLabel = '天作之合 · 琴瑟和鳴';
  else if (overallScore >= 82) ratingLabel = '相輔相成 · 佳偶天成';
  else if (overallScore >= 72) ratingLabel = '互補磨合 · 越陳越香';
  else ratingLabel = '情深緣淺 · 需多心力';

  return {
    overallScore,
    emotionalHarmony: emotional,
    personalityMatch: personality,
    careerWealthSynergy: careerWealth,
    longtermStability: stability,
    ratingLabel,
    branchRelation,
  };
}

/** 產生關係重點與相處建議 */
export function generateRelationshipPoints(
  personA: PersonInfo,
  personB: PersonInfo,
  crossGroups: CrossMutagenGroup[],
  branchRelation: string
): RelationshipKeyPoints {
  const aStars = personA.mingMajorStars.join('、');
  const bStars = personB.mingMajorStars.join('、');
  const aFuqi = personA.fuqiMajorStars.join('、');
  const bFuqi = personB.fuqiMajorStars.join('、');

  const mingVsMingText = `${personA.name}命宮坐【${aStars}】，${personB.name}命宮坐【${bStars}】。兩位命宮地支關係為「${branchRelation}」。在性格表現上，${personA.name}與${personB.name}具備天然的對應與交流契機。`;

  const mingVsFuQiText = `${personA.name}夫妻宮主星【${aFuqi}】，對照${personB.name}命宮【${bStars}】；${personB.name}夫妻宮主星【${bFuqi}】，對照${personA.name}命宮【${aStars}】。雙方星曜相互投射，象徵著彼此符合對方心目中對另一半的潛意識期待。`;

  // 尋找特色四化
  const luHits = crossGroups.flatMap((g) => g.details.filter((d) => d.mutagen === '祿'));
  const jiHits = crossGroups.flatMap((g) => g.details.filter((d) => d.mutagen === '忌'));

  let flyingMutagenText = '雙方四化互飛氣場交融。';
  if (luHits.length > 0) {
    const topLu = luHits[0];
    flyingMutagenText += `其中${topLu.description} `;
  }
  if (jiHits.length > 0) {
    const topJi = jiHits[0];
    flyingMutagenText += `同時需要留意${topJi.description}`;
  }

  const strengths: string[] = [
    `命宮地支呈現「${branchRelation}」，基礎感情磁場穩固。`,
    `${personA.name}的四化能量為${personB.name}帶動正面氣場與成長機會。`,
    `雙方夫妻宮與對方命宮主星有所呼應，相處時容易產生熟悉感與吸引力。`,
    `事業與財運宮位互有助力，適合共同規劃長遠家庭或事業藍圖。`,
  ];

  const risks: string[] = [
    `化忌飛入相關宮位時，若遇爭執容易陷入固執己見，需及時溝通。`,
    `當工作壓力大時，留意不要將情緒轉嫁到對方身上。`,
    `雙方價值觀若有差異，宜以理性商討代替情緒化的言語碰撞。`,
  ];

  const advice: string[] = [
    `【保持傾聽】定期進行心靈溝通，分享彼此內心真實感受。`,
    `【發揮優勢】利用四化化祿的宮位優勢，多共同參與能帶來成就感的事務。`,
    `【化解磨合】遇有化忌飛入的領域，多給予對方包容與彈性空間。`,
    `【共同目標】建立共同的理財與生活目標，讓情感隨時間越加深厚。`,
  ];

  return {
    mingVsMingText,
    mingVsFuQiText,
    flyingMutagenText,
    strengths,
    risks,
    advice,
  };
}

/** 核心合盤主函式 */
export function analyzeMatch(options: AnalyzeMatchOptions): MatchResult {
  const personAName = options.personA.name || '甲方';
  const personBName = options.personB.name || '乙方';

  // 根因 C1 修復：無論呼叫端 (或 iztro 全域 i18next 狀態) 目前的顯示語言為何，
  // 合盤計算 (四化互飛、星曜比對) 一律以 zh-TW 排盤，
  // 與 MUTAGEN_STARS_MAP / STAR_NAME_NORMALIZE 等 Chinese-keyed 查表保持一致。
  const chartA = getCanonicalAstrolabe(options.personA as GetChartOptions);
  const chartB = getCanonicalAstrolabe(options.personB as GetChartOptions);

  const infoA = extractPersonInfo(chartA, personAName);
  const infoB = extractPersonInfo(chartB, personBName);

  // 四化互飛計算:
  // 1. A 生年天干 飛入 B 盤
  const cross1 = calculateFlyingMutagens(infoA.yearStem, chartB, personAName, personBName, '生年天干');
  // 2. B 生年天干 飛入 A 盤
  const cross2 = calculateFlyingMutagens(infoB.yearStem, chartA, personBName, personAName, '生年天干');
  // 3. A 命宮天干 飛入 B 盤
  const cross3 = calculateFlyingMutagens(infoA.soulPalaceStem, chartB, personAName, personBName, '命宮天干');
  // 4. B 命宮天干 飛入 A 盤
  const cross4 = calculateFlyingMutagens(infoB.soulPalaceStem, chartA, personBName, personAName, '命宮天干');

  const crossMutagens = [cross1, cross2, cross3, cross4];

  const compatibility = calculateCompatibility(infoA, infoB, crossMutagens);
  const relationshipPoints = generateRelationshipPoints(infoA, infoB, crossMutagens, compatibility.branchRelation);

  return {
    personA: infoA,
    personB: infoB,
    compatibility,
    crossMutagens,
    relationshipPoints,
    chartA,
    chartB,
  };
}
