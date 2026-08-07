import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import type { StoredReading } from '../lib/storage';
import { clearAll, listReadings, saveReading } from '../lib/storage';
import { HistoryPanel } from './HistoryPanel';

const firstReading: StoredReading = {
  id: 'reading-1',
  chartId: 'chart-100',
  reading: '第一筆歷史解讀內容：這是一段紫微斗數命盤詳細解讀測試內容。',
  rules: [{ id: 'rule-1' }, { id: 'rule-2' }],
  createdAt: '2026-08-07T10:00:00.000Z',
};

const secondReading: StoredReading = {
  id: 'reading-2',
  chartId: 'chart-100',
  reading: '第二筆歷史解讀內容：這是另一段紫微斗數命盤詳細解讀測試內容。',
  rules: [{ id: 'rule-3' }],
  createdAt: '2026-08-07T12:00:00.000Z',
};

function renderPanel(chartId = 'chart-100', onSelectReading = vi.fn()) {
  render(
    <I18nProvider defaultLocale="zh-TW">
      <HistoryPanel chartId={chartId} onSelectReading={onSelectReading} />
    </I18nProvider>
  );

  return { onSelectReading };
}

beforeEach(async () => {
  await clearAll();
});

describe('HistoryPanel', () => {
  it('shows empty state when no readings exist for the given chartId', async () => {
    renderPanel();

    expect(await screen.findByText('尚無歷史解讀紀錄')).toBeInTheDocument();
  });

  it('lists readings with date, summary, and rule count', async () => {
    await saveReading(firstReading);
    await saveReading(secondReading);

    renderPanel();

    expect(await screen.findByText('第一筆歷史解讀內容：這是一段紫微斗數命盤詳細解讀測試內容。')).toBeInTheDocument();
    expect(screen.getByText('2 條規則')).toBeInTheDocument();
    expect(screen.getByText('1 條規則')).toBeInTheDocument();
  });

  it('calls onSelectReading when restore button is clicked', async () => {
    await saveReading(firstReading);
    const { onSelectReading } = renderPanel();

    const restoreButton = await screen.findByRole('button', { name: '還原解讀' });
    fireEvent.click(restoreButton);

    expect(onSelectReading).toHaveBeenCalledWith(firstReading);
  });

  it('deletes a reading after confirmation', async () => {
    await saveReading(firstReading);
    const confirmSpy = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirmSpy);

    renderPanel();

    const deleteButton = await screen.findByRole('button', { name: '刪除紀錄' });
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalledWith('確定要刪除此筆解讀歷史嗎？此操作無法復原。');
    expect(await listReadings('chart-100')).toHaveLength(1);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '刪除紀錄' }));

    await waitFor(async () => {
      expect(await listReadings('chart-100')).toEqual([]);
    });

    vi.unstubAllGlobals();
  });

  it('compares two selected readings side-by-side', async () => {
    await saveReading(firstReading);
    await saveReading(secondReading);

    renderPanel();

    const checkboxes = await screen.findAllByRole('checkbox', { name: '選擇比較' });
    expect(checkboxes).toHaveLength(2);

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const compareButton = screen.getByRole('button', { name: /並排比較/u });
    expect(compareButton).not.toBeDisabled();

    fireEvent.click(compareButton);

    expect(screen.getByText('解讀 A (較舊)')).toBeInTheDocument();
    expect(screen.getByText('解讀 B (較新)')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: '關閉比較' });
    fireEvent.click(closeButton);

    expect(screen.queryByText('解讀 A (較舊)')).not.toBeInTheDocument();
  });

  it('exports reading history as JSON file', async () => {
    await saveReading(firstReading);
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    renderPanel();

    const exportButton = await screen.findByRole('button', { name: '匯出歷史 JSON' });
    fireEvent.click(exportButton);

    expect(createObjectURL).toHaveBeenCalled();
    expect(screen.getByText('已匯出解讀歷史 JSON')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
