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
        const nameEls = screen.getAllByText(starWithBrightness.name);
        expect(nameEls.length).toBeGreaterThanOrEqual(1);
        const brightnessEls = screen.getAllByText(starWithBrightness.brightness!);
        expect(brightnessEls.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('keyboard navigation (roving tabindex, 4x4 palace ring)', () => {
    // Fixture chart: soul palace defaults to 午 (earthly-branch index 4).
    const astrolabe = getChart('2000-08-16', 2, 'male');

    function renderGrid() {
      const onSelectPalace = vi.fn();
      render(<ChartGrid astrolabe={astrolabe} onSelectPalace={onSelectPalace} />);
      return { onSelectPalace };
    }

    it('exposes exactly one tab stop, on the default-selected (soul) palace', () => {
      renderGrid();
      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(12);

      const tabbable = cells.filter((c) => c.getAttribute('tabindex') === '0');
      expect(tabbable).toEqual([screen.getByTestId('palace-cell-午')]);

      cells
        .filter((c) => c !== tabbable[0])
        .forEach((c) => expect(c).toHaveAttribute('tabindex', '-1'));
    });

    // [fromBranch, key, toBranch]
    const ARROW_CASES: Array<[string, string, string]> = [
      // Left column (col 0, rows 0..3 all populated): vertical nav incl. edge wrap
      ['巳', 'ArrowDown', '辰'],
      ['辰', 'ArrowDown', '卯'],
      ['卯', 'ArrowDown', '寅'],
      ['寅', 'ArrowDown', '巳'], // wraps row 3 -> row 0
      ['巳', 'ArrowUp', '寅'], // wraps row 0 -> row 3
      // Top row (row 0, cols 0..3 all populated): horizontal nav incl. edge wrap
      ['巳', 'ArrowRight', '午'],
      ['午', 'ArrowRight', '未'],
      ['未', 'ArrowRight', '申'],
      ['申', 'ArrowRight', '巳'], // wraps col 3 -> col 0
      ['巳', 'ArrowLeft', '申'], // wraps col 0 -> col 3
      // Column 1: rows 1-2 are the empty center 2x2 header, only row 0 (午)
      // and row 3 (丑) are real palaces — Up/Down must skip the hole entirely
      ['午', 'ArrowDown', '丑'],
      ['丑', 'ArrowUp', '午'],
    ];

    it.each(ARROW_CASES)('%s + %s moves the roving tab stop to %s', (fromBranch, key, toBranch) => {
      renderGrid();
      const fromCell = screen.getByTestId(`palace-cell-${fromBranch}`);
      const toCell = screen.getByTestId(`palace-cell-${toBranch}`);

      fireEvent.keyDown(fromCell, { key });

      expect(document.activeElement).toBe(toCell);
      expect(toCell).toHaveAttribute('tabindex', '0');
      screen
        .getAllByRole('gridcell')
        .filter((c) => c !== toCell)
        .forEach((c) => expect(c).toHaveAttribute('tabindex', '-1'));
    });

    it('Home moves the roving tab stop to the first palace (寅)', () => {
      renderGrid();
      fireEvent.keyDown(screen.getByTestId('palace-cell-戌'), { key: 'Home' });

      const firstCell = screen.getByTestId('palace-cell-寅');
      expect(document.activeElement).toBe(firstCell);
      expect(firstCell).toHaveAttribute('tabindex', '0');
    });

    it('End moves the roving tab stop to the last palace (丑)', () => {
      renderGrid();
      fireEvent.keyDown(screen.getByTestId('palace-cell-辰'), { key: 'End' });

      const lastCell = screen.getByTestId('palace-cell-丑');
      expect(document.activeElement).toBe(lastCell);
      expect(lastCell).toHaveAttribute('tabindex', '0');
    });

    it.each(['Enter', ' '])('%s is not intercepted by the roving-tabindex handler', (key) => {
      const { onSelectPalace } = renderGrid();
      const cell = screen.getByTestId('palace-cell-午');

      const notPrevented = fireEvent.keyDown(cell, { key });

      expect(notPrevented).toBe(true); // event.preventDefault() was NOT called
      expect(onSelectPalace).not.toHaveBeenCalled();
      expect(cell).toHaveAttribute('tabindex', '0'); // selection/focus unchanged
    });
  });

  describe('flying stars display', () => {
    it('renders flying star badges on palace cells', () => {
      const astrolabe = getChart('2000-08-16', 2, 'male');
      render(<ChartGrid astrolabe={astrolabe} />);

      // Flying badge containers should exist (title="飛星四化標記")
      const containers = document.querySelectorAll('[title="飛星四化標記"]');
      expect(containers.length).toBeGreaterThan(0);
    });

    it('renders flying star detail panel when a palace is selected', () => {
      const astrolabe = getChart('2000-08-16', 2, 'male');
      render(<ChartGrid astrolabe={astrolabe} />);

      // Click on a palace to show detail
      fireEvent.click(screen.getByTestId('palace-cell-申'));

      // Flying star detail section should appear
      expect(screen.getByText(/飛星四化/)).toBeInTheDocument();
    });
  });
});
