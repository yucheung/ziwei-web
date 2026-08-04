/**
 * 紫微斗數 LLM 解讀 Prompt 產生器
 */

export type ReadingType = 'overall' | 'palaces' | 'mutagens' | 'patterns' | 'comprehensive';

export interface PromptOptions {
  type: ReadingType;
  customInstructions?: string;
  focusPalace?: string;
}

export const DEFAULT_SYSTEM_PROMPT = `你是一位精通紫微斗數（兼通三合派與飛星派）的資深命理宗師與心靈導師。
你的任務是根據使用者提供的【紫微斗數命盤結構化資料】，進行專業、精準、結構化且具建設性的命理深度解讀。

解讀原則：
1. **客觀與專業**：分析星曜廟旺利陷、三方四正照會、生年四化（祿權科忌）與宮位互動，不盲目誇大吉凶。
2. **結構清晰**：使用清晰的標題（Heading）、條列點（Bullet points）與重點標註（Bold）。
3. **溫暖與賦能**：命理為趨吉避凶與自我認知之工具，提供具體可行的建議與性格修煉方向。
4. **語言**：請一律使用繁體中文（Traditional Chinese）回答。`;

/**
 * 將 iztro 星曜格式轉換為文字標記，例如 "紫微(廟·生年權)" 或 "文昌(陷·生年科)"
 */
function formatStarName(star: any): string {
  if (!star || !star.name) return '';
  const parts: string[] = [];
  if (star.brightness) parts.push(star.brightness);
  if (star.mutagen) parts.push(`生年${star.mutagen}`);

  if (parts.length > 0) {
    return `${star.name}(${parts.join('·')})`;
  }
  return star.name;
}

/**
 * 將 iztro 命盤物件整理成乾淨、無雜訊的 Markdown 命盤摘要
 */
export function summarizeAstrolabe(chart: any): string {
  if (!chart) {
    return '【無命盤資料】';
  }

  const lines: string[] = [];

  lines.push('# 命盤基本資訊');
  lines.push(`- 西元生日: ${chart.solarDate || '未知'}`);
  lines.push(`- 農曆生日: ${chart.lunarDate || '未知'}`);
  lines.push(`- 八字/干支: ${chart.chineseDate || '未知'}`);
  lines.push(`- 性別: ${chart.gender || '未知'} | 生肖: ${chart.zodiac || '未知'}`);
  lines.push(`- 局數: ${chart.fiveElements || '未知'}`);
  lines.push(`- 命主: ${chart.soul || '未知'} | 身主: ${chart.body || '未知'}`);
  if (chart.earthlyBranchOfSoulPalace) {
    lines.push(`- 命宮地支: ${chart.earthlyBranchOfSoulPalace} | 身宮地支: ${chart.earthlyBranchOfBodyPalace || '未知'}`);
  }

  lines.push('\n# 十二宮位星曜配置');

  const palaces = chart.palaces || [];
  palaces.forEach((palace: any) => {
    const pName = palace.name || '未知宮';
    const stemBranch = `${palace.heavenlyStem || ''}${palace.earthlyBranch || ''}`;
    const isBody = palace.isBodyPalace ? '【身宮】' : '';
    const decadal = palace.decadal ? ` (大限 ${palace.decadal.range?.[0] || ''}-${palace.decadal.range?.[1] || ''}歲)` : '';

    lines.push(`\n### ${pName} [${stemBranch}]${isBody}${decadal}`);

    const majors = (palace.majorStars || []).map(formatStarName).filter(Boolean);
    lines.push(`- **主星**: ${majors.length > 0 ? majors.join('、') : '無主星（借對宮）'}`);

    const minors = (palace.minorStars || []).map(formatStarName).filter(Boolean);
    if (minors.length > 0) {
      lines.push(`- **輔星/吉凶曜**: ${minors.join('、')}`);
    }

    const adjectives = (palace.adjectiveStars || []).map((s: any) => s.name || s).filter(Boolean);
    if (adjectives.length > 0) {
      lines.push(`- **雜曜/神煞**: ${adjectives.join('、')}`);
    }
  });

  return lines.join('\n');
}

/**
 * 依據解讀類型與選項產生 Prompt
 */
export function buildReadingPrompt(chart: any, options: PromptOptions): { systemPrompt: string; userPrompt: string } {
  const chartSummary = summarizeAstrolabe(chart);

  let typePrompt = '';
  switch (options.type) {
    case 'overall':
      typePrompt = `【解讀重點：命格總覽與特質】
請針對該命盤進行【命格總覽】分析：
1. **命格格局總評**：分析命宮主星、五行局、命主身主，判斷整體性格底色與人生基調。
2. **性格優勢與潛在盲點**：分析其優勢特質與需要注意的性格短板。
3. **人生關鍵課題**：給予命主的核心發展建議與開運心法。`;
      break;

    case 'palaces':
      typePrompt = `【解讀重點：十二宮位深度剖析】
${options.focusPalace ? `特別重點剖析：${options.focusPalace}` : '請重點分析三大核心宮位（命宮、財帛宮、官祿宮）以及夫妻宮與福德宮：'}
1. **事業與官祿宮**：適合發展之行業類型、工作態度與成就格局。
2. **財帛宮與田宅宮**：理財觀念、進財管道與資產累積能力。
3. **感情與夫妻宮**：感情觀、擇偶偏好與婚姻互動建議。
4. **福德宮與精神領域**：內心精神世界、壓力調適與福報。`;
      break;

    case 'mutagens':
      typePrompt = `【解讀重點：生年四化與關鍵能量】
請剖析命盤中的生年四化（化祿、化權、化科、化忌）：
1. **化祿宮位**：人生福分與資金/資源流向何處。
2. **化權宮位**：個人掌控欲、抱負與權力展現所在。
3. **化科宮位**：貴人運、名聲與解厄護佑力。
4. **化忌宮位**：人生執著點、欠債感、壓力與需要防範的陷阱。
5. **四化組合效應**：四化相互作用對人生的綜合影響與化解之道。`;
      break;

    case 'patterns':
      typePrompt = `【解讀重點：特殊格局與吉凶組合】
請檢視並分析該命盤之特殊格局：
1. **主要格局**：檢驗是否符合知名格局（如紫府同宮、日月同宮、殺破狼、三奇嘉會、陽梁昌祿、機月同梁等）。
2. **吉星與煞星配置**：六吉星（文昌文曲左輔右弼魁鉞）與六煞星（羊陀火鈴劫空）之照會影響。
3. **趨吉避凶處方**：如何運用吉星發揮潛力，並轉化煞星之衝擊。`;
      break;

    case 'comprehensive':
    default:
      typePrompt = `【解讀重點：全盤綜合深度命理大師解讀】
請進行全方位的紫微斗數綜合分析：
1. **命格大局**：命宮/身宮/三方四正星曜組合與格局等級。
2. **事業與財富格局**：官祿、財帛、田宅之發展空間與理財建言。
3. **感情與人際**：夫妻宮與人際關係解析。
4. **四化引動與機緣**：生年四化之能量分佈與吉凶解讀。
5. **宗師建言**：給命主的終身性格修煉與趨吉避凶指南。`;
      break;
  }

  if (options.customInstructions && options.customInstructions.trim()) {
    typePrompt += `\n\n【使用者補充問題/關注焦點】:\n${options.customInstructions.trim()}`;
  }

  const userPrompt = `以下為待解讀的紫微斗數命盤資料：\n\n${chartSummary}\n\n${typePrompt}`;

  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPrompt,
  };
}
