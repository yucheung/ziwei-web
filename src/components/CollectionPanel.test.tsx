import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import type { ChartConfig } from '../lib/chartConfig';
import { clearAll, listCharts, saveChart } from '../lib/storage';
import { CollectionPanel } from './CollectionPanel';

const currentBirthData: ChartConfig = {
  solarDate: '2000-08-16',
  calendarType: 'solar',
  isLeapMonth: false,
  hour: 6,
  gender: 'male',
  algorithm: 'zhongzhou',
  yearDivide: 'normal',
  dayDivide: 'forward',
  astroType: 'heaven',
};

function renderPanel(
  birthData: ChartConfig | null = currentBirthData,
  onLoad = vi.fn(),
) {
  render(
    <I18nProvider defaultLocale="zh-TW">
      <CollectionPanel currentBirthData={birthData} onLoad={onLoad} />
    </I18nProvider>,
  );

  return { onLoad };
}

beforeEach(async () => {
  await clearAll();
});

describe('CollectionPanel', () => {
  it('shows an empty state and disables saving when no current chart exists', async () => {
    renderPanel(null);

    expect(await screen.findByText('尚未儲存命盤')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '儲存目前命盤' })).toBeDisabled();
  });

  it('saves the current chart through local storage', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('命盤名稱'), { target: { value: '我的命盤' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存目前命盤' }));

    await waitFor(async () => {
      expect(await listCharts()).toEqual([
        expect.objectContaining({
          name: '我的命盤',
          birthData: currentBirthData,
        }),
      ]);
    });
    expect(screen.getByText('我的命盤')).toBeInTheDocument();
  });

  it('lists saved name, birth data, and saved date', async () => {
    await saveChart({
      id: 'saved-chart',
      name: '已儲存命盤',
      birthData: currentBirthData,
      createdAt: '2026-08-07T08:00:00.000Z',
    });

    renderPanel();

    expect(await screen.findByText('已儲存命盤')).toBeInTheDocument();
    expect(screen.getByText('2000-08-16')).toBeInTheDocument();
    expect(screen.getByText(/儲存日期/u, { selector: 'dt' })).toBeInTheDocument();
  });

  it('loads a saved chart through the callback', async () => {
    await saveChart({
      id: 'saved-chart',
      name: '已儲存命盤',
      birthData: currentBirthData,
      createdAt: '2026-08-07T08:00:00.000Z',
    });
    const { onLoad } = renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: '載入' }));

    expect(onLoad).toHaveBeenCalledWith(currentBirthData);
  });

  it('renames a chart in storage while preserving its id and saved date', async () => {
    await saveChart({
      id: 'saved-chart',
      name: '原始名稱',
      birthData: currentBirthData,
      createdAt: '2026-08-07T08:00:00.000Z',
    });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: '重新命名' }));
    const renameInput = screen.getAllByLabelText('命盤名稱')[1];
    fireEvent.change(renameInput, { target: { value: '更新名稱' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存名稱' }));

    await waitFor(async () => {
      expect(await listCharts()).toEqual([
        expect.objectContaining({
          id: 'saved-chart',
          name: '更新名稱',
          createdAt: '2026-08-07T08:00:00.000Z',
        }),
      ]);
    });
  });

  it('deletes only after the translated confirmation is accepted', async () => {
    await saveChart({
      id: 'saved-chart',
      name: '待刪除命盤',
      birthData: currentBirthData,
      createdAt: '2026-08-07T08:00:00.000Z',
    });
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirm);
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: '刪除' }));
    expect(confirm).toHaveBeenCalledWith('確定要刪除「待刪除命盤」嗎？此操作無法復原。');
    expect(await listCharts()).toHaveLength(1);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: '刪除' }));

    await waitFor(async () => expect(await listCharts()).toEqual([]));
    vi.unstubAllGlobals();
  });
});
