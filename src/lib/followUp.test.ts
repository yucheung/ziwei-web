import { describe, expect, it } from 'vitest';
import {
  buildFollowUpMessages,
  isFollowUpStale,
  MAX_FOLLOW_UP_HISTORY_MESSAGES,
  MAX_FOLLOW_UP_ROUNDS,
} from './followUp';
import type { ChatMessage } from './llm';
import { translate } from '../i18n';

describe('followUp core logic', () => {
  const mockSystemPrompt = '【系統提示】你是一位專業命理大師，以下為當前命盤結構...';

  describe('buildFollowUpMessages', () => {
    it('組裝完整 messages 陣列：[system, ...history, 新 user]', () => {
      const history: ChatMessage[] = [
        { role: 'user', content: '請問我的命宮主星特質？' },
        { role: 'assistant', content: '命宮有紫微、天府，代表具備領導力與企劃才幹。' },
      ];
      const question = '那在事業上適合自行創業嗎？';

      const messages = buildFollowUpMessages(mockSystemPrompt, history, question, 'zh-TW');

      expect(messages).toHaveLength(4);
      expect(messages[0]).toEqual({ role: 'system', content: mockSystemPrompt });
      expect(messages[1]).toEqual(history[0]);
      expect(messages[2]).toEqual(history[1]);
      expect(messages[3]).toEqual({ role: 'user', content: question });
    });

    it('對新 user 輸入進行消毒（轉義角括號與標籤）', () => {
      const xssQuestion = '測試<script>alert("xss")</script>與<<tag>>注入';
      const messages = buildFollowUpMessages(mockSystemPrompt, [], xssQuestion, 'zh-TW');

      expect(messages).toHaveLength(2);
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).not.toContain('<script>');
      expect(messages[1].content).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(messages[1].content).toContain('&lt;&lt;tag&gt;&gt;');
    });

    it('截斷超過 800 字元上限的過長提問', () => {
      const longQuestion = 'A'.repeat(1000);
      const messages = buildFollowUpMessages(mockSystemPrompt, [], longQuestion, 'zh-TW');

      expect(messages[1].content).toHaveLength(800);
      expect(messages[1].content).toBe('A'.repeat(800));
    });

    it('超過 10 輪（20 條）時丟棄最舊問答，但保留 system prompt', () => {
      // 建立 12 輪（24 條）對話
      const history: ChatMessage[] = [];
      for (let i = 1; i <= 12; i++) {
        history.push({ role: 'user', content: `使用者問題 ${i}` });
        history.push({ role: 'assistant', content: `AI 回覆 ${i}` });
      }
      expect(history).toHaveLength(24);

      const messages = buildFollowUpMessages(mockSystemPrompt, history, '新追問問題', 'zh-TW');

      // 總長度 = 1 (system) + 20 (保留最新 10 輪) + 1 (新追問) = 22
      expect(messages).toHaveLength(22);
      expect(messages[0]).toEqual({ role: 'system', content: mockSystemPrompt });

      // 最舊的第 1、2 輪應被丟棄，最新的一輪應為第 3 輪
      expect(messages[1]).toEqual({ role: 'user', content: '使用者問題 3' });
      expect(messages[2]).toEqual({ role: 'assistant', content: 'AI 回覆 3' });
      expect(messages[19]).toEqual({ role: 'user', content: '使用者問題 12' });
      expect(messages[20]).toEqual({ role: 'assistant', content: 'AI 回覆 12' });

      // 最後一條為新提問
      expect(messages[21]).toEqual({ role: 'user', content: '新追問問題' });
    });

    it('恰好 10 輪（20 條）時全數保留', () => {
      const history: ChatMessage[] = [];
      for (let i = 1; i <= 10; i++) {
        history.push({ role: 'user', content: `Q${i}` });
        history.push({ role: 'assistant', content: `A${i}` });
      }

      const messages = buildFollowUpMessages(mockSystemPrompt, history, 'Q11', 'zh-TW');

      expect(messages).toHaveLength(22);
      expect(messages[0]).toEqual({ role: 'system', content: mockSystemPrompt });
      expect(messages[1]).toEqual({ role: 'user', content: 'Q1' });
      expect(messages[20]).toEqual({ role: 'assistant', content: 'A10' });
      expect(messages[21]).toEqual({ role: 'user', content: 'Q11' });
    });

    it('排除 history 中可能殘留的舊 system prompt，不造成 system 堆疊', () => {
      const history: ChatMessage[] = [
        { role: 'system', content: '過時的系統設定' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
      ];

      const messages = buildFollowUpMessages(mockSystemPrompt, history, 'Q2', 'zh-TW');

      expect(messages).toHaveLength(4);
      expect(messages[0]).toEqual({ role: 'system', content: mockSystemPrompt });
      expect(messages[1]).toEqual({ role: 'user', content: 'Q1' });
      expect(messages[2]).toEqual({ role: 'assistant', content: 'A1' });
      expect(messages[3]).toEqual({ role: 'user', content: 'Q2' });
      expect(messages.filter((m) => m.role === 'system')).toHaveLength(1);
    });

    it('當輸入為空白時，依指定 locale 拋出本地化錯誤', () => {
      expect(() => buildFollowUpMessages(mockSystemPrompt, [], '', 'zh-TW')).toThrowError(
        translate('zh-TW', 'followUp.error.emptyQuestion')
      );
      expect(() => buildFollowUpMessages(mockSystemPrompt, [], '   ', 'zh-TW')).toThrowError(
        '追問問題不可為空'
      );

      expect(() => buildFollowUpMessages(mockSystemPrompt, [], '', 'zh-CN')).toThrowError(
        translate('zh-CN', 'followUp.error.emptyQuestion')
      );
      expect(() => buildFollowUpMessages(mockSystemPrompt, [], '   \n\t', 'zh-CN')).toThrowError(
        '追问问题不可为空'
      );
    });

    it('遵守 D4 邊界：不主動在 followUp messages 中注入八字或干支四柱資料', () => {
      const messages = buildFollowUpMessages(
        mockSystemPrompt,
        [{ role: 'user', content: '流年運勢' }, { role: 'assistant', content: '吉星相會' }],
        '具體哪個月比較好？',
        'zh-TW'
      );

      const combinedText = messages.map((m) => m.content).join('\n');
      expect(combinedText).not.toContain('年柱');
      expect(combinedText).not.toContain('月柱');
      expect(combinedText).not.toContain('日柱');
      expect(combinedText).not.toContain('時柱');
      expect(combinedText).not.toContain('八字');
    });

    it('常數定義正確（10 輪與 20 條訊息）', () => {
      expect(MAX_FOLLOW_UP_ROUNDS).toBe(10);
      expect(MAX_FOLLOW_UP_HISTORY_MESSAGES).toBe(20);
    });
  });

  describe('isFollowUpStale', () => {
    it('相同 chartId 回傳 false（對話未過期）', () => {
      expect(isFollowUpStale('chart-12345', 'chart-12345')).toBe(false);
      expect(isFollowUpStale('solar-1990-01-01-1-male', 'solar-1990-01-01-1-male')).toBe(false);
    });

    it('不同 chartId 回傳 true（命盤已變更，對話過期）', () => {
      expect(isFollowUpStale('chart-1', 'chart-2')).toBe(true);
      expect(isFollowUpStale('solar-1990-01-01-1-male', 'solar-1990-01-01-2-male')).toBe(true);
    });

    it('任一或兩者 chartId 為空/未定義時回傳 true', () => {
      expect(isFollowUpStale(null, 'chart-1')).toBe(true);
      expect(isFollowUpStale('chart-1', null)).toBe(true);
      expect(isFollowUpStale(undefined, 'chart-1')).toBe(true);
      expect(isFollowUpStale('chart-1', undefined)).toBe(true);
      expect(isFollowUpStale('', 'chart-1')).toBe(true);
      expect(isFollowUpStale('chart-1', '')).toBe(true);
      expect(isFollowUpStale(null, null)).toBe(true);
      expect(isFollowUpStale(undefined, undefined)).toBe(true);
    });
  });
});
