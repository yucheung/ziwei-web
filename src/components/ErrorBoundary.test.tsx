import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test error in chunk load');
};

describe('ErrorBoundary Component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('renders fallback UI when error is thrown', () => {
    // Suppress console.error for expected error boundary test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('頁面載入異常 / Component Load Error')).toBeInTheDocument();
    expect(screen.getByText('Test error in chunk load')).toBeInTheDocument();

    spy.mockRestore();
  });
});
