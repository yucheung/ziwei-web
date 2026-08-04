import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Suspense } from 'react';
import App from './App';
import { astro } from 'iztro';
import { I18nProvider } from './i18n';

describe('Ziwei Web App Smoke Test', () => {
  it('renders application title correctly', async () => {
    render(
      <I18nProvider defaultLocale="zh-TW">
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      </I18nProvider>,
    );
    expect(await screen.findByText('紫微斗數 Web 專業版')).toBeInTheDocument();
    // Use findBy to wait for lazy-loaded components
    expect(await screen.findByText('生辰資料輸入')).toBeInTheDocument();
  });

  it('imports iztro engine successfully', () => {
    expect(astro).toBeDefined();
    expect(typeof astro.bySolar).toBe('function');
  });
});
