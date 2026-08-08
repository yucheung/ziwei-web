import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { zhCN } from '../i18n/zh-CN';
import { zhTW } from '../i18n/zh-TW';
import type { AnalyzedChart } from '../lib/chartAnalyzer';
import { SPECIAL_TOPIC_CONFIGS } from '../lib/specialTopics';
import type { RuleResult } from '../lib/rules/types';
import * as llmModule from '../lib/llm';
import { SpecialTopicPanel } from './SpecialTopicPanel';

vi.mock('../lib/llm', async () => {
  const actual = await vi.importActual<typeof import('../lib/llm')>('../lib/llm');
  return {
    ...actual,
    loadLLMConfig: vi.fn(),
    callLLMStream: vi.fn(),
  };
});

function makeChart(): AnalyzedChart {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-08T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '2000-08-16', timeIndex: 2, gender: 'male' },
    palaces: [
      {
        index: 0,
        name: '命宮',
        heavenlyStem: '甲',
        earthlyBranch: '子',
        isBodyPalace: false,
        isOriginalPalace: false,
        majorStars: [{ starName: '紫微' }],
        minorStars: [],
        adjectiveStars: [],
      },
    ],
    mutagens: { entries: [] },
    patterns: { patterns: [] },
  };
}

function makeRule(ruleId: string, ruleName: string): RuleResult {
  return {
    ruleId,
    ruleName,
    matched: true,
    evidence: [],
    confidence: 0.9,
  };
}

const llmConfig: llmModule.LLMConfig = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: 'test-api-key',
  model: 'gemini-2.5-flash',
  temperature: 0.7,
};

function renderPanel(locale: 'zh-TW' | 'zh-CN' = 'zh-TW') {
  return render(
    <I18nProvider defaultLocale={locale}>
      <SpecialTopicPanel
        chart={makeChart()}
        rules={[
          makeRule(`${SPECIAL_TOPIC_CONFIGS.career.ruleSubset[0]}test`, '事業規則'),
          makeRule('four-transformation-taiyin-huaLu', '財帛規則'),
        ]}
      />
    </I18nProvider>,
  );
}

describe('SpecialTopicPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(llmModule.loadLLMConfig).mockReturnValue({ ...llmConfig });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders five translated topic choices', () => {
    renderPanel();

    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: '事業' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '財運' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '感情' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '健康' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '學業' })).toBeInTheDocument();
  });

  it('renders simplified-Chinese topic labels when the UI locale is zh-CN', () => {
    renderPanel('zh-CN');

    expect(screen.getByRole('radio', { name: '事业' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '财运' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '感情' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '健康' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '学业' })).toBeInTheDocument();
  });

  it('renders structured citation sources by library name', () => {
    renderPanel();

    expect(screen.getAllByText(/iztro-sanhe-v1/u).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/未審核/u).length).toBeGreaterThan(0);
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('streams the selected topic reading and sends only its rule subset', async () => {
    let sentMessages: llmModule.ChatMessage[] | undefined;
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (messages, _config, callbacks) => {
      sentMessages = messages;
      callbacks.onChunk('事業分析', '事業分析');
      callbacks.onChunk('內容', '事業分析內容');
      const result = { status: 'completed' as const, text: '事業分析內容' };
      callbacks.onFinish?.(result);
      return result;
    });

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '生成專題解讀' }));

    await waitFor(() => expect(screen.getByText('事業分析內容')).toBeInTheDocument());

    const userPrompt = sentMessages?.find((message) => message.role === 'user')?.content ?? '';
    expect(userPrompt).toContain('事業規則');
    expect(userPrompt).not.toContain('財帛規則');
    expect(screen.getByText(/star-ziwei/)).toBeInTheDocument();
    expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1);
  });

  it('sends the wealth assertion boundary in the localized system message', async () => {
    let sentMessages: llmModule.ChatMessage[] | undefined;
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (messages, _config, callbacks) => {
      sentMessages = messages;
      const result = { status: 'completed' as const, text: '財運分析內容' };
      callbacks.onFinish?.(result);
      return result;
    });

    renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: '財運' }));
    fireEvent.click(screen.getByRole('button', { name: '生成專題解讀' }));

    await waitFor(() => expect(screen.getByText('財運分析內容')).toBeInTheDocument());

    const systemPrompt = sentMessages?.find((message) => message.role === 'system')?.content ?? '';
    expect(systemPrompt).toContain('保證獲利');
    expect(systemPrompt).toContain('此內容僅提供財務傾向與規劃參考');
  });

  it('displays the current model label and uses inherited llmConfig prop', () => {
    const customConfig: llmModule.LLMConfig = {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'custom-key',
      model: 'gpt-4o-custom',
      temperature: 0.5,
    };

    render(
      <I18nProvider defaultLocale="zh-TW">
        <SpecialTopicPanel
          chart={makeChart()}
          rules={[]}
          llmConfig={customConfig}
        />
      </I18nProvider>,
    );

    expect(screen.getByText(/目前模型：OpenAI \/ gpt-4o-custom/i)).toBeInTheDocument();
  });

  it('keeps all new labels available in both locale dictionaries', () => {
    const keys = [
      'specialTopic.title',
      'specialTopic.subtitle',
      'specialTopic.chooseTopic',
      'specialTopic.career',
      'specialTopic.wealth',
      'specialTopic.relationship',
      'specialTopic.health',
      'specialTopic.education',
      'specialTopic.generate',
      'specialTopic.stop',
      'specialTopic.loading',
      'specialTopic.hint',
      'specialTopic.noApiKey',
      'specialTopic.error',
      'specialTopic.completed',
      'specialTopic.aborted',
      'specialTopic.sources',
      'specialTopic.noSources',
      'specialTopic.sensitivityNotice',
      'specialTopic.currentModel',
      'specialTopic.notSet',
    ] as const;

    for (const key of keys) {
      expect(zhTW[key]).toBeTruthy();
      expect(zhCN[key]).toBeTruthy();
    }
  });

  it('uses 用户 in the zh-CN special-topic system prompt', () => {
    expect(zhCN['specialTopic.systemPrompt']).toContain('用户');
    expect(zhCN['specialTopic.systemPrompt']).not.toContain('使用者');
  });
});
