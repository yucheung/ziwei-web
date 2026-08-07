/**
 * chartModel.ts — 語系無關 Domain Model 層 (Anti-Corruption Layer)
 *
 * 背景 (根因 C1)：
 * iztro 的『顯示字串』(palace.name / star.name / heavenlyStem / brightness ...)
 * 會依 GetChartOptions.language 而變動 (zh-TW / zh-CN / ...)。
 * 但 flying.ts / fortunes.ts / match.ts 內部的四化查表 (MUTAGEN_TABLE / STEM_MUTAGENS ...)
 * 全部是用「繁體中文」字串當作查表 key。當使用者以簡體模式排盤時，
 * 這些函式收到的是簡體顯示字串 (貪狼→贪狼、祿→禄)，導致查表全部失敗
 * (四化/飛星/命宮定位錯誤)。
 *
 * 解法：
 * 1. 排盤永遠以 zh-TW 為準 (getCanonicalAstrolabe)，
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
export type AppLocale = 'zh-TW' | 'zh-CN';

/** 四化類型 (zh-TW 為 canonical key) */
type MutagenKey = '祿' | '權' | '科' | '忌';

/** 可翻譯的分類 */
export type TranslationCategory =
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
// 靜態對映表 (zh-TW canonical key → zh-CN 顯示字串)
// 直接由 iztro 內建 i18n locale 資源 (node_modules/iztro/lib/i18n/locales) 的
// zh-TW / zh-CN 兩份字典逐鍵配對產生，確保與 iztro 實際輸出的簡體字串完全一致。
//
// 只列出「繁簡字形不同」的條目：translateKey / toCanonicalKey 查無對映時會回傳
// 原字串，而字形相同的詞 (紫微、天府、文昌、干支、五行局、男/女 ...) 正好就是
// 恆等對映，因此省略不影響正確性，也讓表格只呈現真正需要轉換的部分。
//
// 已驗證 (見 chartModel.test.ts)：每張表的值皆唯一，且沒有任何簡體值恰好等於
// 另一個不同詞的繁體 key，因此 REVERSE_DICTS 反查一律可還原出唯一的 canonical key。
// (先前的英文對映表因 iztro 英文字典存在同名碰撞，必須刻意捨去十二神一側；
// 簡體對映無此問題，故為完整覆蓋。)
// ─────────────────────────────────────────────────────────────

const STAR_ZH_TW_TO_CN: Record<string, string> = {
  '天機': '天机', '太陽': '太阳', '廉貞': '廉贞', '太陰': '太阴', '貪狼': '贪狼',
  '巨門': '巨门', '七殺': '七杀', '破軍': '破军', '左輔': '左辅', '祿存': '禄存',
  '天馬': '天马', '陀羅': '陀罗', '鈴星': '铃星', '天鉞': '天钺', '劫殺': '劫杀',
  '陰煞': '阴煞', '天虛': '天虚', '龍池': '龙池', '鳳閣': '凤阁', '紅鸞': '红鸾',
  '台輔': '台辅', '封誥': '封诰', '天貴': '天贵', '天壽': '天寿', '天傷': '天伤',
  '天廚': '天厨', '長生': '长生', '冠帶': '冠带', '臨官': '临官', '絕': '绝',
  '養': '养', '青龍': '青龙', '將軍': '将军', '奏書': '奏书', '飛廉': '飞廉',
  '歲破': '岁破', '歲建': '岁建', '晦氣': '晦气', '喪門': '丧门', '貫索': '贯索',
  '龍德': '龙德', '弔客': '吊客', '將星': '将星', '歲驛': '岁驿', '華蓋': '华盖',
  '災煞': '灾煞', '運魁': '运魁', '運鉞': '运钺', '運昌': '运昌', '運曲': '运曲',
  '運鸞': '运鸾', '運喜': '运喜', '運祿': '运禄', '運羊': '运羊', '運陀': '运陀',
  '運馬': '运马', '流鉞': '流钺', '流鸞': '流鸾', '流祿': '流禄', '流馬': '流马',
  '月鉞': '月钺', '月鸞': '月鸾', '月祿': '月禄', '月馬': '月马', '日鉞': '日钺',
  '日鸞': '日鸾', '日祿': '日禄', '日馬': '日马', '時魁': '时魁', '時鉞': '时钺',
  '時昌': '时昌', '時曲': '时曲', '時鸞': '时鸾', '時喜': '时喜', '時祿': '时禄',
  '時羊': '时羊', '時陀': '时陀', '時馬': '时马',
};

const PALACE_ZH_TW_TO_CN: Record<string, string> = {
  '命宮': '命宫', '身宮': '身宫', '財帛': '财帛', '遷移': '迁移', '僕役': '仆役',
  '官祿': '官禄',
};

const MUTAGEN_ZH_TW_TO_CN: Record<string, string> = {
  '祿': '禄', '權': '权',
};

const BRIGHTNESS_ZH_TW_TO_CN: Record<string, string> = {
  '廟': '庙',
};

const ZODIAC_ZH_TW_TO_CN: Record<string, string> = {
  '龍': '龙', '馬': '马', '雞': '鸡', '豬': '猪',
};

/** 天干、地支、五行局、性別在繁簡下字形完全相同，為恆等對映 (查無對映即回傳原字串)。 */
const IDENTITY: Record<string, string> = {};

const DICTS: Record<TranslationCategory, Record<string, string>> = {
  palace: PALACE_ZH_TW_TO_CN,
  star: STAR_ZH_TW_TO_CN,
  mutagen: MUTAGEN_ZH_TW_TO_CN,
  stem: IDENTITY,
  branch: IDENTITY,
  brightness: BRIGHTNESS_ZH_TW_TO_CN,
  gender: IDENTITY,
  zodiac: ZODIAC_ZH_TW_TO_CN,
  fiveElementsClass: IDENTITY,
};

function buildReverseDict(dict: Record<string, string>): Record<string, string> {
  const reversed: Record<string, string> = {};
  for (const [zhTw, zhCn] of Object.entries(dict)) {
    reversed[zhCn] = zhTw;
  }
  return reversed;
}

const REVERSE_DICTS: Record<TranslationCategory, Record<string, string>> = {
  palace: buildReverseDict(PALACE_ZH_TW_TO_CN),
  star: buildReverseDict(STAR_ZH_TW_TO_CN),
  mutagen: buildReverseDict(MUTAGEN_ZH_TW_TO_CN),
  stem: IDENTITY,
  branch: IDENTITY,
  brightness: buildReverseDict(BRIGHTNESS_ZH_TW_TO_CN),
  gender: IDENTITY,
  zodiac: buildReverseDict(ZODIAC_ZH_TW_TO_CN),
  fiveElementsClass: IDENTITY,
};

/** 語系無關的性別 key 對映 (繁簡字形相同，故為單一張表)。 */
const GENDER_ZH_TO_KEY: Record<string, GenderKey> = {
  '男': 'male', '女': 'female',
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

/** 語系無關的性別 key */
export type GenderKey = 'male' | 'female';

/**
 * 將 iztro 的性別「顯示字串」轉為語系無關的 key。
 *
 * iztro 的 astrolabe.gender 在 zh-TW 與 zh-CN 下皆為 '男'/'女' (字形相同)，
 * 但顯示層仍不應直接比對字面值：一律經由本函式取得 key，未來新增顯示語言時
 * 只需補上 gender 對映表，呼叫端不必更動 (避免女命被誤顯示成男命的迴歸)。
 *
 * 先依 locale 反查回 zh canonical，再對照字典。無法辨識時回傳 undefined，
 * 由呼叫端決定 fallback。
 */
export function toGenderKey(display: string | undefined, locale: AppLocale): GenderKey | undefined {
  if (!display) return undefined;
  return GENDER_ZH_TO_KEY[toCanonicalKey(display, 'gender', locale)];
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

/**
 * 取得「計算用」canonical astrolabe：無論呼叫端傳入的 language 為何，
 * 一律強制以 zh-TW 排盤，確保下游 Chinese-keyed 查表 (MUTAGEN_TABLE 等) 永遠正確對應。
 */
export function getCanonicalAstrolabe(options: GetChartOptions): IFunctionalAstrolabe {
  return getChart({ ...options, language: 'zh-TW' });
}

// ─────────────────────────────────────────────────────────────
// ChartModel 建構 (B2 V1/V2)：IFunctionalAstrolabe → ChartModel
// ─────────────────────────────────────────────────────────────

function buildStarModel(star: { name: string; brightness?: string; mutagen?: string }): StarModel {
  return {
    starKey: star.name,
    brightnessKey: star.brightness || undefined,
    mutagenKey: (star.mutagen || undefined) as MutagenKey | undefined,
  };
}

function buildPalaceModel(palace: IFunctionalPalace): PalaceModel {
  return {
    index: palace.index,
    palaceKey: palace.name,
    stemKey: palace.heavenlyStem,
    branchKey: palace.earthlyBranch,
    isBodyPalace: palace.isBodyPalace,
    isOriginalPalace: palace.isOriginalPalace,
    majorStars: palace.majorStars.map(buildStarModel),
    minorStars: palace.minorStars.map(buildStarModel),
    adjectiveStars: palace.adjectiveStars.map(buildStarModel),
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
 * 將 IFunctionalAstrolabe 轉為 ChartModel (純 key 的 Domain Model)。
 *
 * 前提：傳入的 astrolabe 必須是 zh-TW canonical 排盤結果 (通常來自
 * getCanonicalAstrolabe())，否則 palaceKey/stemKey/... 會是其他顯示語言的字串，
 * 與既有查表 (STEM_MUTAGENS / MUTAGEN_TABLE) 不相容。
 */
export function buildChartModel(astrolabe: IFunctionalAstrolabe): ChartModel {
  const chineseDateYearly = (astrolabe as unknown as {
    rawDates?: { chineseDate?: { yearly?: [string, string] } };
  }).rawDates?.chineseDate?.yearly;

  const yearStemKey = chineseDateYearly?.[0] ?? astrolabe.chineseDate?.[0] ?? '';
  const yearBranchKey = chineseDateYearly?.[1] ?? astrolabe.chineseDate?.[1] ?? '';

  return {
    palaces: astrolabe.palaces.map(buildPalaceModel),
    soulKey: astrolabe.soul,
    bodyKey: astrolabe.body,
    fiveElementsKey: astrolabe.fiveElementsClass,
    yearStemKey,
    yearBranchKey,
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    gender: toGenderKey(astrolabe.gender, 'zh-TW') ?? 'male',
    soulPalaceBranchKey: astrolabe.earthlyBranchOfSoulPalace,
    astrolabe,
  };
}

// ─────────────────────────────────────────────────────────────
// 三方四正 canonical adapter (B2 V2)
// ─────────────────────────────────────────────────────────────

/**
 * 三方四正在 12 宮陣列中的索引位移，比照 iztro analyzer.js `getSurroundedPalaces`
 * 的公式：對宮 = +6，官祿位 = +4，財帛位 = +8 (皆 mod 12)。
 */
function fixIndex12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export interface SurroundedIndices {
  targetIndex: number;
  oppositeIndex: number;
  wealthIndex: number;
  careerIndex: number;
}

export function getSurroundedIndices(targetIndex: number): SurroundedIndices {
  return {
    targetIndex: fixIndex12(targetIndex),
    oppositeIndex: fixIndex12(targetIndex + 6),
    careerIndex: fixIndex12(targetIndex + 4),
    wealthIndex: fixIndex12(targetIndex + 8),
  };
}

export interface SurroundedPalaces<T> {
  target: T;
  opposite: T;
  wealth: T;
  career: T;
}

/**
 * 語系/資料型別無關的三方四正選取器：只要求陣列元素帶有 `index` 欄位。
 * 可套用在 canonical PalaceModel[]，也可套用在顯示語言的 palace 陣列 (例如
 * ChartGrid 目前使用的 PalaceData[])，取代對 astrolabe.surroundedPalaces()
 * instance method 的依賴 (消除耦合風險)。
 */
export function pickSurroundedPalaces<T extends { index: number }>(
  palaces: T[],
  targetIndex: number,
): SurroundedPalaces<T> {
  const { oppositeIndex, wealthIndex, careerIndex } = getSurroundedIndices(targetIndex);
  const byIndex = (idx: number): T => {
    const found = palaces.find((p) => p.index === idx);
    if (!found) throw new Error(`palace index ${idx} not found`);
    return found;
  };
  return {
    target: byIndex(fixIndex12(targetIndex)),
    opposite: byIndex(oppositeIndex),
    wealth: byIndex(wealthIndex),
    career: byIndex(careerIndex),
  };
}

/**
 * 三方四正 canonical adapter：將 ChartModel 的目標宮位轉為三方四正的
 * canonical PalaceModel 四件組 (target/opposite/wealth/career)。
 */
export function getSurroundingPalaces(model: ChartModel, targetIndex: number): SurroundedPalaces<PalaceModel> {
  return pickSurroundedPalaces(model.palaces, targetIndex);
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
 * 用於已經拿到一個 astrolabe (可能是 zh-CN 顯示語言) 但沒有原始排盤參數可重新以
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
 * adjectiveStars / 大限 decadal / 命主 soul / 身主 body)，使 LLM prompt 內的
 * 星曜/宮位/四化用字永遠是同一組繁體詞彙，不因使用者當下的顯示語言而變動。
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
    // 四柱/干支在 zh-TW 與 zh-CN 下字形與格式完全相同 ('庚辰 甲申 丙午 庚寅')，無需轉換
    chineseDate: astrolabe.chineseDate,
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
 * 修復非 zh-TW 顯示語言下命宮定位錯誤 (根因 C1)。
 */
export function findSoulPalaceIndex(astrolabe: {
  palaces: Array<{ earthlyBranch: string; name?: string }>;
  earthlyBranchOfSoulPalace?: string;
}): number {
  if (!astrolabe || !Array.isArray(astrolabe.palaces)) return 0;
  if (astrolabe.earthlyBranchOfSoulPalace) {
    const idx = astrolabe.palaces.findIndex((p) => p.earthlyBranch === astrolabe.earthlyBranchOfSoulPalace);
    if (idx >= 0) return idx;
  }
  // Fallback：舊行為 (比對顯示字串)，僅在缺少 earthlyBranchOfSoulPalace 時使用
  const fallbackIdx = astrolabe.palaces.findIndex(
    (p) => p.name === '命宮' || p.name === '命宫',
  );
  return fallbackIdx >= 0 ? fallbackIdx : 0;
}
