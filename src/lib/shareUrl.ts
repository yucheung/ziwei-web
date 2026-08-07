import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { ChartConfig } from './chartConfig';

export interface SharePayload {
  version: 1;
  birthData: ChartConfig;
  reading: string;
}

const INVALID_SHARE_DATA_MESSAGE = 'Invalid shared chart data';

function invalidShareData(): never {
  throw new Error(INVALID_SHARE_DATA_MESSAGE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isValidHour(value: unknown): value is number | string {
  return (
    (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 12) ||
    (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
  );
}

function validateBirthData(value: unknown): ChartConfig {
  if (!isRecord(value)) invalidShareData();

  const baseKeys = [
    'solarDate',
    'lunarDate',
    'calendarType',
    'isLeapMonth',
    'hour',
    'gender',
    'algorithm',
    'yearDivide',
    'dayDivide',
    'astroType',
    'longitude',
  ];
  if (!hasOnlyKeys(value, baseKeys)) invalidShareData();

  const { calendarType, solarDate, lunarDate, isLeapMonth, hour, gender, algorithm, yearDivide, dayDivide, astroType, longitude } = value;
  if (calendarType !== 'solar' && calendarType !== 'lunar') invalidShareData();
  if (calendarType === 'solar' ? !isValidDate(solarDate) || lunarDate !== undefined : !isValidDate(lunarDate) || solarDate !== undefined) {
    invalidShareData();
  }
  if (typeof isLeapMonth !== 'boolean' || !isValidHour(hour)) invalidShareData();
  if (gender !== 'male' && gender !== 'female') invalidShareData();
  if (algorithm !== 'default' && algorithm !== 'zhongzhou') invalidShareData();
  if (yearDivide !== 'normal' && yearDivide !== 'exact') invalidShareData();
  if (dayDivide !== 'current' && dayDivide !== 'forward') invalidShareData();
  if (astroType !== 'heaven' && astroType !== 'earth' && astroType !== 'human') invalidShareData();
  if (longitude !== undefined && (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    invalidShareData();
  }

  return {
    ...(calendarType === 'solar' ? { solarDate } : { lunarDate }),
    calendarType,
    isLeapMonth,
    hour,
    gender,
    algorithm,
    yearDivide,
    dayDivide,
    astroType,
    ...(longitude === undefined ? {} : { longitude }),
  } as ChartConfig;
}

function validatePayload(value: unknown): SharePayload {
  if (!isRecord(value) || !hasOnlyKeys(value, ['version', 'birthData', 'reading'])) invalidShareData();
  if (value.version !== 1 || typeof value.reading !== 'string') invalidShareData();

  return {
    version: 1,
    birthData: validateBirthData(value.birthData),
    reading: value.reading,
  };
}

function defaultBaseUrl(): string {
  return typeof window === 'undefined' ? 'http://localhost/' : window.location.href;
}

export function createShareUrl(birthData: ChartConfig, reading: string, baseUrl = defaultBaseUrl()): string {
  const payload: SharePayload = {
    version: 1,
    birthData: validateBirthData(birthData),
    reading,
  };
  const url = new URL(baseUrl);
  url.searchParams.set('s', compressToEncodedURIComponent(JSON.stringify(payload)));
  return url.toString();
}

export function decodeSharePayload(compressed: string): SharePayload {
  try {
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) invalidShareData();
    return validatePayload(JSON.parse(json));
  } catch {
    invalidShareData();
  }
}

export function decodeShareUrl(url: string): SharePayload | null {
  try {
    const compressed = new URL(url).searchParams.get('s');
    return compressed ? decodeSharePayload(compressed) : null;
  } catch {
    return null;
  }
}
