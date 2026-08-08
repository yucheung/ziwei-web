import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Heart, ShieldCheck, Sparkles, User } from 'lucide-react';
import { analyzeChart } from '../lib/chartAnalyzer';
import { getCanonicalAstrolabe } from '../lib/chartModel';
import { evaluateMatch, type MatchRuleResult } from '../lib/matchRules';
import { applySensitivityBoundaries } from '../lib/matchRules/sensitivity';
import { useTranslation } from '../i18n';

import type { ChartConfig } from '../lib/chartConfig';
import type { GetChartOptions } from '../lib/astro';

const TIME_KEYS = [
  'time.0', 'time.1', 'time.2', 'time.3', 'time.4', 'time.5', 'time.6',
  'time.7', 'time.8', 'time.9', 'time.10', 'time.11', 'time.12',
] as const;

export interface MatchPersonConfig {
  name?: string;
  date?: string;
  timeIndex?: string | number;
  gender?: 'male' | 'female';
  calendarType?: 'solar' | 'lunar';
  isLeapMonth?: boolean;
  algorithm?: 'zhongzhou' | 'default';
  yearDivide?: 'normal' | 'exact';
  dayDivide?: 'current' | 'forward';
  astroType?: 'heaven' | 'earth' | 'human';
  longitude?: number;
}

interface MatchPanelProps {
  initialPersonA?: MatchPersonConfig;
  initialPersonB?: MatchPersonConfig;
  currentBirthData?: ChartConfig | null;
}

export const MatchPanel: React.FC<MatchPanelProps> = ({ initialPersonA, initialPersonB, currentBirthData }) => {
  const { t, locale } = useTranslation();
  const [nameA, setNameA] = useState(initialPersonA?.name || t('match.defaultPersonA'));
  const [dateA, setDateA] = useState(initialPersonA?.date || '2000-08-16');
  const [timeA, setTimeA] = useState(String(initialPersonA?.timeIndex ?? '2'));
  const [genderA, setGenderA] = useState<'male' | 'female'>(initialPersonA?.gender || 'male');
  const [calendarTypeA, setCalendarTypeA] = useState<'solar' | 'lunar'>(initialPersonA?.calendarType || 'solar');
  const [isLeapMonthA, setIsLeapMonthA] = useState<boolean>(initialPersonA?.isLeapMonth || false);
  const [algorithmA, setAlgorithmA] = useState<'zhongzhou' | 'default'>(initialPersonA?.algorithm || 'zhongzhou');
  const [yearDivideA, setYearDivideA] = useState<'normal' | 'exact'>(initialPersonA?.yearDivide || 'normal');
  const [dayDivideA, setDayDivideA] = useState<'current' | 'forward'>(initialPersonA?.dayDivide || 'forward');
  const [astroTypeA, setAstroTypeA] = useState<'heaven' | 'earth' | 'human'>(initialPersonA?.astroType || 'heaven');
  const [longitudeA, setLongitudeA] = useState<number | undefined>(initialPersonA?.longitude);

  const [nameB, setNameB] = useState(initialPersonB?.name || t('match.defaultPersonB'));
  const [dateB, setDateB] = useState(initialPersonB?.date || '2002-05-20');
  const [timeB, setTimeB] = useState(String(initialPersonB?.timeIndex ?? '6'));
  const [genderB, setGenderB] = useState<'male' | 'female'>(initialPersonB?.gender || 'female');
  const [calendarTypeB, setCalendarTypeB] = useState<'solar' | 'lunar'>(initialPersonB?.calendarType || 'solar');
  const [isLeapMonthB, setIsLeapMonthB] = useState<boolean>(initialPersonB?.isLeapMonth || false);
  const [algorithmB, setAlgorithmB] = useState<'zhongzhou' | 'default'>(initialPersonB?.algorithm || 'zhongzhou');
  const [yearDivideB, setYearDivideB] = useState<'normal' | 'exact'>(initialPersonB?.yearDivide || 'normal');
  const [dayDivideB, setDayDivideB] = useState<'current' | 'forward'>(initialPersonB?.dayDivide || 'forward');
  const [astroTypeB, setAstroTypeB] = useState<'heaven' | 'earth' | 'human'>(initialPersonB?.astroType || 'heaven');
  const [longitudeB, setLongitudeB] = useState<number | undefined>(initialPersonB?.longitude);

  const handleUseCurrentChartForA = () => {
    if (!currentBirthData) return;
    const date = currentBirthData.calendarType === 'lunar'
      ? (currentBirthData.lunarDate || '')
      : (currentBirthData.solarDate || '');
    if (date) setDateA(date);
    setTimeA(String(currentBirthData.hour));
    setGenderA(currentBirthData.gender);
    setCalendarTypeA(currentBirthData.calendarType);
    setIsLeapMonthA(currentBirthData.isLeapMonth ?? false);
    setAlgorithmA(currentBirthData.algorithm);
    setYearDivideA(currentBirthData.yearDivide);
    setDayDivideA(currentBirthData.dayDivide);
    setAstroTypeA(currentBirthData.astroType);
    setLongitudeA(currentBirthData.longitude);
  };

  const matchResults: MatchRuleResult[] | null = useMemo(() => {
    try {
      const optionsA: GetChartOptions = {
        date: dateA,
        timeIndex: Number.isNaN(Number(timeA)) ? timeA : Number.parseInt(timeA, 10),
        gender: genderA,
        isLunar: calendarTypeA === 'lunar',
        isLeapMonth: isLeapMonthA,
        config: {
          algorithm: algorithmA,
          yearDivide: yearDivideA,
          dayDivide: dayDivideA,
        },
        astroType: astroTypeA,
        ...(longitudeA !== undefined ? { longitude: longitudeA } : {}),
      };
      const chartA = analyzeChart(getCanonicalAstrolabe(optionsA), locale);

      const optionsB: GetChartOptions = {
        date: dateB,
        timeIndex: Number.isNaN(Number(timeB)) ? timeB : Number.parseInt(timeB, 10),
        gender: genderB,
        isLunar: calendarTypeB === 'lunar',
        isLeapMonth: isLeapMonthB,
        config: {
          algorithm: algorithmB,
          yearDivide: yearDivideB,
          dayDivide: dayDivideB,
        },
        astroType: astroTypeB,
        ...(longitudeB !== undefined ? { longitude: longitudeB } : {}),
      };
      const chartB = analyzeChart(getCanonicalAstrolabe(optionsB), locale);
      return applySensitivityBoundaries(evaluateMatch(chartA, chartB));
    } catch (error) {
      console.error('Match rule evaluation error:', error);
      return null;
    }
  }, [
    dateA, timeA, genderA, calendarTypeA, isLeapMonthA, algorithmA, yearDivideA, dayDivideA, astroTypeA, longitudeA,
    dateB, timeB, genderB, calendarTypeB, isLeapMonthB, algorithmB, yearDivideB, dayDivideB, astroTypeB, longitudeB,
    locale,
  ]);

  const loadPresetPair = (pairType: 1 | 2) => {
    if (pairType === 1) {
      setNameA(t('match.preset1NameA'));
      setDateA('1996-03-15');
      setTimeA('6');
      setGenderA('male');
      setCalendarTypeA('solar');
      setIsLeapMonthA(false);
      setAlgorithmA('zhongzhou');
      setYearDivideA('normal');
      setDayDivideA('forward');
      setAstroTypeA('heaven');
      setLongitudeA(undefined);

      setNameB(t('match.preset1NameB'));
      setDateB('1998-11-20');
      setTimeB('2');
      setGenderB('female');
      setCalendarTypeB('solar');
      setIsLeapMonthB(false);
      setAlgorithmB('zhongzhou');
      setYearDivideB('normal');
      setDayDivideB('forward');
      setAstroTypeB('heaven');
      setLongitudeB(undefined);
      return;
    }

    setNameA(t('match.preset2NameA'));
    setDateA('1992-07-08');
    setTimeA('8');
    setGenderA('male');
    setCalendarTypeA('solar');
    setIsLeapMonthA(false);
    setAlgorithmA('zhongzhou');
    setYearDivideA('normal');
    setDayDivideA('forward');
    setAstroTypeA('heaven');
    setLongitudeA(undefined);

    setNameB(t('match.preset2NameB'));
    setDateB('1994-01-28');
    setTimeB('10');
    setGenderB('female');
    setCalendarTypeB('solar');
    setIsLeapMonthB(false);
    setAlgorithmB('zhongzhou');
    setYearDivideB('normal');
    setDayDivideB('forward');
    setAstroTypeB('heaven');
    setLongitudeB(undefined);
  };

  const renderPersonInputs = (
    person: 'A' | 'B',
    name: string,
    setName: (value: string) => void,
    date: string,
    setDate: (value: string) => void,
    time: string,
    setTime: (value: string) => void,
    gender: 'male' | 'female',
    setGender: (value: 'male' | 'female') => void,
  ) => {
    const isA = person === 'A';
    const personLabel = t(isA ? 'match.personA' : 'match.personB');
    return (
      <div className={isA
        ? 'glass-panel p-5 rounded-2xl border border-amber-500/30 bg-white/80 dark:bg-slate-900/60 shadow-lg space-y-4'
        : 'glass-panel p-5 rounded-2xl border border-purple-500/30 bg-white/80 dark:bg-slate-900/60 shadow-lg space-y-4'}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className={isA ? 'font-semibold text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2' : 'font-semibold text-purple-700 dark:text-purple-300 text-sm flex items-center gap-2'}>
            <User className={isA ? 'w-4 h-4 text-amber-600 dark:text-amber-400' : 'w-4 h-4 text-purple-600 dark:text-purple-400'} aria-hidden="true" />
            {personLabel}
          </span>
          <div className="flex items-center gap-2">
            {isA && currentBirthData && (
              <button
                type="button"
                onClick={handleUseCurrentChartForA}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-colors font-medium cursor-pointer"
              >
                {t('match.useCurrentChart')}
              </button>
            )}
            <span className={isA ? 'text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' : 'text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'}>
              {t(isA ? 'match.labelA' : 'match.labelB')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`person-${person.toLowerCase()}-name`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t('match.nameLabel')}</label>
            <input id={`person-${person.toLowerCase()}-name`} type="text" value={name} onChange={(event) => setName(event.target.value)} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs" />
          </div>
          <div>
            <span className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t('form.gender')}</span>
            <div role="radiogroup" aria-label={`${personLabel} ${t('form.gender')}`} className="grid grid-cols-2 gap-1.5">
              {(['male', 'female'] as const).map((option) => (
                <button key={option} type="button" role="radio" aria-checked={gender === option} onClick={() => setGender(option)} className={gender === option ? (isA ? 'py-1.5 text-xs rounded-lg border bg-amber-500/20 border-amber-500/50 font-semibold' : 'py-1.5 text-xs rounded-lg border bg-purple-500/20 border-purple-500/50 font-semibold') : 'py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500'}>
                  {t(option === 'male' ? 'form.male' : 'form.female')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`person-${person.toLowerCase()}-date`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1"><Calendar className={isA ? 'w-3.5 h-3.5 text-amber-600' : 'w-3.5 h-3.5 text-purple-600'} aria-hidden="true" />{t('match.birthSolarDate')}</label>
            <input id={`person-${person.toLowerCase()}-date`} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs" />
          </div>
          <div>
            <label htmlFor={`person-${person.toLowerCase()}-time`} className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1"><Clock className={isA ? 'w-3.5 h-3.5 text-amber-600' : 'w-3.5 h-3.5 text-purple-600'} aria-hidden="true" />{t('form.birthTime')}</label>
            <select id={`person-${person.toLowerCase()}-time`} value={time} onChange={(event) => setTime(event.target.value)} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs">
              {TIME_KEYS.map((key, index) => <option key={key} value={index}>{t(key)}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100">
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 via-white to-purple-50 dark:from-slate-900/90 dark:via-purple-950/40 dark:to-slate-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><span className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-600"><Heart className="w-5 h-5 fill-rose-500/30" aria-hidden="true" /></span><h2 className="text-xl font-bold">{t('match.title')}</h2></div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('match.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => loadPresetPair(1)} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />{t('match.preset1')}</button>
          <button type="button" onClick={() => loadPresetPair(2)} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />{t('match.preset2')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderPersonInputs('A', nameA, setNameA, dateA, setDateA, timeA, setTimeA, genderA, setGenderA)}
        {renderPersonInputs('B', nameB, setNameB, dateB, setDateB, timeB, setTimeB, genderB, setGenderB)}
      </div>

      {!matchResults ? (
        <div className="glass-panel p-8 text-center text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-2xl">{t('match.error')}</div>
      ) : matchResults.length === 0 ? (
        <div className="glass-panel p-8 text-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl">{t('match.noResults')}</div>
      ) : (
        <section className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-xl space-y-5" aria-label={t('match.ruleResults')}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2"><ShieldCheck className="w-4 h-4" aria-hidden="true" />{t('match.ruleResults')}</h3>
            <span className="text-xs text-slate-600 dark:text-slate-400">{t('match.ruleCount', { count: String(matchResults.length) })}</span>
          </div>
          {matchResults.map((result) => (
            <article key={result.ruleId} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-slate-800 dark:text-slate-100">{result.ruleName}</h4><span className="text-xs text-slate-600 dark:text-slate-400"><span>{t('match.confidence')}</span>：{Math.round(result.confidence * 100)}%</span></div>
              <div className="space-y-2"><h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('match.conclusions')}</h5>{result.conclusions.map((conclusion, index) => <div key={`${result.ruleId}-conclusion-${index}`} className="text-xs text-slate-700 dark:text-slate-300 space-y-1"><p>{conclusion.description}</p><p className="text-slate-500 dark:text-slate-400"><span>{t('match.confidence')}</span>：{Math.round(conclusion.confidence * 100)}%</p>{conclusion.disclaimer && <aside className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100"><p className="font-semibold">{t('match.sensitivityDisclaimer')}</p><p>{conclusion.disclaimer}</p></aside>}</div>)}</div>
              <div className="space-y-2"><h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('match.evidence')}</h5>{result.evidence.map((evidence) => <dl key={`${result.ruleId}-${evidence.field}`} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-slate-50 dark:bg-slate-950/50 p-3 text-xs"><dt className="font-medium text-slate-600 dark:text-slate-400">{t('match.evidenceKnowledgeId')}</dt><dd>{evidence.knowledgeId}</dd><dt className="font-medium text-slate-600 dark:text-slate-400">{t('match.evidenceField')}</dt><dd>{evidence.field}</dd><dt className="font-medium text-slate-600 dark:text-slate-400">{t('match.evidenceSource')}</dt><dd>{evidence.source}</dd><dt className="font-medium text-slate-600 dark:text-slate-400">{t('match.evidenceValue')}</dt><dd>{evidence.value}</dd><dt className="font-medium text-slate-600 dark:text-slate-400">{t('match.evidenceReasoning')}</dt><dd>{evidence.reasoning}</dd></dl>)}</div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
