import { translate, type Locale } from '../i18n';
import type { ChatMessage } from './llm';
import { sanitizeUserInput } from './prompts';

/** 對話歷史上限：10 輪對話（每輪包含問與答共 2 條訊息） */
export const MAX_FOLLOW_UP_ROUNDS = 10;
export const MAX_FOLLOW_UP_HISTORY_MESSAGES = MAX_FOLLOW_UP_ROUNDS * 2;

/**
 * 判斷當前命盤是否與追問建立時的命盤不一致。
 * 若命盤已變更（chartId 不同）或 ID 無效，回傳 true（表示對話已過期），
 * 呼叫端據此清空對話紀錄。
 */
export function isFollowUpStale(
  frozenChartId: string | null | undefined,
  currentChartId: string | null | undefined
): boolean {
  if (!frozenChartId || !currentChartId) {
    return true;
  }
  return frozenChartId !== currentChartId;
}

/**
 * 建置追問完整 messages 陣列：
 * 回傳 [system（建置時傳入、不在本函式內重組）, ...history, 新 user]
 *
 * 規範：
 * 1. 新 user 輸入先經 sanitizeUserInput 消毒（避免 HTML/XML 標籤注入與過長 payload）
 * 2. 空白問題會依指定 locale 拋出本地化錯誤
 * 3. history 上限超過 10 輪（20 條）時丟棄最舊問答，但保留 system
 * 4. ChatMessage 型別沿用 llm.ts 既有定義
 * 5. D4 邊界：不在此處或 user prompt 中注入八字資料
 */
export function buildFollowUpMessages(
  systemPrompt: string,
  history: ChatMessage[],
  question: string,
  locale: Locale = 'zh-TW'
): ChatMessage[] {
  const sanitized = sanitizeUserInput(question);
  if (!sanitized) {
    throw new Error(translate(locale, 'followUp.error.emptyQuestion'));
  }

  // 確保排除 history 中可能殘留的舊 system prompt（system 固定由本次傳入的 systemPrompt 主導）
  const cleanHistory = history.filter((msg) => msg.role !== 'system');

  let trimmedHistory = cleanHistory;
  if (trimmedHistory.length > MAX_FOLLOW_UP_HISTORY_MESSAGES) {
    trimmedHistory = trimmedHistory.slice(-MAX_FOLLOW_UP_HISTORY_MESSAGES);
    // 若截斷後開頭為 assistant（孤立回答），再切掉一條保持問答成對
    if (trimmedHistory.length > 0 && trimmedHistory[0].role === 'assistant') {
      trimmedHistory = trimmedHistory.slice(1);
    }
  }

  return [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory,
    { role: 'user', content: sanitized },
  ];
}
