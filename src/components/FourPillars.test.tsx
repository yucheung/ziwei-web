import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FourPillars } from './FourPillars';
import { buildFourPillarsFromGanZhi, WUXING_COLORS } from '../lib/bazi';
import { I18nProvider } from '../i18n';

const testPillars = buildFourPillarsFromGanZhi(
  ['甲', '子'], // year
  ['丙', '寅'], // month
  ['庚', '午'], // day
  ['丁', '亥'], // time
);

function renderPillars(pillars = testPillars, className = '') {
  return render(
    <I18nProvider defaultLocale="zh-TW">
      <FourPillars pillars={pillars} className={className} />
    </I18nProvider>,
  );
}

describe('FourPillars Component', () => {
  it('renders container with data-testid="four-pillars"', () => {
    renderPillars();
    expect(screen.getByTestId('four-pillars')).toBeInTheDocument();
  });

  it('renders 4 pillar labels (年柱, 月柱, 日柱, 時柱)', () => {
    renderPillars();
    expect(screen.getByText('年柱')).toBeInTheDocument();
    expect(screen.getByText('月柱')).toBeInTheDocument();
    expect(screen.getByText('日柱')).toBeInTheDocument();
    expect(screen.getByText('時柱')).toBeInTheDocument();
  });

  it('renders gan characters for each pillar', () => {
    renderPillars();
    expect(screen.getByText('甲')).toBeInTheDocument();
    expect(screen.getByText('丙')).toBeInTheDocument();
    expect(screen.getByText('庚')).toBeInTheDocument();
    expect(screen.getByText('丁')).toBeInTheDocument();
  });

  it('renders zhi characters for each pillar', () => {
    renderPillars();
    expect(screen.getByText('子')).toBeInTheDocument();
    expect(screen.getByText('寅')).toBeInTheDocument();
    expect(screen.getByText('午')).toBeInTheDocument();
    expect(screen.getByText('亥')).toBeInTheDocument();
  });

  it('displays nayin text for each pillar', () => {
    renderPillars();
    // Each pillar should have its nayin displayed
    expect(screen.getByText(testPillars.yearNaYin)).toBeInTheDocument();
    expect(screen.getByText(testPillars.monthNaYin)).toBeInTheDocument();
    expect(screen.getByText(testPillars.dayNaYin)).toBeInTheDocument();
    expect(screen.getByText(testPillars.timeNaYin)).toBeInTheDocument();
  });

  it('applies WU XING color classes based on ganWuXing', () => {
    renderPillars();
    // 甲 → 木 → emerald color
    const yearGan = screen.getByText('甲');
    expect(yearGan.className).toContain(WUXING_COLORS['木']);
    // 丙 → 火 → rose color
    const monthGan = screen.getByText('丙');
    expect(monthGan.className).toContain(WUXING_COLORS['火']);
    // 庚 → 金 → slate color
    const dayGan = screen.getByText('庚');
    expect(dayGan.className).toContain(WUXING_COLORS['金']);
    // 丁 → 火 → rose color
    const timeGan = screen.getByText('丁');
    expect(timeGan.className).toContain(WUXING_COLORS['火']);
  });

  it('applies custom className prop', () => {
    const { container } = renderPillars(testPillars, 'my-custom-class');
    const gridEl = container.querySelector('[data-testid="four-pillars"]');
    expect(gridEl).toHaveClass('my-custom-class');
  });

  it('displays wuxing labels combining gan and zhi wuxing', () => {
    renderPillars();
    // Year: 甲木 + 子水 → "木水"
    expect(screen.getByText('木水')).toBeInTheDocument();
    // Month: 丙火 + 寅木 → "火木"
    expect(screen.getByText('火木')).toBeInTheDocument();
  });
});
