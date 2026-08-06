import html2canvas from 'html2canvas';
import { translate } from '../i18n';
import type { Locale, TranslationKey } from '../i18n';
import { translateKey, type AppLocale } from './chartModel';

/**
 * iztro 星盤與宮位資料型別定義 (相容 iztro FunctionalAstrolabe)
 */
export interface ExportStarInfo {
  name: string;
  type?: string;
  brightness?: string;
  mutagen?: string;
}

export interface ExportPalaceInfo {
  name: string;
  isBodyPalace?: boolean;
  isOriginalPalace?: boolean;
  heavenlyStem?: string;
  earthlyBranch?: string;
  majorStars?: ExportStarInfo[];
  minorStars?: ExportStarInfo[];
  adjectiveStars?: ExportStarInfo[];
  changsheng12?: string;
  boshi12?: string;
  suijian12?: string;
  jiangqian12?: string;
  decadal?: {
    range?: [number, number] | number[];
  };
  ages?: number[];
}

export interface ExportAstrolabe {
  solarDate?: string;
  lunarDate?: string;
  chineseDate?: string;
  time?: string;
  timeRange?: string;
  gender?: string;
  fiveElementsClass?: string;
  soul?: string;
  body?: string;
  earthlyBranchOfSoulPalace?: string;
  earthlyBranchOfBodyPalace?: string;
  palaces: ExportPalaceInfo[];
}

/**
 * 輔助函式：逸出 CSV 欄位中的特殊字元 (雙引號、逗號、換行)
 */
export function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function starToken(s: ExportStarInfo, appLocale: AppLocale): string {
  const name = translateKey(s.name, 'star', appLocale);
  const brightness = s.brightness ? `(${translateKey(s.brightness, 'brightness', appLocale)})` : '';
  const mutagen = s.mutagen ? `[${translateKey(s.mutagen, 'mutagen', appLocale)}]` : '';
  return `${name}${brightness}${mutagen}`;
}

/**
 * 1. 生成命盤 CSV 字串
 * 包含：基本資訊標頭 + 12 宮位詳細星曜與柱位資料
 * 回傳附帶 BOM (\uFEFF) 以使 Excel 能正常顯示 Unicode / 中文
 */
export function generateChartCsv(astrolabe: ExportAstrolabe, locale: Locale = 'zh-TW'): string {
  const appLocale: AppLocale = locale === 'en' ? 'en' : 'zh-TW';
  const tr = (key: TranslationKey) => translate(locale, key);
  const lines: string[] = [];

  // UTF-8 BOM
  const bom = '\uFEFF';

  // 基本資訊段落
  lines.push(tr('export.csvBasicHeader'));
  lines.push(`${tr('export.solarLabel')},${escapeCsvField(astrolabe.solarDate)}`);
  lines.push(`${tr('export.lunarLabel')},${escapeCsvField(astrolabe.lunarDate)}`);
  lines.push(`${tr('export.chineseDateLabel')},${escapeCsvField(astrolabe.chineseDate)}`);
  lines.push(`${tr('export.gender')},${escapeCsvField(translateKey(astrolabe.gender || '', 'gender', appLocale))}`);
  lines.push(`${tr('export.fiveElementsClass')},${escapeCsvField(translateKey(astrolabe.fiveElementsClass || '', 'fiveElementsClass', appLocale))}`);
  lines.push(`${tr('export.soulStar')},${escapeCsvField(translateKey(astrolabe.soul || '', 'star', appLocale))}`);
  lines.push(`${tr('export.bodyStar')},${escapeCsvField(translateKey(astrolabe.body || '', 'star', appLocale))}`);
  lines.push('');

  // 12 宮位標頭
  lines.push(tr('export.csvPalaceHeader'));
  const headers = [
    tr('export.palaceName'),
    tr('export.heavenlyStem'),
    tr('export.earthlyBranch'),
    tr('chart.bodyPalace'),
    tr('export.majorStars'),
    tr('export.minorStars'),
    tr('export.adjStars'),
    tr('export.changsheng12'),
    tr('export.boshi12'),
    tr('export.decadalRange'),
  ];
  lines.push(headers.map(escapeCsvField).join(','));

  if (Array.isArray(astrolabe.palaces)) {
    for (const palace of astrolabe.palaces) {
      const majorStr = (palace.majorStars || [])
        .map((s) => starToken(s, appLocale))
        .join(' ');

      const minorStr = (palace.minorStars || [])
        .map((s) => starToken(s, appLocale))
        .join(' ');

      const adjStr = (palace.adjectiveStars || [])
        .map((s) => translateKey(s.name, 'star', appLocale))
        .join(' ');

      let decadalStr = '';
      if (palace.decadal?.range) {
        decadalStr = `${palace.decadal.range[0]} - ${palace.decadal.range[1]} ${tr('export.yearsUnit')}`;
      }

      const row = [
        translateKey(palace.name, 'palace', appLocale),
        translateKey(palace.heavenlyStem || '', 'stem', appLocale),
        translateKey(palace.earthlyBranch || '', 'branch', appLocale),
        palace.isBodyPalace ? tr('export.yes') : tr('export.no'),
        majorStr || tr('export.noMajorStar'),
        minorStr,
        adjStr,
        translateKey(palace.changsheng12 || '', 'star', appLocale),
        translateKey(palace.boshi12 || '', 'star', appLocale),
        decadalStr,
      ];

      lines.push(row.map(escapeCsvField).join(','));
    }
  }

  return bom + lines.join('\r\n');
}

/** 別名相容 exportChartToCsv */
export const exportChartToCsv = generateChartCsv;

/**
 * 2. 生成命盤摘要文字 (純文字，適合複製貼上至 Telegram / Line / WeChat / 社群)
 */
export function generateChartSummaryText(astrolabe: ExportAstrolabe, locale: Locale = 'zh-TW'): string {
  const appLocale: AppLocale = locale === 'en' ? 'en' : 'zh-TW';
  const tr = (key: TranslationKey) => translate(locale, key);
  const lines: string[] = [];

  lines.push(tr('export.summaryTitle'));
  lines.push(`\u{1F4C5} ${tr('export.solarLabel')}：${astrolabe.solarDate || tr('export.unknown')}`);
  lines.push(`\u{1F319} ${tr('export.lunarLabel')}：${astrolabe.lunarDate || tr('export.unknown')}`);
  lines.push(`\u{1F4DC} ${tr('export.baziLabel')}：${astrolabe.chineseDate || tr('export.unknown')}`);
  lines.push(`\u{1F52E} ${tr('export.fiveElementsClassLabel')}：${translateKey(astrolabe.fiveElementsClass || '', 'fiveElementsClass', appLocale) || tr('export.unknown')} | ${tr('export.gender')}：${translateKey(astrolabe.gender || '', 'gender', appLocale) || tr('export.unknown')}`);
  lines.push(`✨ ${tr('export.soulStar')}：${translateKey(astrolabe.soul || '', 'star', appLocale) || tr('export.none')} | ${tr('export.bodyStar')}：${translateKey(astrolabe.body || '', 'star', appLocale) || tr('export.none')}`);
  lines.push('----------------------------------------');
  lines.push(`\u{1F3DB}️【${tr('export.overviewTitle')}】`);

  if (Array.isArray(astrolabe.palaces)) {
    for (const palace of astrolabe.palaces) {
      const stemBranch = `${translateKey(palace.heavenlyStem || '', 'stem', appLocale)}${translateKey(palace.earthlyBranch || '', 'branch', appLocale)}`;
      const bodyTag = palace.isBodyPalace ? ` [${tr('chart.bodyPalace')}]` : '';

      const majorFormatted = (palace.majorStars || []).length > 0
        ? (palace.majorStars || [])
            .map((s) => starToken(s, appLocale))
            .join(' ')
        : tr('export.noMajorStar');

      const minorFormatted = (palace.minorStars || []).length > 0
        ? ` | ${tr('export.minorStarsPrefix')}` + (palace.minorStars || [])
            .map((s) => starToken(s, appLocale))
            .join(' ')
        : '';

      const decadalFormatted = palace.decadal?.range
        ? ` (${tr('export.decadal')} ${palace.decadal.range[0]}~${palace.decadal.range[1]}${tr('export.yearsUnit')})`
        : '';

      lines.push(`• ${translateKey(palace.name, 'palace', appLocale)} (${stemBranch})${bodyTag}${decadalFormatted}: ${majorFormatted}${minorFormatted}`);
    }
  }

  lines.push('----------------------------------------');
  lines.push(`\u{1F4A1} ${tr('export.generatedBy')}`);

  return lines.join('\n');
}

/**
 * 3. 命盤分享卡 (html2canvas → PNG Base64 / Canvas)
 */
export interface ShareCardOptions {
  scale?: number;
  backgroundColor?: string | null;
  useCORS?: boolean;
  logging?: boolean;
}

export async function exportElementToCanvas(
  element: HTMLElement,
  options: ShareCardOptions = {}
): Promise<HTMLCanvasElement> {
  if (!element) {
    throw new Error('Export element is required');
  }

  const defaultOptions = {
    scale: 2,
    backgroundColor: '#020617', // slate-950
    useCORS: true,
    logging: false,
    ...options,
  };

  return await html2canvas(element, defaultOptions);
}

export async function exportShareCardToDataUrl(
  element: HTMLElement,
  options: ShareCardOptions = {}
): Promise<string> {
  const canvas = await exportElementToCanvas(element, options);
  return canvas.toDataURL('image/png');
}

/**
 * 4. 觸發瀏覽器下載檔案 Helper
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadChartCsv(astrolabe: ExportAstrolabe, filename?: string, locale: Locale = 'zh-TW'): void {
  const csvContent = generateChartCsv(astrolabe, locale);
  const fname = filename || `ziwei_astrolabe_${astrolabe.solarDate || 'chart'}.csv`;
  downloadFile(csvContent, fname, 'text/csv;charset=utf-8');
}

export function downloadChartSummaryText(astrolabe: ExportAstrolabe, filename?: string, locale: Locale = 'zh-TW'): void {
  const summaryContent = generateChartSummaryText(astrolabe, locale);
  const fname = filename || `ziwei_summary_${astrolabe.solarDate || 'chart'}.txt`;
  downloadFile(summaryContent, fname, 'text/plain;charset=utf-8');
}

export async function downloadShareCardImage(
  element: HTMLElement,
  filename?: string,
  options?: ShareCardOptions
): Promise<void> {
  const dataUrl = await exportShareCardToDataUrl(element, options);
  const fname = filename || `ziwei_share_card_${Date.now()}.png`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
