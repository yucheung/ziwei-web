import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { ChartConfig } from './chartConfig';

export interface StoredChart {
  id: string;
  name: string;
  birthData: ChartConfig;
  createdAt: string;
}

export interface StoredReading {
  id: string;
  chartId: string;
  reading: string;
  rules: unknown[];
  createdAt: string;
}

interface ZiweiStorageSchema extends DBSchema {
  charts: {
    key: string;
    value: StoredChart;
  };
  readings: {
    key: string;
    value: StoredReading;
  };
}

const DATABASE_NAME = 'ziwei-web';
const DATABASE_VERSION = 1;

let databasePromise: Promise<IDBPDatabase<ZiweiStorageSchema>> | undefined;
const memoryCharts = new Map<string, StoredChart>();
const memoryReadings = new Map<string, StoredReading>();

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function sortNewestFirst<T extends { createdAt: string; id: string }>(records: T[]): T[] {
  return records.sort((left, right) => {
    const createdAtOrder = right.createdAt.localeCompare(left.createdAt);
    return createdAtOrder || left.id.localeCompare(right.id);
  });
}

async function getDatabase(): Promise<IDBPDatabase<ZiweiStorageSchema> | undefined> {
  if (typeof globalThis.indexedDB === 'undefined') {
    return undefined;
  }

  databasePromise ??= openDB<ZiweiStorageSchema>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('charts')) {
        database.createObjectStore('charts', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('readings')) {
        database.createObjectStore('readings', { keyPath: 'id' });
      }
    },
  });

  return databasePromise;
}

export async function saveChart(chart: StoredChart): Promise<StoredChart> {
  const database = await getDatabase();
  const storedChart = clone(chart);

  if (database) {
    await database.put('charts', storedChart);
  } else {
    memoryCharts.set(storedChart.id, storedChart);
  }

  return clone(storedChart);
}

export async function getChart(id: string): Promise<StoredChart | undefined> {
  const database = await getDatabase();
  const chart = database ? await database.get('charts', id) : memoryCharts.get(id);
  return chart === undefined ? undefined : clone(chart);
}

export async function listCharts(): Promise<StoredChart[]> {
  const database = await getDatabase();
  const charts = database ? await database.getAll('charts') : [...memoryCharts.values()];
  return sortNewestFirst(charts.map(clone));
}

export async function deleteChart(id: string): Promise<void> {
  const database = await getDatabase();

  if (database) {
    await database.delete('charts', id);
  } else {
    memoryCharts.delete(id);
  }
}

export async function saveReading(reading: StoredReading): Promise<StoredReading> {
  const database = await getDatabase();
  const storedReading = clone(reading);

  if (database) {
    await database.put('readings', storedReading);
  } else {
    memoryReadings.set(storedReading.id, storedReading);
  }

  return clone(storedReading);
}

export async function getReading(id: string): Promise<StoredReading | undefined> {
  const database = await getDatabase();
  const reading = database ? await database.get('readings', id) : memoryReadings.get(id);
  return reading === undefined ? undefined : clone(reading);
}

export async function listReadings(chartId?: string): Promise<StoredReading[]> {
  const database = await getDatabase();
  const readings = database ? await database.getAll('readings') : [...memoryReadings.values()];
  const matchingReadings = chartId === undefined ? readings : readings.filter((reading) => reading.chartId === chartId);

  return sortNewestFirst(matchingReadings.map(clone));
}

export async function deleteReading(id: string): Promise<void> {
  const database = await getDatabase();

  if (database) {
    await database.delete('readings', id);
  } else {
    memoryReadings.delete(id);
  }
}

export async function clearAll(): Promise<void> {
  const database = await getDatabase();

  if (database) {
    const transaction = database.transaction(['charts', 'readings'], 'readwrite');
    await Promise.all([
      transaction.objectStore('charts').clear(),
      transaction.objectStore('readings').clear(),
      transaction.done,
    ]);
  } else {
    memoryCharts.clear();
    memoryReadings.clear();
  }
}
