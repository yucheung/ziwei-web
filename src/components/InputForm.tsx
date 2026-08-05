import React from 'react';
import { User, Calendar, Clock, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Settings } from './Settings';
import type { Config, AstroType } from '../lib/astro';

export interface InputFormProps {
  solarDate: string;
  setSolarDate: (date: string) => void;
  timeIndex: string;
  setTimeIndex: (index: string) => void;
  gender: 'male' | 'female';
  setGender: (gender: 'male' | 'female') => void;
  calendarType: 'solar' | 'lunar';
  setCalendarType: (type: 'solar' | 'lunar') => void;
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  astroType: AstroType;
  setAstroType: (type: AstroType) => void;
  longitude: string;
  setLongitude: (value: string) => void;
  preciseTime: string;
  setPreciseTime: (value: string) => void;
  solarTimeActive: boolean;
  onSubmit: (e?: React.FormEvent) => void;
}

export function InputForm({
  solarDate,
  setSolarDate,
  timeIndex,
  setTimeIndex,
  gender,
  setGender,
  calendarType,
  setCalendarType,
  config,
  setConfig,
  astroType,
  setAstroType,
  longitude,
  setLongitude,
  preciseTime,
  setPreciseTime,
  solarTimeActive,
  onSubmit,
}: InputFormProps) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 transition-colors">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-5">
        <User className="w-5 h-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
        {t('form.title')}
      </h2>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Calendar type switch */}
        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('form.calendarType')}</span>
          <div role="radiogroup" aria-label={t('form.calendarType')} className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              aria-checked={calendarType === 'solar'}
              onClick={() => setCalendarType('solar')}
              className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                calendarType === 'solar'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('form.solar')}
            </button>
            <button
              type="button"
              aria-checked={calendarType === 'lunar'}
              onClick={() => setCalendarType('lunar')}
              className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                calendarType === 'lunar'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('form.lunar')}
            </button>
          </div>
        </div>

        {/* Date Input */}
        <div>
          <label htmlFor="birth-date-input" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />{t('form.birthDate')}
          </label>
          <input
            id="birth-date-input"
            type="date"
            value={solarDate}
            onChange={(e) => setSolarDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>

        {/* Time Index Selection */}
        <div>
          <label htmlFor="birth-time-select" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />{t('form.birthTime')}
          </label>
          <select
            id="birth-time-select"
            value={timeIndex}
            onChange={(e) => setTimeIndex(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <option value="0">{t('time.0')}</option>
            <option value="1">{t('time.1')}</option>
            <option value="2">{t('time.2')}</option>
            <option value="3">{t('time.3')}</option>
            <option value="4">{t('time.4')}</option>
            <option value="5">{t('time.5')}</option>
            <option value="6">{t('time.6')}</option>
            <option value="7">{t('time.7')}</option>
            <option value="8">{t('time.8')}</option>
            <option value="9">{t('time.9')}</option>
            <option value="10">{t('time.10')}</option>
            <option value="11">{t('time.11')}</option>
            <option value="12">{t('time.12')}</option>
          </select>
        </div>

        {/* True Solar Time Correction (真太陽時修正) */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
            {t('form.solarTimeSection')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="longitude-input" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                {t('form.longitude')}
              </label>
              <input
                id="longitude-input"
                type="number"
                min={-180}
                max={180}
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder={t('form.longitudePlaceholder')}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="precise-time-input" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                {t('form.preciseTime')}
              </label>
              <input
                id="precise-time-input"
                type="time"
                value={preciseTime}
                onChange={(e) => setPreciseTime(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>
          </div>
          {solarTimeActive ? (
            <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {t('form.solarTimeApplied')}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{t('form.solarTimeHint')}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t('form.gender')}</span>
          <div role="radiogroup" aria-label={t('form.gender')} className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-checked={gender === 'male'}
              onClick={() => setGender('male')}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                gender === 'male'
                  ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('form.male')}
            </button>
            <button
              type="button"
              aria-checked={gender === 'female'}
              onClick={() => setGender('female')}
              className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                gender === 'female'
                  ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('form.female')}
            </button>
          </div>
        </div>

        {/* 斗數設定區塊 */}
        <Settings config={config} setConfig={setConfig} astroType={astroType} setAstroType={setAstroType} />

        <button
          type="submit"
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          {t('settings.generate')}
        </button>
      </form>
    </div>
  );
}
