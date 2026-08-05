import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FortunePanel } from './FortunePanel';
import { getChart } from '../lib/astro';

describe('FortunePanel Component', () => {
  it('renders empty state when astrolabe is null', () => {
    render(<FortunePanel astrolabe={null} />);
    expect(screen.getByText('未載入星盤資料')).toBeInTheDocument();
    expect(
      screen.getByText(/請先在生辰輸入表單設定資料並點擊「生成紫微命盤」/)
    ).toBeInTheDocument();
  });

  it('renders decadal and yearly horoscope summary when astrolabe is provided', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    render(<FortunePanel astrolabe={astrolabe} initialTargetDate="2026-08-04" />);

    // Verify title and header info
    expect(screen.getByText(/運限大盤分析/)).toBeInTheDocument();
    expect(screen.getByText(/虛歲 27 歲/)).toBeInTheDocument();

    // Verify Decadal card
    expect(screen.getByText('甲申 大限')).toBeInTheDocument();
    expect(screen.getByText('當前大限 (十年運勢)')).toBeInTheDocument();

    // Verify Yearly card
    expect(screen.getByText('丙午 流年')).toBeInTheDocument();
    expect(screen.getByText('當前流年 (年度運勢)')).toBeInTheDocument();

    // Verify Decadal Table heading
    expect(screen.getByText('大限運勢推算表 (10年大限)')).toBeInTheDocument();
    expect(screen.getAllByText('當前大限').length).toBeGreaterThan(0);
  });

  it('handles target date change and quick year buttons', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    render(<FortunePanel astrolabe={astrolabe} initialTargetDate="2026-08-04" />);

    const currentYear = new Date().getFullYear();
    const nextYearBtn = screen.getByText(`明年 (${currentYear + 1})`);
    expect(nextYearBtn).toBeInTheDocument();

    // Click next year button
    fireEvent.click(nextYearBtn);

    // Verify date updated in input
    const dateInput = screen.getByLabelText(/切換查詢日期/) as HTMLInputElement;
    expect(dateInput.value).toBe(`${currentYear + 1}-01-01`);
  });

  it('calls onSelectDecadal when a decadal table row is clicked', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const handleSelectDecadal = vi.fn();

    render(
      <FortunePanel
        astrolabe={astrolabe}
        initialTargetDate="2026-08-04"
        onSelectDecadal={handleSelectDecadal}
      />
    );

    // Click first row (3 - 12 歲)
    const firstRow = screen.getByText('3 - 12 歲').closest('tr');
    expect(firstRow).not.toBeNull();
    if (firstRow) {
      fireEvent.click(firstRow);
      expect(handleSelectDecadal).toHaveBeenCalledTimes(1);
      expect(handleSelectDecadal).toHaveBeenCalledWith(
        expect.objectContaining({
          rangeText: '3 - 12 歲',
          palaceName: '命宮',
        })
      );
    }
  });

  it('renders fortune level tabs and switches between levels', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    render(<FortunePanel astrolabe={astrolabe} initialTargetDate="2026-08-04" />);

    // Default level is yearly - verify yearly data shown
    expect(screen.getByText('當前流年 (年度運勢)')).toBeInTheDocument();
    expect(screen.getByText('丙午 流年')).toBeInTheDocument();

    // Verify all four level tabs exist
    expect(screen.getByRole('button', { name: '流年' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '流月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '流日' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '流時' })).toBeInTheDocument();

    // Click monthly tab
    fireEvent.click(screen.getByRole('button', { name: '流月' }));
    expect(screen.getByText('當前流月 (月份運勢)')).toBeInTheDocument();

    // Click daily tab
    fireEvent.click(screen.getByRole('button', { name: '流日' }));
    expect(screen.getByText('當前流日 (日期運勢)')).toBeInTheDocument();

    // Click hourly tab
    fireEvent.click(screen.getByRole('button', { name: '流時' }));
    expect(screen.getByText('當前流時 (時辰運勢)')).toBeInTheDocument();
  });

  it('displays correct mutagen for each fortune level', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    render(<FortunePanel astrolabe={astrolabe} initialTargetDate="2026-08-04" />);

    // Yearly level - verify mutagen label says 流年天干
    expect(screen.getByText(/流年天干.*四化引動/)).toBeInTheDocument();

    // Switch to monthly - verify mutagen label updates
    fireEvent.click(screen.getByRole('button', { name: '流月' }));
    expect(screen.getByText(/流月天干.*四化引動/)).toBeInTheDocument();

    // Switch to daily
    fireEvent.click(screen.getByRole('button', { name: '流日' }));
    expect(screen.getByText(/流日天干.*四化引動/)).toBeInTheDocument();

    // Switch to hourly
    fireEvent.click(screen.getByRole('button', { name: '流時' }));
    expect(screen.getByText(/流時天干.*四化引動/)).toBeInTheDocument();
  });

  it('updates the 流時 (hourly) result when the queried time index selector changes', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    render(<FortunePanel astrolabe={astrolabe} initialTargetDate="2026-08-04" />);

    // Selector only appears on the hourly tab
    expect(screen.queryByLabelText(/查詢時辰/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '流時' }));

    const hourSelect = screen.getByLabelText(/查詢時辰/) as HTMLSelectElement;
    // Defaults to 0 (子時), matching the prior implicit midnight-derived behavior
    expect(hourSelect.value).toBe('0');
    expect(screen.getByText(/^[甲乙丙丁戊己庚辛壬癸]子 流時$/)).toBeInTheDocument();

    // Switch to 午時 (index 6) and verify the hourly stem-branch badge updates accordingly
    fireEvent.change(hourSelect, { target: { value: '6' } });
    expect(screen.getByText(/^[甲乙丙丁戊己庚辛壬癸]午 流時$/)).toBeInTheDocument();
  });
});
