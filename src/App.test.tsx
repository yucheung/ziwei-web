import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { astro } from 'iztro';

describe('Ziwei Web App Smoke Test', () => {
  it('renders application title correctly', () => {
    render(<App />);
    expect(screen.getByText('紫微斗數 Web 專業版')).toBeInTheDocument();
    expect(screen.getByText('生辰資料輸入')).toBeInTheDocument();
    expect(screen.getByText('生成紫微命盤')).toBeInTheDocument();
  });

  it('imports iztro engine successfully', () => {
    expect(astro).toBeDefined();
    expect(typeof astro.bySolar).toBe('function');
  });
});
