/**
 * chartModel.ts — 語系無關 Domain Model 層 (Anti-Corruption Layer)
 *
 * 背景 (根因 C1)：
 * iztro 的『顯示字串』(palace.name / star.name / heavenlyStem / brightness ...)
 * 會依 GetChartOptions.language 而變動 (zh-TW / en-US / ...)。
 * 但 flying.ts / fortunes.ts / match.ts 內部的四化查表 (MUTAGEN_TABLE / STEM_MUTAGENS ...)
 * 全部是用「繁體中文」字串當作查表 key。當使用者以 English 模式排盤時，
 * 這些函式收到的是英文顯示字串，導致查表全部失敗 (四化/飛星/命宮定位錯誤)。
 *
 * 解法：
 * 1. 排盤永遠以 zh-TW 為準 (getCanonicalAstrolabe / getChartModel)，
 *    產出「以繁體中文字串為 key」的純 Domain Model (ChartModel)。
 *    這與現有查表 (MUTAGEN_TABLE 等) 的 key 完全一致，因此下游計算永遠正確，
 *    無論使用者實際選擇的顯示語言為何。
 * 2. 提供 (顯示字串 ←→ key) 對映層 (translateKey / toCanonicalKey)，
 *    供顯示層在需要時把 key 轉為目前 locale 的顯示文字。
 */
import { astro } from 'iztro';
import { getChart, type GetChartOptions } from './astro';

export type IFunctionalAstrolabe = ReturnType<typeof astro.bySolar>;
export type IFunctionalPalace = IFunctionalAstrolabe['palaces'][number];

/** App 端使用的 locale (對齊 src/i18n/locale.ts 的 Locale) */
export type AppLocale = 'zh-TW' | 'en';

/** 四化類型 (zh-TW 為 canonical key) */
type MutagenKey = '祿' | '權' | '科' | '忌';

/** 可翻譯的分類 */
type TranslationCategory =
  | 'palace'
  | 'star'
  | 'mutagen'
  | 'stem'
  | 'branch'
  | 'brightness'
  | 'gender'
  | 'zodiac'
  | 'fiveElementsClass';

// ─────────────────────────────────────────────────────────────
// 靜態對映表 (zh-TW canonical key → en-US 顯示字串)
// 直接取自 iztro 內建 i18n locale 資源 (node_modules/iztro/lib/i18n/locales)，
// 確保與 iztro 實際輸出的英文字串完全一致。
//
// 注意：iztro 的 en-US star locale 本身將部分不同概念對映到相同英文字串
// (例如 wuquMaj/'武曲' 與 jiangjun/'將軍' 皆為 'general'；dahao/'大耗' 與
// suipo/'歲破' 皆為 'wastrel')。這類字串在 en-US 顯示下無法被反查回唯一的
// zh-TW key，因此故意只保留「十四主星/輔星」這一側 (實際會出現在
// majorStars/minorStars、需要參與四化查表計算的字串)，捨去「十二神」側
// (將軍/歲破等，僅作為 palace.boshi12/suiqian12 等純顯示欄位，從未經過
// translateKey/toCanonicalKey 往返轉換)，避免 REVERSE_DICTS 因重複值而
// 反查出錯誤的 canonical key。
// ─────────────────────────────────────────────────────────────

const STAR_ZH_TO_EN: Record<string, string> = {
  '紫微': 'emperor', '天機': 'advisor', '太陽': 'sun', '武曲': 'general', '天同': 'fortunate',
  '廉貞': 'judge', '天府': 'empress', '太陰': 'moon', '貪狼': 'wolf', '巨門': 'advocator',
  '天相': 'minister', '天梁': 'sage', '七殺': 'marshal', '破軍': 'rebel', '左輔': 'officer',
  '右弼': 'helper', '文昌': 'scholar', '文曲': 'artist', '祿存': 'money', '天馬': 'horse',
  '擎羊': 'driven', '陀羅': 'tangled', '火星': 'impulsive', '鈴星': 'spark', '天魁': 'assistant',
  '天鉞': 'aide', '地空': 'ideologue', '地劫': 'fickle', '劫殺': 'murder', '天空': 'utopian',
  '天刑': 'serious', '天姚': 'social', '解神': 'considery', '陰煞': 'gloomy', '天喜': 'cheerful',
  '天官': 'solemn', '天福': 'lucky', '天哭': 'upset', '天虛': 'frail', '龍池': 'talented',
  '鳳閣': 'refined', '紅鸞': 'attractive', '孤辰': 'alone', '寡宿': 'lonely', '蜚廉': 'instigated',
  '破碎': 'broken', '台輔': 'honorable', '封誥': 'awarded', '天巫': 'psychic', '天月': 'sickly',
  '三台': 'senior', '八座': 'dignified', '恩光': 'grateful', '天貴': 'noble', '天才': 'gifted',
  '天壽': 'ageless', '截空': 'interrupted', '旬中': 'meditative', '旬空': 'fancied', '空亡': 'bottomless',
  '截路': 'intercepted', '月德': 'peaceful', '天傷': 'wounded', '天使': 'heaven', '天廚': 'gourmet',
  '長生': 'born', '沐浴': 'infancy', '冠帶': 'adolescence', '臨官': 'adulthood', '帝旺': 'prime',
  '衰': 'weak', '病': 'sick', '死': 'dead', '墓': 'buried', '絕': 'dissipated', '胎': 'embryo',
  '養': 'molding', '博士': 'doctor', '力士': 'sumo', '青龍': 'dragon', '小耗': 'consumer',
  '奏書': 'book', '飛廉': 'gossip', '喜神': 'happiness', '病符': 'illness',
  '大耗': 'wastrel', '伏兵': 'ambush', '官府': 'government', '歲建': 'initial',
  '晦氣': 'unlucky', '喪門': 'downcast', '貫索': 'tied', '官符': 'official', '龍德': 'virtuous',
  '白虎': 'sinister', '天德': 'blessed', '弔客': 'sorrowing', '將星': 'capable', '攀鞍': 'admired',
  '歲驛': 'varied', '息神': 'listless', '華蓋': 'religious', '劫煞': 'robbed', '災煞': 'disastery',
  '天煞': 'condemned', '指背': 'insidious', '咸池': 'passionate', '月煞': 'hapless', '亡神': 'perished',
  '運魁': 'assistant(D)', '運鉞': 'aide(D)', '運昌': 'scholar(D)', '運曲': 'artist(D)', '運鸞': 'attractive(D)',
  '運喜': 'cheerful(D)', '運祿': 'money(D)', '運羊': 'driven(D)', '運陀': 'tangled(D)', '運馬': 'horse(D)',
  '流魁': 'assistant(Y)', '流鉞': 'aide(Y)', '流昌': 'scholar(Y)', '流曲': 'artist(Y)', '流鸞': 'attractive(Y)',
  '流喜': 'cheerful(Y)', '流祿': 'money(Y)', '流羊': 'driven(Y)', '流陀': 'tangled(Y)', '流馬': 'horse(Y)',
  '年解': 'considery(Y)',
  '月魁': 'assistant(M)', '月鉞': 'aide(M)', '月昌': 'scholar(M)', '月曲': 'artist(M)', '月鸞': 'attractive(M)',
  '月喜': 'cheerful(M)', '月祿': 'money(M)', '月羊': 'driven(M)', '月陀': 'tangled(M)', '月馬': 'horse(M)',
  '日魁': 'assistant(d)', '日鉞': 'aide(d)', '日昌': 'scholar(d)', '日曲': 'artist(d)', '日鸞': 'attractive(d)',
  '日喜': 'cheerful(d)', '日祿': 'money(d)', '日羊': 'driven(d)', '日陀': 'tangled(d)', '日馬': 'horse(d)',
  '時魁': 'assistant(H)', '時鉞': 'aide(H)', '時昌': 'scholar(H)', '時曲': 'artist(H)', '時鸞': 'attractive(H)',
  '時喜': 'cheerful(H)', '時祿': 'money(H)', '時羊': 'driven(H)', '時陀': 'tangled(H)', '時馬': 'horse(H)',
};

const PALACE_ZH_TO_EN: Record<string, string> = {
  '命宮': 'soul', '身宮': 'body', '兄弟': 'siblings', '夫妻': 'spouse', '子女': 'children',
  '財帛': 'wealth', '疾厄': 'health', '遷移': 'surface', '僕役': 'friends', '官祿': 'career',
  '田宅': 'property', '福德': 'spirit', '父母': 'parents', '来因': 'origin',
};

const MUTAGEN_ZH_TO_EN: Record<string, string> = {
  '祿': 'A', '權': 'B', '科': 'C', '忌': 'D',
};

const STEM_ZH_TO_EN: Record<string, string> = {
  '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
  '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui',
};

const BRANCH_ZH_TO_EN: Record<string, string> = {
  '子': 'zi', '丑': 'chou', '寅': 'yin', '卯': 'mao', '辰': 'chen', '巳': 'si',
  '午': 'woo', '未': 'wei', '申': 'shen', '酉': 'you', '戌': 'xu', '亥': 'hai',
};

const BRIGHTNESS_ZH_TO_EN: Record<string, string> = {
  '廟': '[+3]', '旺': '[+2]', '得': '[+1]', '利': '[0]', '平': '[-1]', '不': '[-2]', '陷': '[-3]',
};

const GENDER_ZH_TO_EN: Record<string, string> = {
  '男': 'male', '女': 'female',
};

const ZODIAC_ZH_TO_EN: Record<string, string> = {
  '鼠': 'rat', '牛': 'ox', '虎': 'tiger', '兔': 'rabbit', '龍': 'dragon', '蛇': 'snake',
  '馬': 'horse', '羊': 'sheep', '猴': 'monkey', '雞': 'rooster', '狗': 'dog', '豬': 'pig',
};

const FIVE_ELEMENTS_CLASS_ZH_TO_EN: Record<string, string> = {
  '水二局': 'water 2nd', '木三局': 'wood 3rd', '金四局': 'metal 4th', '土五局': 'earth 5th', '火六局': 'fire 6th',
};

const DICTS: Record<TranslationCategory, Record<string, string>> = {
  palace: PALACE_ZH_TO_EN,
  star: STAR_ZH_TO_EN,
  mutagen: MUTAGEN_ZH_TO_EN,
  stem: STEM_ZH_TO_EN,
  branch: BRANCH_ZH_TO_EN,
  brightness: BRIGHTNESS_ZH_TO_EN,
  gender: GENDER_ZH_TO_EN,
  zodiac: ZODIAC_ZH_TO_EN,
  fiveElementsClass: FIVE_ELEMENTS_CLASS_ZH_TO_EN,
};

function buildReverseDict(dict: Record<string, string>): Record<string, string> {
  const reversed: Record<string, string> = {};
  for (const [zh, en] of Object.entries(dict)) {
    reversed[en] = zh;
  }
  return reversed;
}

const REVERSE_DICTS: Record<TranslationCategory, Record<string, string>> = {
  palace: buildReverseDict(PALACE_ZH_TO_EN),
  star: buildReverseDict(STAR_ZH_TO_EN),
  mutagen: buildReverseDict(MUTAGEN_ZH_TO_EN),
  stem: buildReverseDict(STEM_ZH_TO_EN),
  branch: buildReverseDict(BRANCH_ZH_TO_EN),
  brightness: buildReverseDict(BRIGHTNESS_ZH_TO_EN),
  gender: buildReverseDict(GENDER_ZH_TO_EN),
  zodiac: buildReverseDict(ZODIAC_ZH_TO_EN),
  fiveElementsClass: buildReverseDict(FIVE_ELEMENTS_CLASS_ZH_TO_EN),
};

/**
 * 將 zh-TW canonical key 轉為指定 locale 的顯示字串。
 * locale 為 'zh-TW' 時為 identity (key 本身就是 zh-TW 顯示字串)。
 * 查無對映時，安全地回傳原始 key (defensive fallback)。
 */
export function translateKey(key: string, category: TranslationCategory, locale: AppLocale): string {
  if (!key) return key;
  if (locale === 'zh-TW') return key;
  return DICTS[category][key] ?? key;
}

/**
 * 將指定 locale 的顯示字串轉回 zh-TW canonical key。
 * locale 為 'zh-TW' 時為 identity。
 * 查無對映時，安全地回傳原始字串 (defensive fallback，例如混合輸入或未知字串)。
 */
export function toCanonicalKey(display: string, category: TranslationCategory, locale: AppLocale): string {
  if (!display) return display;
  if (locale === 'zh-TW') return display;
  return REVERSE_DICTS[category][display] ?? display;
}

/**
 * 將 iztro 的「四柱/干支」複合字串 (例如 en-US 下的
 * 'geng chen - jia shen - bing woo - geng yin') 轉回 zh-TW canonical 格式
 * (例如 '庚辰 甲申 丙午 庚寅')。每一柱為 "天干拼音 地支拼音"，柱與柱之間以
 * ' - ' 分隔，需逐柱拆解天干/地支後分別查表還原。
 */
function toCanonicalChineseDate(display: string, locale: AppLocale): string {
  if (!display) return display;
  if (locale === 'zh-TW') return display;
  return display
    .split(' - ')
    .map((pillar) => {
      const [stem, branch] = pillar.trim().split(/\s+/);
      return `${toCanonicalKey(stem, 'stem', locale)}${toCanonicalKey(branch, 'branch', locale)}`;
    })
    .join(' ');
}

// ─────────────────────────────────────────────────────────────
// 純 key 的 Domain Model
// ─────────────────────────────────────────────────────────────

export interface StarModel {
  /** 星曜 key (zh-TW 顯示字串，例如 '紫微') */
  starKey: string;
  /** 亮度 key (zh-TW，例如 '廟')，無亮度資料時為 undefined */
  brightnessKey?: string;
  /** 生年四化 key，無四化時為 undefined */
  mutagenKey?: MutagenKey;
}

export interface DecadeModel {
  range: [number, number];
  stemKey: string;
  branchKey: string;
}

export interface PalaceModel {
  index: number;
  /** 宮位 key (zh-TW，例如 '命宮') */
  palaceKey: string;
  /** 天干 key (zh-TW，例如 '甲') */
  stemKey: string;
  /** 地支 key (zh-TW，例如 '子') */
  branchKey: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  majorStars: StarModel[];
  minorStars: StarModel[];
  adjectiveStars: StarModel[];
  decadeKey?: DecadeModel;
}

export interface ChartModel {
  palaces: PalaceModel[];
  /** 命主 key */
  soulKey: string;
  /** 身主 key */
  bodyKey: string;
  fiveElementsKey: string;
  /** 生年天干 key */
  yearStemKey: string;
  /** 生年地支 key */
  yearBranchKey: string;
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  gender: 'male' | 'female';
  /** 命宮所在的地支 key (locale 無關的命宮定位依據) */
  soulPalaceBranchKey: string;
  /** zh-TW canonical 星盤實例，供需要即時方法 (如 .horoscope()) 的計算使用 */
  astrolabe: IFunctionalAstrolabe;
}

function toStarModel(star: { name: string; brightness?: string; mutagen?: string }): StarModel {
  return {
    starKey: star.name,
    brightnessKey: star.brightness || undefined,
    mutagenKey: (star.mutagen as MutagenKey) || undefined,
  };
}

function toPalaceModel(palace: IFunctionalPalace): PalaceModel {
  return {
    index: palace.index,
    palaceKey: palace.name,
    stemKey: palace.heavenlyStem,
    branchKey: palace.earthlyBranch,
    isBodyPalace: !!palace.isBodyPalace,
    isOriginalPalace: !!palace.isOriginalPalace,
    majorStars: (palace.majorStars || []).map(toStarModel),
    minorStars: (palace.minorStars || []).map(toStarModel),
    adjectiveStars: (palace.adjectiveStars || []).map(toStarModel),
    decadeKey: palace.decadal
      ? {
          range: palace.decadal.range,
          stemKey: palace.decadal.heavenlyStem,
          branchKey: palace.decadal.earthlyBranch,
        }
      : undefined,
  };
}

/**
 * 取得「計算用」canonical astrolabe：無論呼叫端傳入的 language 為何，
 * 一律強制以 zh-TW 排盤，確保下游 Chinese-keyed 查表 (MUTAGEN_TABLE 等) 永遠正確對應。
 */
export function getCanonicalAstrolabe(options: GetChartOptions): IFunctionalAstrolabe {
  return getChart({ ...options, language: 'zh-TW' });
}

/**
 * 將一個 (已確定為 zh-TW canonical 的) astrolabe 轉換成純 key 的 ChartModel。
 */
export function astrolabeToChartModel(astrolabe: IFunctionalAstrolabe): ChartModel {
  const palaces = astrolabe.palaces.map(toPalaceModel);
  const soulPalace =
    astrolabe.palaces.find((p) => p.earthlyBranch === (astrolabe as any).earthlyBranchOfSoulPalace) ||
    astrolabe.palaces.find((p) => p.name === '命宮') ||
    astrolabe.palaces[0];

  const chineseDate = (astrolabe as any).chineseDate || '';
  const yearly = (astrolabe as any).rawDates?.chineseDate?.yearly;
  const yearStemKey = yearly?.[0] || chineseDate.charAt(0) || '甲';
  const yearBranchKey = yearly?.[1] || chineseDate.charAt(1) || '子';

  return {
    palaces,
    soulKey: (astrolabe as any).soul || '',
    bodyKey: (astrolabe as any).body || '',
    fiveElementsKey: String((astrolabe as any).fiveElementsClass || ''),
    yearStemKey,
    yearBranchKey,
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate,
    gender: (astrolabe as any).gender === 'female' || (astrolabe as any).gender === '女' ? 'female' : 'male',
    soulPalaceBranchKey: soulPalace ? soulPalace.earthlyBranch : '子',
    astrolabe,
  };
}

/**
 * 語系無關的排盤入口：無論 options.language 為何，一律以 zh-TW 排盤並回傳純 key 的 ChartModel。
 */
export function getChartModel(options: GetChartOptions): ChartModel {
  return astrolabeToChartModel(getCanonicalAstrolabe(options));
}

// ─────────────────────────────────────────────────────────────
// 與既有計算層 (flying.ts) 的介接 adapter
// ─────────────────────────────────────────────────────────────

export interface FlyingPalaceLike {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Array<{ name: string; mutagen?: string }>;
  minorStars: Array<{ name: string; mutagen?: string }>;
}

/**
 * 將 ChartModel 轉為 flying.ts 所需的 FlyingPalace[] 形狀 (欄位皆為 zh-TW key)。
 */
export function chartModelToFlyingPalaces(model: ChartModel): FlyingPalaceLike[] {
  return model.palaces.map((p) => ({
    index: p.index,
    name: p.palaceKey,
    heavenlyStem: p.stemKey,
    earthlyBranch: p.branchKey,
    majorStars: p.majorStars.map((s) => ({ name: s.starKey, mutagen: s.mutagenKey })),
    minorStars: p.minorStars.map((s) => ({ name: s.starKey, mutagen: s.mutagenKey })),
  }));
}

/**
 * 將「顯示語言不確定」的宮位陣列 (例如某個已用 locale 顯示語言排盤的 astrolabe.palaces)
 * 轉換回 zh-TW canonical key，供 flying.ts 等 Chinese-keyed 計算函式安全使用。
 *
 * 用於已經拿到一個 astrolabe (可能是 en-US 顯示語言) 但沒有原始排盤參數可重新以
 * zh-TW 排盤的情境 (例如純前端元件只收到 astrolabe prop)。
 */
export function canonicalizeFlyingPalaces(
  palaces: FlyingPalaceLike[],
  sourceLocale: AppLocale,
): FlyingPalaceLike[] {
  return palaces.map((p) => ({
    index: p.index,
    name: toCanonicalKey(p.name, 'palace', sourceLocale),
    heavenlyStem: toCanonicalKey(p.heavenlyStem, 'stem', sourceLocale),
    earthlyBranch: toCanonicalKey(p.earthlyBranch, 'branch', sourceLocale),
    majorStars: p.majorStars.map((s) => ({
      name: toCanonicalKey(s.name, 'star', sourceLocale),
      mutagen: s.mutagen ? toCanonicalKey(s.mutagen, 'mutagen', sourceLocale) : undefined,
    })),
    minorStars: p.minorStars.map((s) => ({
      name: toCanonicalKey(s.name, 'star', sourceLocale),
      mutagen: s.mutagen ? toCanonicalKey(s.mutagen, 'mutagen', sourceLocale) : undefined,
    })),
  }));
}

// ─────────────────────────────────────────────────────────────
// 與 ReadingPanel/prompts.ts (LLM 解讀) 的介接 adapter
// ─────────────────────────────────────────────────────────────

export interface ReadingStarLike {
  name: string;
  brightness?: string;
  mutagen?: string;
}

export interface ReadingPalaceLike {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace?: boolean;
  decadal?: { range: [number, number]; heavenlyStem: string; earthlyBranch: string };
  majorStars?: ReadingStarLike[];
  minorStars?: ReadingStarLike[];
  adjectiveStars?: ReadingStarLike[];
}

export interface ReadingAstrolabeLike {
  soul?: string;
  body?: string;
  gender?: string;
  zodiac?: string;
  fiveElementsClass?: string;
  chineseDate?: string;
  earthlyBranchOfSoulPalace?: string;
  earthlyBranchOfBodyPalace?: string;
  palaces: ReadingPalaceLike[];
}

/**
 * 將「顯示語言不確定」的完整命盤摘要 (供 prompts.ts 組 LLM prompt 使用) 轉換回
 * zh-TW canonical key。
 *
 * 涵蓋 canonicalizeFlyingPalaces 未涵蓋的欄位 (亮度 brightness / 雜曜
 * adjectiveStars / 大限 decadal / 命主 soul / 身主 body)，避免英文模式下 iztro
 * 原生輸出的四化字母碼 (A/B/C/D) 與亮度括號碼 (例如 [+3]) 直接混入 LLM prompt
 * ——這些編碼對 LLM 而言毫無語意，僅是 iztro 英文 UI 的縮寫顯示形式。
 */
export function canonicalizeAstrolabeForReading(
  astrolabe: ReadingAstrolabeLike,
  sourceLocale: AppLocale,
): ReadingAstrolabeLike {
  const star = (s: ReadingStarLike): ReadingStarLike => ({
    ...s,
    name: toCanonicalKey(s.name, 'star', sourceLocale),
    brightness: s.brightness ? toCanonicalKey(s.brightness, 'brightness', sourceLocale) : undefined,
    mutagen: s.mutagen ? toCanonicalKey(s.mutagen, 'mutagen', sourceLocale) : undefined,
  });

  return {
    ...astrolabe,
    soul: astrolabe.soul ? toCanonicalKey(astrolabe.soul, 'star', sourceLocale) : astrolabe.soul,
    body: astrolabe.body ? toCanonicalKey(astrolabe.body, 'star', sourceLocale) : astrolabe.body,
    gender: astrolabe.gender ? toCanonicalKey(astrolabe.gender, 'gender', sourceLocale) : astrolabe.gender,
    zodiac: astrolabe.zodiac ? toCanonicalKey(astrolabe.zodiac, 'zodiac', sourceLocale) : astrolabe.zodiac,
    fiveElementsClass: astrolabe.fiveElementsClass
      ? toCanonicalKey(astrolabe.fiveElementsClass, 'fiveElementsClass', sourceLocale)
      : astrolabe.fiveElementsClass,
    chineseDate: astrolabe.chineseDate
      ? toCanonicalChineseDate(astrolabe.chineseDate, sourceLocale)
      : astrolabe.chineseDate,
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace
      ? toCanonicalKey(astrolabe.earthlyBranchOfSoulPalace, 'branch', sourceLocale)
      : astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace
      ? toCanonicalKey(astrolabe.earthlyBranchOfBodyPalace, 'branch', sourceLocale)
      : astrolabe.earthlyBranchOfBodyPalace,
    palaces: (astrolabe.palaces || []).map((p) => ({
      ...p,
      name: toCanonicalKey(p.name, 'palace', sourceLocale),
      heavenlyStem: toCanonicalKey(p.heavenlyStem, 'stem', sourceLocale),
      earthlyBranch: toCanonicalKey(p.earthlyBranch, 'branch', sourceLocale),
      decadal: p.decadal
        ? {
            range: p.decadal.range,
            heavenlyStem: toCanonicalKey(p.decadal.heavenlyStem, 'stem', sourceLocale),
            earthlyBranch: toCanonicalKey(p.decadal.earthlyBranch, 'branch', sourceLocale),
          }
        : p.decadal,
      majorStars: (p.majorStars || []).map(star),
      minorStars: (p.minorStars || []).map(star),
      adjectiveStars: (p.adjectiveStars || []).map(star),
    })),
  };
}

/**
 * 找出命宮在 astrolabe.palaces 中的索引，使用 locale 無關的
 * `earthlyBranchOfSoulPalace` 欄位做比對 (而非比對顯示字串 '命宮')。
 * 修復英文模式下命宮定位錯誤 (根因 C1)。
 */
export function findSoulPalaceIndex(astrolabe: {
  palaces: Array<{ earthlyBranch: string }>;
  earthlyBranchOfSoulPalace?: string;
}): number {
  if (!astrolabe || !Array.isArray(astrolabe.palaces)) return 0;
  if (astrolabe.earthlyBranchOfSoulPalace) {
    const idx = astrolabe.palaces.findIndex((p) => p.earthlyBranch === astrolabe.earthlyBranchOfSoulPalace);
    if (idx >= 0) return idx;
  }
  // Fallback：舊行為 (比對顯示字串)，僅在缺少 earthlyBranchOfSoulPalace 時使用
  const fallbackIdx = (astrolabe.palaces as any[]).findIndex(
    (p) => p.name === '命宮' || p.name === '命宫',
  );
  return fallbackIdx >= 0 ? fallbackIdx : 0;
}
