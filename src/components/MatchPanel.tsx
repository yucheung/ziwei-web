import React, { useState, useMemo } from 'react';
import {
  Heart,
  Users,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { analyzeMatch, MatchResult, MutagenKind } from '../lib/match';
import { useTranslation } from '../i18n';

interface MatchPanelProps {
  initialPersonA?: {
    name: string;
    date: string;
    timeIndex: string | number;
    gender: 'male' | 'female';
  };
  initialPersonB?: {
    name: string;
    date: string;
    timeIndex: string | number;
    gender: 'male' | 'female';
  };
}

export const MatchPanel: React.FC<MatchPanelProps> = ({ initialPersonA, initialPersonB }) => {
  const { t } = useTranslation();

  // Person A inputs
  const [nameA, setNameA] = useState(initialPersonA?.name || t('match.defaultPersonA'));
  const [dateA, setDateA] = useState(initialPersonA?.date || '2000-08-16');
  const [timeA, setTimeA] = useState<string>(String(initialPersonA?.timeIndex ?? '2'));
  const [genderA, setGenderA] = useState<'male' | 'female'>(initialPersonA?.gender || 'male');

  // Person B inputs
  const [nameB, setNameB] = useState(initialPersonB?.name || t('match.defaultPersonB'));
  const [dateB, setDateB] = useState(initialPersonB?.date || '2002-05-20');
  const [timeB, setTimeB] = useState<string>(String(initialPersonB?.timeIndex ?? '6'));
  const [genderB, setGenderB] = useState<'male' | 'female'>(initialPersonB?.gender || 'female');

  // Selected tab for Cross Flying Mutagens
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  // Compute Match Result
  const matchResult: MatchResult | null = useMemo(() => {
    try {
      return analyzeMatch({
        personA: {
          name: nameA,
          date: dateA,
          timeIndex: parseInt(timeA, 10),
          gender: genderA,
        },
        personB: {
          name: nameB,
          date: dateB,
          timeIndex: parseInt(timeB, 10),
          gender: genderB,
        },
      });
    } catch (err) {
      console.error('Match analysis error:', err);
      return null;
    }
  }, [nameA, dateA, timeA, genderA, nameB, dateB, timeB, genderB]);

  const loadPresetPair = (pairType: 1 | 2) => {
    if (pairType === 1) {
      setNameA(t('match.preset1NameA'));
      setDateA('1996-03-15');
      setTimeA('6');
      setGenderA('male');

      setNameB(t('match.preset1NameB'));
      setDateB('1998-11-20');
      setTimeB('2');
      setGenderB('female');
    } else {
      setNameA(t('match.preset2NameA'));
      setDateA('1992-07-08');
      setTimeA('8');
      setGenderA('male');

      setNameB(t('match.preset2NameB'));
      setDateB('1994-01-28');
      setTimeB('10');
      setGenderB('female');
    }
  };

  const getMutagenBadgeStyle = (mutagen: MutagenKind) => {
    switch (mutagen) {
      case '\u797f':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case '\u6b0a':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case '\u79d1':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30';
      case '\u5fcc':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 via-white to-purple-50 dark:from-slate-900/90 dark:via-purple-950/40 dark:to-slate-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400">
              <Heart className="w-5 h-5 fill-rose-500/30 animate-pulse" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-bold bg-gradient-to-r from-rose-600 via-amber-600 to-purple-700 dark:from-rose-200 dark:via-amber-200 dark:to-purple-300 bg-clip-text text-transparent">
              {t('match.title')}
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t('match.subtitle')}
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadPresetPair(1)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {t('match.preset1')}
          </button>
          <button
            type="button"
            onClick={() => loadPresetPair(2)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            {t('match.preset2')}
          </button>
        </div>
      </div>

      {/* Dual Birth Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Person A Input Card */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-white/80 dark:bg-slate-900/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-semibold text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              {t('match.personA')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {t('match.labelA')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="person-a-name" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t('match.nameLabel')}</label>
              <input
                id="person-a-name"
                type="text"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>

            <div>
              <span className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t('form.gender')}</span>
              <div role="radiogroup" aria-label={`${t('match.personA')} ${t('form.gender')}`} className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={genderA === 'male'}
                  onClick={() => setGenderA('male')}
                  className={`py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    genderA === 'male'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('form.male')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={genderA === 'female'}
                  onClick={() => setGenderA('female')}
                  className={`py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    genderA === 'female'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('form.female')}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="person-a-date" className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" /> {t('match.birthSolarDate')}
              </label>
              <input
                id="person-a-date"
                type="date"
                value={dateA}
                onChange={(e) => setDateA(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </div>

            <div>
              <label htmlFor="person-a-time" className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" /> {t('form.birthTime')}
              </label>
              <select
                id="person-a-time"
                value={timeA}
                onChange={(e) => setTimeA(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
          </div>
        </div>

        {/* Person B Input Card */}
        <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-white/80 dark:bg-slate-900/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-semibold text-purple-700 dark:text-purple-300 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              {t('match.personB')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
              {t('match.labelB')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="person-b-name" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t('match.nameLabel')}</label>
              <input
                id="person-b-name"
                type="text"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              />
            </div>

            <div>
              <span className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{t('form.gender')}</span>
              <div role="radiogroup" aria-label={`${t('match.personB')} ${t('form.gender')}`} className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={genderB === 'male'}
                  onClick={() => setGenderB('male')}
                  className={`py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    genderB === 'male'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('form.male')}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={genderB === 'female'}
                  onClick={() => setGenderB('female')}
                  className={`py-1.5 text-xs rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                    genderB === 'female'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300 font-semibold'
                      : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {t('form.female')}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="person-b-date" className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" /> {t('match.birthSolarDate')}
              </label>
              <input
                id="person-b-date"
                type="date"
                value={dateB}
                onChange={(e) => setDateB(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              />
            </div>

            <div>
              <label htmlFor="person-b-time" className="block text-xs text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" /> {t('form.birthTime')}
              </label>
              <select
                id="person-b-time"
                value={timeB}
                onChange={(e) => setTimeB(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
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
          </div>
        </div>
      </div>

      {!matchResult ? (
        <div className="glass-panel p-8 text-center text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-2xl">
          {t('match.error')}
        </div>
      ) : (
        <>
          {/* Section 1: Compatibility Score & Breakdown Gauge */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Score Gauge Badge */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-950/80 dark:to-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 border-2 border-amber-400/40 flex flex-col items-center justify-center shadow-lg shadow-amber-500/10">
                <span className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-rose-600 dark:from-amber-200 dark:to-rose-300 bg-clip-text text-transparent">
                  {matchResult.compatibility.overallScore}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono uppercase">Match Score</span>
              </div>
              <h3 className="text-base font-bold text-amber-700 dark:text-amber-300 mt-2">
                {matchResult.compatibility.ratingLabel}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t('match.branchRelation')}：{matchResult.compatibility.branchRelation}
              </p>
            </div>

            {/* Right Progress Bars */}
            <div className="lg:col-span-8 space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                {t('match.multiDimScore')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Emotional Harmony */}
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" /> {t('match.emotional')}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold">{matchResult.compatibility.emotionalHarmony}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-500"
                      style={{ width: `${matchResult.compatibility.emotionalHarmony}%` }}
                    />
                  </div>
                </div>

                {/* Personality Match */}
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" /> {t('match.personality')}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{matchResult.compatibility.personalityMatch}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                      style={{ width: `${matchResult.compatibility.personalityMatch}%` }}
                    />
                  </div>
                </div>

                {/* Career & Wealth */}
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> {t('match.careerWealth')}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{matchResult.compatibility.careerWealthSynergy}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${matchResult.compatibility.careerWealthSynergy}%` }}
                    />
                  </div>
                </div>

                {/* Longterm Stability */}
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" /> {t('match.longtermStability')}
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">{matchResult.compatibility.longtermStability}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500"
                      style={{ width: `${matchResult.compatibility.longtermStability}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Side-by-Side Dual Astrolabe Comparison */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <ArrowRightLeft className="w-4 h-4" aria-hidden="true" />
              {t('match.sideBySideTitle')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Center Connector Badge for Large Screens */}
              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-400 items-center justify-center text-xs font-bold shadow-lg z-10">
                VS
              </div>

              {/* Person A Info Box */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-xl border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-amber-700 dark:text-amber-400 text-sm">{matchResult.personA.name}</h4>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {matchResult.personA.gender === 'female' ? t('form.female') : t('form.male')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.lunarBirth')}：</span>
                    <p className="text-slate-800 dark:text-slate-200 font-mono">{matchResult.personA.lunarDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.stemBranch')}：</span>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{matchResult.personA.chineseDate}</p>
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 space-y-1 text-xs">
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">
                      {t('match.mingStars', { branch: matchResult.personA.soulPalaceBranch })}：
                    </span>
                    <span className="text-amber-700 dark:text-amber-300 font-bold ml-1">
                      {matchResult.personA.mingMajorStars.join('\u3001')}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.fuqiStars')}：</span>
                    <span className="text-rose-600 dark:text-rose-300 font-semibold ml-1">
                      {matchResult.personA.fuqiMajorStars.join('\u3001')}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.wealthStars')}：</span>
                    <span className="text-emerald-600 dark:text-emerald-300 ml-1">
                      {matchResult.personA.wealthMajorStars.join('\u3001')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Person B Info Box */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-xl border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-purple-700 dark:text-purple-400 text-sm">{matchResult.personB.name}</h4>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {matchResult.personB.gender === 'female' ? t('form.female') : t('form.male')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.lunarBirth')}：</span>
                    <p className="text-slate-800 dark:text-slate-200 font-mono">{matchResult.personB.lunarDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.stemBranch')}：</span>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{matchResult.personB.chineseDate}</p>
                  </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 space-y-1 text-xs">
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">
                      {t('match.mingStars', { branch: matchResult.personB.soulPalaceBranch })}：
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 font-bold ml-1">
                      {matchResult.personB.mingMajorStars.join('\u3001')}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.fuqiStars')}：</span>
                    <span className="text-rose-600 dark:text-rose-300 font-semibold ml-1">
                      {matchResult.personB.fuqiMajorStars.join('\u3001')}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">{t('match.wealthStars')}：</span>
                    <span className="text-emerald-600 dark:text-emerald-300 ml-1">
                      {matchResult.personB.wealthMajorStars.join('\u3001')}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Four Transformations Flying Cross Matching */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  {t('match.crossFlyingTitle')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('match.crossFlyingSubtitle')}
                </p>
              </div>

              {/* Group Tabs */}
              <div role="tablist" aria-label={t('match.crossFlyingTitle')} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap">
                {matchResult.crossMutagens.map((group, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={activeGroupIndex === idx}
                    onClick={() => setActiveGroupIndex(idx)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      activeGroupIndex === idx
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {group.sourcePerson} [{group.stemType}]
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Mutagen Details */}
            {matchResult.crossMutagens[activeGroupIndex] && (
              <div className="space-y-4">
                <div className="text-xs text-slate-700 dark:text-slate-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {t('match.crossSourceText', {
                      source: matchResult.crossMutagens[activeGroupIndex].sourcePerson,
                      stemType: matchResult.crossMutagens[activeGroupIndex].stemType,
                      stem: matchResult.crossMutagens[activeGroupIndex].stem,
                      target: matchResult.crossMutagens[activeGroupIndex].targetPerson,
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchResult.crossMutagens[activeGroupIndex].details.map((detail, dIdx) => (
                    <div
                      key={dIdx}
                      className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getMutagenBadgeStyle(
                            detail.mutagen
                          )}`}
                        >
                          {t('chart.hua')}{detail.mutagen}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t('match.targetPalaceLabel')}：<strong className="text-amber-700 dark:text-amber-300">{detail.targetPalaceName}</strong>（{detail.starName}）
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{detail.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Relationship Key Points & Guidance */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xl space-y-6">
            <h3 className="text-base font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              {t('match.relPointsTitle')}
            </h3>

            {/* Analysis Paragraphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" aria-hidden="true" /> {t('match.mingVsMingTitle')}
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{matchResult.relationshipPoints.mingVsMingText}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <Heart className="w-4 h-4" aria-hidden="true" /> {t('match.mingVsFuqiTitle')}
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{matchResult.relationshipPoints.mingVsFuQiText}</p>
              </div>
            </div>

            {/* Strengths & Risks Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Strengths */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {t('match.strengthsTitle')}
                </h4>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {matchResult.relationshipPoints.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-500/30 space-y-3">
                <h4 className="font-bold text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" /> {t('match.risksTitle')}
                </h4>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {matchResult.relationshipPoints.risks.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-600 dark:text-rose-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Advice */}
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-500/30 space-y-3">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" aria-hidden="true" /> {t('match.adviceTitle')}
                </h4>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {matchResult.relationshipPoints.advice.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
