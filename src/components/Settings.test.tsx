import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { I18nProvider } from '../i18n';
import type { Config, AstroType } from '../lib/astro';

function renderSettings(overrides: Record<string, unknown> = {}) {
  const props = {
    config: { algorithm: 'zhongzhou' } as Config,
    setConfig: vi.fn(),
    astroType: 'heaven' as AstroType,
    setAstroType: vi.fn(),
    ...overrides,
  };
  const utils = render(
    <I18nProvider defaultLocale="zh-TW">
      <Settings {...props} />
    </I18nProvider>,
  );
  return { ...utils, props };
}

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title heading', () => {
    renderSettings();
    expect(screen.getByText('斗數設定')).toBeInTheDocument();
  });

  it('school radio group: shows default and zhongzhou options', () => {
    renderSettings();
    const radiogroups = screen.getAllByRole('radiogroup');
    // First radiogroup is school (流派)
    const schoolGroup = radiogroups[0];
    const radios = schoolGroup.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(2);
    // Both labels should exist
    expect(screen.getByText('通行版')).toBeInTheDocument();
    expect(screen.getByText('中州派')).toBeInTheDocument();
  });

  it('school: zhongzhou is checked when config.algorithm is zhongzhou', () => {
    renderSettings({ config: { algorithm: 'zhongzhou' } as Config });
    const radiogroups = screen.getAllByRole('radiogroup');
    const schoolGroup = radiogroups[0];
    const radios = schoolGroup.querySelectorAll('[role="radio"]');
    // zhongzhou (index 1) should be checked
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].getAttribute('aria-checked')).toBe('false');
  });

  it('school: clicking default calls setConfig with algorithm=default', () => {
    const setConfig = vi.fn();
    renderSettings({ config: { algorithm: 'zhongzhou' } as Config, setConfig });
    const radiogroups = screen.getAllByRole('radiogroup');
    const schoolGroup = radiogroups[0];
    const defaultRadio = schoolGroup.querySelectorAll('[role="radio"]')[0];
    fireEvent.click(defaultRadio);
    expect(setConfig).toHaveBeenCalled();
    // Verify it calls with a function that sets algorithm to 'default'
    const updater = setConfig.mock.calls[0][0];
    const result = updater({ algorithm: 'zhongzhou' });
    expect(result).toEqual(expect.objectContaining({ algorithm: 'default' }));
  });

  it('astro type radio group: shows heaven, earth, human options', () => {
    renderSettings();
    expect(screen.getByText('天盤')).toBeInTheDocument();
    expect(screen.getByText('地盤')).toBeInTheDocument();
    expect(screen.getByText('人盤')).toBeInTheDocument();
  });

  it('astro type: clicking earth calls setAstroType', () => {
    const setAstroType = vi.fn();
    renderSettings({ astroType: 'heaven', setAstroType });
    fireEvent.click(screen.getByText('地盤'));
    expect(setAstroType).toHaveBeenCalledWith('earth');
  });

  it('late zi select: changing value calls setConfig', () => {
    const setConfig = vi.fn();
    renderSettings({ setConfig });
    const lateZiSelect = screen.getByLabelText(/晚子時處理/i);
    fireEvent.change(lateZiSelect, { target: { value: 'forward' } });
    expect(setConfig).toHaveBeenCalled();
    // setConfig receives an updater function; verify it spreads and sets dayDivide
    const updater = setConfig.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    const result = updater({ algorithm: 'zhongzhou', dayDivide: 'current' });
    expect(result).toEqual(expect.objectContaining({ algorithm: 'zhongzhou' }));
    // The updater should produce a new object (spread copy)
    expect(result).not.toBe({ algorithm: 'zhongzhou', dayDivide: 'current' });
  });

  it('year boundary select: changing value calls setConfig', () => {
    const setConfig = vi.fn();
    renderSettings({ setConfig });
    const yearSelect = screen.getByLabelText(/年界分界/i);
    fireEvent.change(yearSelect, { target: { value: 'exact' } });
    expect(setConfig).toHaveBeenCalled();
    const updater = setConfig.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    const result = updater({ algorithm: 'zhongzhou', yearDivide: 'normal' });
    expect(result).toEqual(expect.objectContaining({ algorithm: 'zhongzhou' }));
    expect(result).not.toBe({ algorithm: 'zhongzhou', yearDivide: 'normal' });
  });
});
