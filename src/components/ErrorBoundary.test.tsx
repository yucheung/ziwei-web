import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nProvider } from '../i18n';

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

    expect(screen.getByText('頁面載入異常')).toBeInTheDocument();
    expect(screen.getByText('Test error in chunk load')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('renders zh-CN fallback UI when mounted under an I18nProvider set to zh-CN', () => {
    // ErrorBoundary is mounted inside the I18nProvider tree in main.tsx, so it
    // must read the provider's locale (via static contextType) rather than
    // always falling back to zh-TW.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <I18nProvider defaultLocale="zh-CN">
        <ErrorBoundary>
          <ProblemChild />
        </ErrorBoundary>
      </I18nProvider>
    );

    expect(screen.getByText('页面加载异常')).toBeInTheDocument();
    expect(screen.getByText('Test error in chunk load')).toBeInTheDocument();

    spy.mockRestore();
  });
});
