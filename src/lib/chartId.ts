import type { ChartConfig } from './chartConfig';

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;

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
  return `${config.calendarType}-${date}-${config.hour}-${config.gender}`;
}
