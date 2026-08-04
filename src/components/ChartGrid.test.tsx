import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartGrid } from './ChartGrid';
import { getChart } from '../lib/astro';

describe('ChartGrid Component', () => {
  it('renders placeholder when astrolabe is not provided', () => {
    render(<ChartGrid astrolabe={null} />);
    expect(screen.getByText('未載入命盤資料')).toBeInTheDocument();
  });

  it('renders 12 palaces grid with iztro astrolabe data', () => {
    const astrolabe = getChart('2000-08-16', 2, 'male');
    render(<ChartGrid astrolabe={astrolabe} />);

    // Check central title
    expect(screen.getByText('紫微斗數命盤中樞')).toBeInTheDocument();

    // Check presence of earthly branch palaces (e.g. 寅, 卯, 辰, 巳, 午, 未, 申, 酉, 戌, 亥, 子, 丑)
    const earthlyBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    earthlyBranches.forEach((branch) => {
      expect(screen.getByTestId(`palace-cell-${branch}`)).toBeInTheDocument();
    });
  });

  it('updates selected palace and detail panel on click', () => {
    const astrolabe = getChart('2000-08-16', 2, 'male');
    const onSelectPalace = vi.fn();

    render(<ChartGrid astrolabe={astrolabe} onSelectPalace={onSelectPalace} />);

    // Click on 巳 palace cell
    const siCell = screen.getByTestId('palace-cell-巳');
    fireEvent.click(siCell);

    expect(onSelectPalace).toHaveBeenCalledWith(3); // 巳 is index 3
    expect(screen.getByText(/詳情面板/)).toBeInTheDocument();
  });
});
