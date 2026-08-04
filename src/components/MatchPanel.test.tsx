import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchPanel } from './MatchPanel';

describe('MatchPanel Component (src/components/MatchPanel.tsx)', () => {
  it('renders dual birth inputs and match results overview', () => {
    render(<MatchPanel />);

    // Check title and section titles
    expect(screen.getByText(/雙人紫微命盤合盤/i)).toBeInTheDocument();
    expect(screen.getByText(/甲方 \(Person A 生辰資料\)/i)).toBeInTheDocument();
    expect(screen.getByText(/乙方 \(Person B 生辰資料\)/i)).toBeInTheDocument();

    // Check Score Gauge rendering
    expect(screen.getByText(/Match Score/i)).toBeInTheDocument();
    expect(screen.getByText(/多維度合盤契合指數/i)).toBeInTheDocument();

    // Check Side-by-Side Dual Astrolabe section
    expect(screen.getByText(/雙盤對照 · 命宮與夫妻宮星曜比對/i)).toBeInTheDocument();

    // Check Cross Flying Mutagens section
    expect(screen.getByText(/十干四化互飛氣場比對/i)).toBeInTheDocument();

    // Check Relationship Key Points section
    expect(screen.getByText(/關係重點與相處之道/i)).toBeInTheDocument();
  });

  it('switches preset pairs when preset buttons are clicked', () => {
    render(<MatchPanel />);

    const preset1Btn = screen.getByRole('button', { name: /預設合盤 1/i });
    fireEvent.click(preset1Btn);

    // Verify inputs updated
    expect(screen.getByDisplayValue('張先生 (甲)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('林小姐 (乙)')).toBeInTheDocument();

    const preset2Btn = screen.getByRole('button', { name: /預設合盤 2/i });
    fireEvent.click(preset2Btn);

    expect(screen.getByDisplayValue('陳先生 (丙)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('黃小姐 (丁)')).toBeInTheDocument();
  });
});
