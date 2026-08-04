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

  describe('brightness display in chart', () => {
    it('renders brightness markers for major stars in the grid', () => {
      const astrolabe = getChart('2000-08-16', 2, 'male');

      // Find all major stars that have brightness
      const starsWithBrightness = astrolabe.palaces
        .flatMap((p) => p.majorStars)
        .filter((s) => s.brightness);

      // At least some stars should have brightness for this chart
      expect(starsWithBrightness.length).toBeGreaterThan(0);

      render(<ChartGrid astrolabe={astrolabe} />);

      // Each brightness value should appear somewhere in the rendered grid
      const brightnessValues = [...new Set(starsWithBrightness.map((s) => s.brightness!))];
      brightnessValues.forEach((b) => {
        // brightness text appears in both PalaceCell (vertical) and detail panel (horizontal)
        const els = screen.getAllByText(b);
        expect(els.length).toBeGreaterThan(0);
      });
    });

    it('renders brightness with color-differentiated styles', () => {
      const astrolabe = getChart('2000-08-16', 2, 'male');

      render(<ChartGrid astrolabe={astrolabe} />);

      // Check for brightness text elements with appropriate Tailwind color classes
      const brightnessColorMap: Record<string, string> = {
        '廟': 'text-rose-400',    // 紅 (繁體)
        '庙': 'text-rose-400',    // 紅 (簡體)
        '旺': 'text-orange-400',  // 橙
        '得': 'text-yellow-400',  // 黃
        '利': 'text-blue-400',    // 藍
        '平': 'text-slate-400',   // 灰
        '陷': 'text-slate-600',   // 暗
      };

      // Find which brightness values actually appear in this chart
      const starsWithBrightness = astrolabe.palaces
        .flatMap((p) => [...p.majorStars, ...p.minorStars])
        .filter((s) => s.brightness);

      const presentBrightness = new Set(starsWithBrightness.map((s) => s.brightness));

      presentBrightness.forEach((b) => {
        if (b && brightnessColorMap[b]) {
          const els = screen.getAllByText(b);
          expect(els.length).toBeGreaterThan(0);
          // At least one element with this brightness should have the expected color class
          const hasColor = els.some((el) => el.className.includes(brightnessColorMap[b]));
          expect(hasColor).toBe(true);
        }
      });
    });

    it('renders brightness in detail panel for selected palace', () => {
      const astrolabe = getChart('2000-08-16', 2, 'male');

      // Find a palace with major stars that have brightness
      const palaceWithStars = astrolabe.palaces.findIndex(
        (p) => p.majorStars.some((s) => s.brightness)
      );
      expect(palaceWithStars).toBeGreaterThanOrEqual(0);

      render(<ChartGrid astrolabe={astrolabe} />);

      // Click the palace to show detail panel
      const branch = astrolabe.palaces[palaceWithStars].earthlyBranch;
      fireEvent.click(screen.getByTestId(`palace-cell-${branch}`));

      // Detail panel should show the star with its brightness
      const starWithBrightness = astrolabe.palaces[palaceWithStars].majorStars.find(
        (s) => s.brightness
      );
      if (starWithBrightness) {
        expect(screen.getByText(starWithBrightness.name)).toBeInTheDocument();
        const brightnessEls = screen.getAllByText(starWithBrightness.brightness!);
        expect(brightnessEls.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
