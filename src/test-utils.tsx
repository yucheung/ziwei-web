import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { I18nProvider } from './i18n';

// Ensure default test locale is zh-TW if not explicitly set
if (typeof localStorage !== 'undefined' && !localStorage.getItem('ziwei-lang')) {
  localStorage.setItem('ziwei-lang', 'zh-TW');
}

export const customAllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <I18nProvider>{children}</I18nProvider>;
};

export const AllTheProviders = customAllTheProviders;

export function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return rtlRender(ui, { wrapper: customAllTheProviders, ...options });
}

export { customRender as render };
