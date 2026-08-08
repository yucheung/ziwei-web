import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchPanel } from './MatchPanel';
import { I18nProvider } from '../i18n';
import { analyzeChart } from '../lib/chartAnalyzer';
import { getCanonicalAstrolabe } from '../lib/chartModel';
import { evaluateMatch } from '../lib/matchRules';
import { applySensitivityBoundaries } from '../lib/matchRules/sensitivity';

const PERSON_A = { name: '測試甲', date: '1990-01-01', timeIndex: 0, gender: 'male' as const };
const PERSON_B = { name: '測試乙', date: '1991-05-20', timeIndex: 2, gender: 'female' as const };

function getExpectedResults() {
  const chartA = analyzeChart(getCanonicalAstrolabe(PERSON_A), 'zh-TW');
  const chartB = analyzeChart(getCanonicalAstrolabe(PERSON_B), 'zh-TW');
  return applySensitivityBoundaries(evaluateMatch(chartA, chartB));
}

function renderPanel(locale: 'zh-TW' | 'zh-CN' = 'zh-TW') {
  return render(
    <I18nProvider defaultLocale={locale}>
      <MatchPanel initialPersonA={PERSON_A} initialPersonB={PERSON_B} />
    </I18nProvider>,
  );
}

describe('MatchPanel Component (src/components/MatchPanel.tsx)', () => {
  it('preserves the dual birth inputs and preset buttons', () => {
    renderPanel();

    expect(screen.getByText(/雙人紫微命盤合盤/i)).toBeInTheDocument();
    expect(screen.getByText(/甲方 \(Person A 生辰資料\)/i)).toBeInTheDocument();
    expect(screen.getByText(/乙方 \(Person B 生辰資料\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /預設合盤 1/i }));
    expect(screen.getByDisplayValue('張先生 (甲)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('林小姐 (乙)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /預設合盤 2/i }));
    expect(screen.getByDisplayValue('陳先生 (丙)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('黃小姐 (丁)')).toBeInTheDocument();
  });

  it('renders real rule conclusions and every B5 evidence chain instead of legacy prose', () => {
    const results = getExpectedResults();
    const firstResult = results[0];
    expect(firstResult).toBeDefined();

    renderPanel();

    expect(screen.getByText('合盤規則結果')).toBeInTheDocument();
    expect(screen.getByText(firstResult!.ruleName)).toBeInTheDocument();
    expect(screen.getAllByText('信心程度').length).toBeGreaterThan(0);
    expect(screen.getAllByText('證據鏈').length).toBeGreaterThan(0);
    expect(screen.getAllByText('知識 ID').length).toBeGreaterThan(0);
    expect(screen.getAllByText('來源').length).toBeGreaterThan(0);
    expect(screen.getAllByText('欄位').length).toBeGreaterThan(0);
    expect(screen.getAllByText('值').length).toBeGreaterThan(0);
    expect(screen.getAllByText('推理').length).toBeGreaterThan(0);

    for (const result of results) {
      for (const conclusion of result.conclusions) {
        expect(screen.getAllByText(conclusion.description).length).toBeGreaterThan(0);
      }
      for (const evidence of result.evidence) {
        expect(screen.getAllByText(evidence.knowledgeId).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.field).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.source).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.value).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.reasoning).length).toBeGreaterThan(0);
      }
    }

    expect(screen.queryByText('Match Score')).not.toBeInTheDocument();
    expect(screen.queryByText(/關係重點與相處之道/)).not.toBeInTheDocument();
  });

  it('renders the disclaimer from a real high-sensitivity wealth conclusion', () => {
    const results = getExpectedResults();
    const highConclusions = results.flatMap((result) => result.conclusions)
      .filter((conclusion) => conclusion.sensitivity === 'high' && conclusion.disclaimer);

    expect(highConclusions.length).toBeGreaterThan(0);
    renderPanel();

    expect(screen.getByText('高敏感度提醒')).toBeInTheDocument();
    for (const conclusion of highConclusions) {
      expect(screen.getByText(conclusion.disclaimer!)).toBeInTheDocument();
    }
  });

  it('renders the simplified-Chinese labels for real rule and evidence output', () => {
    const [firstResult] = getExpectedResults();
    expect(firstResult).toBeDefined();

    renderPanel('zh-CN');

    expect(screen.getByText('合盘规则结果')).toBeInTheDocument();
    expect(screen.getAllByText('置信度').length).toBeGreaterThan(0);
    expect(screen.getAllByText('结论').length).toBeGreaterThan(0);
    expect(screen.getAllByText('证据链').length).toBeGreaterThan(0);
    expect(screen.getAllByText('知识 ID').length).toBeGreaterThan(0);
    expect(screen.getAllByText('来源').length).toBeGreaterThan(0);
    expect(screen.getAllByText('字段').length).toBeGreaterThan(0);
    expect(screen.getAllByText('推理').length).toBeGreaterThan(0);
    expect(screen.getByText(firstResult!.ruleName)).toBeInTheDocument();

    for (const result of getExpectedResults()) {
      for (const evidence of result.evidence) {
        expect(screen.getAllByText(evidence.knowledgeId).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.field).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.source).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.value).length).toBeGreaterThan(0);
        expect(screen.getAllByText(evidence.reasoning).length).toBeGreaterThan(0);
      }
    }
  });
});
