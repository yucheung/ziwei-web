import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputForm } from './InputForm';
import { I18nProvider } from '../i18n';
import type { Config, AstroType } from '../lib/astro';

const defaultConfig: Config = { algorithm: 'zhongzhou' };

function renderForm(overrides: Record<string, unknown> = {}) {
  const props = {
    solarDate: '2000-08-16',
    setSolarDate: vi.fn(),
    timeIndex: '2',
    setTimeIndex: vi.fn(),
    gender: 'male' as const,
    setGender: vi.fn(),
    calendarType: 'solar' as const,
    setCalendarType: vi.fn(),
    config: defaultConfig,
    setConfig: vi.fn(),
    astroType: 'heaven' as AstroType,
    setAstroType: vi.fn(),
    longitude: '121.56',
    setLongitude: vi.fn(),
    preciseTime: '03:30',
    setPreciseTime: vi.fn(),
    solarTimeActive: false,
    onSubmit: vi.fn(),
    ...overrides,
  };
  const utils = render(
    <I18nProvider defaultLocale="zh-TW">
      <InputForm {...props} />
    </I18nProvider>,
  );
  return { ...utils, props };
}

describe('InputForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form title via heading role', () => {
    renderForm();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
  });

  it('calendar type: solar radio is checked by default', () => {
    renderForm({ calendarType: 'solar' });
    const radios = screen.getAllByRole('radio');
    const solarRadio = radios.find((r) => r.getAttribute('aria-checked') === 'true');
    expect(solarRadio).toBeDefined();
  });

  it('calendar type: clicking lunar updates aria-checked', () => {
    const setCalendarType = vi.fn();
    renderForm({ calendarType: 'solar', setCalendarType });
    // Find the radiogroup for calendar type (first radiogroup on page)
    const radiogroups = screen.getAllByRole('radiogroup');
    const calendarGroup = radiogroups[0];
    const lunarRadio = calendarGroup.querySelectorAll('[role="radio"]')[1];
    fireEvent.click(lunarRadio);
    expect(setCalendarType).toHaveBeenCalledWith('lunar');
  });

  it('gender: male radio is checked by default', () => {
    renderForm({ gender: 'male' });
    const radiogroups = screen.getAllByRole('radiogroup');
    // Gender radiogroup is the second one (after calendar type)
    const genderGroup = radiogroups[1];
    const radios = genderGroup.querySelectorAll('[role="radio"]');
    const maleRadio = Array.from(radios).find((r) => r.getAttribute('aria-checked') === 'true');
    expect(maleRadio).toBeDefined();
  });

  it('gender: clicking female calls setGender', () => {
    const setGender = vi.fn();
    renderForm({ gender: 'male', setGender });
    const radiogroups = screen.getAllByRole('radiogroup');
    const genderGroup = radiogroups[1];
    const radios = genderGroup.querySelectorAll('[role="radio"]');
    const femaleRadio = radios[1];
    fireEvent.click(femaleRadio);
    expect(setGender).toHaveBeenCalledWith('female');
  });

  it('date input calls setSolarDate on change', () => {
    const setSolarDate = vi.fn();
    renderForm({ setSolarDate });
    const dateInput = screen.getByLabelText(/出生日期/i);
    fireEvent.change(dateInput, { target: { value: '2001-01-01' } });
    expect(setSolarDate).toHaveBeenCalledWith('2001-01-01');
  });

  it('time select calls setTimeIndex on change', () => {
    const setTimeIndex = vi.fn();
    renderForm({ setTimeIndex });
    const timeSelect = screen.getByLabelText(/出生時辰/i);
    fireEvent.change(timeSelect, { target: { value: '5' } });
    expect(setTimeIndex).toHaveBeenCalledWith('5');
  });

  it('longitude input calls setLongitude on change', () => {
    const setLongitude = vi.fn();
    renderForm({ setLongitude });
    const lonInput = screen.getByLabelText(/出生地經度/i);
    fireEvent.change(lonInput, { target: { value: '120.5' } });
    expect(setLongitude).toHaveBeenCalledWith('120.5');
  });

  it('form submission calls onSubmit', () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    const button = screen.getByRole('button', { name: /生成紫微命盤/i });
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('solarTimeActive shows the applied message', () => {
    renderForm({ solarTimeActive: true });
    expect(screen.getByText(/已套用真太陽時修正/i)).toBeInTheDocument();
  });

  it('solarTimeActive=false shows the hint message', () => {
    renderForm({ solarTimeActive: false });
    expect(screen.getByText(/同時輸入經度與精確時間/i)).toBeInTheDocument();
  });
});
