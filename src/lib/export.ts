import html2canvas from 'html2canvas';

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
  [key: string]: any;
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

/**
 * 1. 生成命盤 CSV 字串
 * 包含：基本資訊標頭 + 12 宮位詳細星曜與柱位資料
 * 回傳附帶 BOM (\uFEFF) 以使 Excel 能正常顯示 Unicode / 中文
 */
export function generateChartCsv(astrolabe: ExportAstrolabe): string {
  const lines: string[] = [];

  // UTF-8 BOM
  const bom = '\uFEFF';

  // 基本資訊段落
  lines.push('=== 紫微斗數命盤基本資料 ===');
  lines.push(`陽曆生日,${escapeCsvField(astrolabe.solarDate)}`);
  lines.push(`陰曆生日,${escapeCsvField(astrolabe.lunarDate)}`);
  lines.push(`八字干支,${escapeCsvField(astrolabe.chineseDate)}`);
  lines.push(`性別,${escapeCsvField(astrolabe.gender)}`);
  lines.push(`五行局,${escapeCsvField(astrolabe.fiveElementsClass)}`);
  lines.push(`命主,${escapeCsvField(astrolabe.soul)}`);
  lines.push(`身主,${escapeCsvField(astrolabe.body)}`);
  lines.push('');

  // 12 宮位標頭
  lines.push('=== 十二宮星曜與干支明細 ===');
  const headers = [
    '宮位名稱',
    '天干',
    '地支',
    '身宮',
    '主星(星曜/亮度/四化)',
    '輔星',
    '雜曜/乙丙丁級星',
    '長生十二神',
    '博士十二神',
    '大限歲數範圍',
  ];
  lines.push(headers.map(escapeCsvField).join(','));

  if (Array.isArray(astrolabe.palaces)) {
    for (const palace of astrolabe.palaces) {
      const majorStr = (palace.majorStars || [])
        .map((s) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[${s.mutagen}]` : ''}`)
        .join(' ');

      const minorStr = (palace.minorStars || [])
        .map((s) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[${s.mutagen}]` : ''}`)
        .join(' ');

      const adjStr = (palace.adjectiveStars || [])
        .map((s) => s.name)
        .join(' ');

      let decadalStr = '';
      if (palace.decadal?.range) {
        decadalStr = `${palace.decadal.range[0]} - ${palace.decadal.range[1]} 歲`;
      }

      const row = [
        palace.name,
        palace.heavenlyStem || '',
        palace.earthlyBranch || '',
        palace.isBodyPalace ? '是' : '否',
        majorStr || '無主星',
        minorStr,
        adjStr,
        palace.changsheng12 || '',
        palace.boshi12 || '',
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
export function generateChartSummaryText(astrolabe: ExportAstrolabe): string {
  const lines: string[] = [];

  lines.push('☯️【紫微斗數命盤摘要】☯️');
  lines.push(`📅 陽曆：${astrolabe.solarDate || '未知'}`);
  lines.push(`🌙 陰曆：${astrolabe.lunarDate || '未知'}`);
  lines.push(`📜 八字：${astrolabe.chineseDate || '未知'}`);
  lines.push(`🔮 局數：${astrolabe.fiveElementsClass || '未知'} | 性別：${astrolabe.gender || '未知'}`);
  lines.push(`✨ 命主：${astrolabe.soul || '無'} | 身主：${astrolabe.body || '無'}`);
  lines.push('----------------------------------------');
  lines.push('🏛️【十二宮星曜總覽】');

  if (Array.isArray(astrolabe.palaces)) {
    for (const palace of astrolabe.palaces) {
      const stemBranch = `${palace.heavenlyStem || ''}${palace.earthlyBranch || ''}`;
      const bodyTag = palace.isBodyPalace ? ' [身宮]' : '';

      const majorFormatted = (palace.majorStars || []).length > 0
        ? (palace.majorStars || [])
            .map((s) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[${s.mutagen}]` : ''}`)
            .join(' ')
        : '無主星';

      const minorFormatted = (palace.minorStars || []).length > 0
        ? ` | 輔星: ` + (palace.minorStars || [])
            .map((s) => `${s.name}${s.mutagen ? `[${s.mutagen}]` : ''}`)
            .join(' ')
        : '';

      const decadalFormatted = palace.decadal?.range
        ? ` (大限 ${palace.decadal.range[0]}~${palace.decadal.range[1]}歲)`
        : '';

      lines.push(`• ${palace.name} (${stemBranch})${bodyTag}${decadalFormatted}: ${majorFormatted}${minorFormatted}`);
    }
  }

  lines.push('----------------------------------------');
  lines.push('💡 由 紫微斗數 Web 專業版 自動生成');

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

export function downloadChartCsv(astrolabe: ExportAstrolabe, filename?: string): void {
  const csvContent = generateChartCsv(astrolabe);
  const fname = filename || `ziwei_astrolabe_${astrolabe.solarDate || 'chart'}.csv`;
  downloadFile(csvContent, fname, 'text/csv;charset=utf-8');
}

export function downloadChartSummaryText(astrolabe: ExportAstrolabe, filename?: string): void {
  const summaryContent = generateChartSummaryText(astrolabe);
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
