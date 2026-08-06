import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarTag } from './StarTag';
import { I18nProvider } from '../i18n';

describe('StarTag Component', () => {
  it('renders major star name correctly in vertical mode', () => {
    render(<StarTag name="紫微" brightness="廟" mutagen="權" />);
    expect(screen.getByText('紫')).toBeInTheDocument();
    expect(screen.getByText('微')).toBeInTheDocument();
    expect(screen.getByText('廟')).toBeInTheDocument();
    expect(screen.getByText('權')).toBeInTheDocument();
  });

  it('renders star in horizontal mode correctly', () => {
    render(<StarTag name="武曲" brightness="旺" mutagen="祿" vertical={false} />);
    expect(screen.getByText('武曲')).toBeInTheDocument();
    expect(screen.getByText('旺')).toBeInTheDocument();
    expect(screen.getByText('祿')).toBeInTheDocument();
  });

  it('handles stars without brightness or mutagen', () => {
    render(<StarTag name="天馬" vertical={false} />);
    expect(screen.getByText('天馬')).toBeInTheDocument();
    expect(screen.queryByText('廟')).not.toBeInTheDocument();
    expect(screen.queryByText('祿')).not.toBeInTheDocument();
  });

  describe('English locale rendering', () => {
    it('renders translated star name and brightness in English locale', () => {
      render(
        <I18nProvider defaultLocale="en">
          <StarTag name="紫微" brightness="廟" mutagen="權" vertical={false} />
        </I18nProvider>
      );
      expect(screen.getByText('emperor')).toBeInTheDocument();
      expect(screen.getByText('[+3]')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.queryByText('紫微')).not.toBeInTheDocument();
    });
  });

  describe('brightness display and color differentiation', () => {
    it('renders brightness text in vertical mode', () => {
      render(<StarTag name="紫微" brightness="廟" />);
      const el = screen.getByText('廟');
      expect(el).toBeInTheDocument();
      // 亮度顯示為 10px small text
      expect(el.className).toContain('text-[10px]');
    });

    it('renders brightness text in horizontal (pill) mode', () => {
      render(<StarTag name="紫微" brightness="得" vertical={false} />);
      const el = screen.getByText('得');
      expect(el).toBeInTheDocument();
      expect(el.className).toContain('text-[10px]');
    });

    it('applies red style for 廟 brightness', () => {
      render(<StarTag name="紫微" brightness="廟" />);
      const el = screen.getByText('廟');
      expect(el.className).toContain('text-rose-400');
      expect(el.className).toContain('font-bold');
    });

    it('applies red style for simplified 庙 brightness', () => {
      render(<StarTag name="紫微" brightness="庙" />);
      const el = screen.getByText('庙');
      expect(el.className).toContain('text-rose-400');
      expect(el.className).toContain('font-bold');
    });

    it('applies orange style for 旺 brightness', () => {
      render(<StarTag name="紫微" brightness="旺" />);
      const el = screen.getByText('旺');
      expect(el.className).toContain('text-orange-400');
      expect(el.className).toContain('font-medium');
    });

    it('applies yellow style for 得 brightness', () => {
      render(<StarTag name="紫微" brightness="得" />);
      const el = screen.getByText('得');
      expect(el.className).toContain('text-yellow-400');
    });

    it('applies blue style for 利 brightness', () => {
      render(<StarTag name="紫微" brightness="利" />);
      const el = screen.getByText('利');
      expect(el.className).toContain('text-blue-400');
    });

    it('applies gray style for 平 brightness', () => {
      render(<StarTag name="紫微" brightness="平" />);
      const el = screen.getByText('平');
      expect(el.className).toContain('text-slate-400');
    });

    it('applies dark style for 陷 brightness', () => {
      render(<StarTag name="紫微" brightness="陷" />);
      const el = screen.getByText('陷');
      expect(el.className).toContain('text-slate-600');
      expect(el.className).toContain('font-semibold');
    });

    it('applies subdued style for 不 brightness', () => {
      render(<StarTag name="紫微" brightness="不" />);
      const el = screen.getByText('不');
      expect(el.className).toContain('text-slate-500');
    });

    it('does not render brightness element when brightness is undefined', () => {
      const { container } = render(<StarTag name="紫微" />);
      // vertical mode: brightness span should not exist
      const spans = container.querySelectorAll('span');
      const brightnessSpan = Array.from(spans).find(
        (s) => s.textContent === '廟' || s.textContent === '旺'
      );
      expect(brightnessSpan).toBeUndefined();
    });

    it('applies different colors for different brightness levels', () => {
      const { rerender } = render(<StarTag name="紫微" brightness="廟" />);
      const miaoEl = screen.getByText('廟');
      const miaoColor = miaoEl.className;

      rerender(<StarTag name="紫微" brightness="旺" />);
      const wangEl = screen.getByText('旺');
      const wangColor = wangEl.className;

      rerender(<StarTag name="紫微" brightness="陷" />);
      const xianEl = screen.getByText('陷');
      const xianColor = xianEl.className;

      // Each brightness level should have a distinct color class
      expect(miaoColor).not.toEqual(wangColor);
      expect(wangColor).not.toEqual(xianColor);
    });
  });
});
