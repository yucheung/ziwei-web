import type { ChartConfig } from './chartConfig';

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const LEGACY_ID_PREFIX = 'legacy:';

/**
 * Keep the serialized shape explicit so a ChartConfig's identity never depends
 * on caller property insertion order or on presentation locale.
 */
function serializeChartConfig(config: ChartConfig): string {
  return JSON.stringify({
    solarDate: config.solarDate ?? null,
    lunarDate: config.lunarDate ?? null,
    calendarType: config.calendarType,
    isLeapMonth: config.isLeapMonth,
    hour: config.hour,
    gender: config.gender,
    algorithm: config.algorithm,
    yearDivide: config.yearDivide,
    dayDivide: config.dayDivide,
    astroType: config.astroType,
    longitude: config.longitude ?? null,
  });
}

function hashString(value: string): string {
  let hash = FNV_OFFSET_BASIS_64;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * FNV_PRIME_64);
  }

  return hash.toString(16).padStart(16, '0');
}

/** Return a deterministic identity for all chart-producing inputs. */
export function createChartId(config: ChartConfig): string {
  return `chart-${hashString(serializeChartConfig(config))}`;
}

/**
 * Recreate the pre-B8b identity so readings saved before the hash migration
 * remain discoverable while the new ID is used for all newly saved readings.
 */
export function createLegacyChartId(config: ChartConfig): string {
  const date = config.solarDate || config.lunarDate;
  return `${LEGACY_ID_PREFIX}${config.calendarType}-${date}-${config.hour}-${config.gender}`;
}

function withoutLegacyPrefix(chartId: string): string {
  return chartId.startsWith(LEGACY_ID_PREFIX) ? chartId.slice(LEGACY_ID_PREFIX.length) : chartId;
}

/** Return true for both the tagged ID and the untagged pre-B8b ID. */
export function isLegacyChartId(chartId: string): boolean {
  if (chartId.startsWith(LEGACY_ID_PREFIX)) return true;
  return /^(?:solar|lunar)-.+-.+-(?:male|female)$/u.test(chartId);
}

/** Query both the new tagged spelling and the historical untagged spelling. */
export function getLegacyChartIdVariants(chartId: string): string[] {
  if (!isLegacyChartId(chartId)) return [];

  const unprefixed = withoutLegacyPrefix(chartId);
  return [`${LEGACY_ID_PREFIX}${unprefixed}`, unprefixed];
}
