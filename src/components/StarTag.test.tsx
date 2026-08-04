import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarTag } from './StarTag';

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
});
