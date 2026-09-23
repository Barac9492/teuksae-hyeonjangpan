import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanionApp } from '../features/companion';
import { getMoment, previewDate } from '../features/companion/moment';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const kst = (iso: string) => new Date(`${iso}+09:00`);
const worshipPanel = () => screen.getByRole('tabpanel', { name: '예배' });

describe('getMoment (KST phase engine)', () => {
  it('counts calendar days before the first service', () => {
    const moment = getMoment(kst('2026-09-24T12:00:00'));
    expect(moment.phase).toBe('pre');
    expect(moment.daysUntilStart).toBe(11);
  });

  it('treats the evening before each service day as the eve of that day', () => {
    expect(getMoment(kst('2026-10-04T17:59:00')).phase).toBe('pre');
    const eve = getMoment(kst('2026-10-04T22:30:00'));
    expect(eve).toMatchObject({ phase: 'eve', dayIndex: 0, minutesToService: 370 });
    expect(getMoment(kst('2026-10-09T20:00:00'))).toMatchObject({ phase: 'eve', dayIndex: 5 });
  });

  it('moves through dawn, service, and after on a service day', () => {
    expect(getMoment(kst('2026-10-05T00:00:00'))).toMatchObject({ phase: 'dawn', dayIndex: 0, minutesToService: 280, night: true });
    expect(getMoment(kst('2026-10-05T03:52:00'))).toMatchObject({ phase: 'dawn', minutesToService: 48 });
    expect(getMoment(kst('2026-10-05T04:40:00')).phase).toBe('service');
    expect(getMoment(kst('2026-10-05T06:00:00')).phase).toBe('after');
    expect(getMoment(kst('2026-10-06T12:00:00'))).toMatchObject({ phase: 'after', dayIndex: 1 });
  });

  it('ends after the last service without inventing a seventh eve', () => {
    expect(getMoment(kst('2026-10-10T07:00:00'))).toMatchObject({ phase: 'after', dayIndex: 5 });
    expect(getMoment(kst('2026-10-10T20:00:00')).phase).toBe('post');
    expect(getMoment(kst('2026-10-11T08:00:00')).phase).toBe('post');
  });

  it('is independent of the device timezone because it works from the absolute instant', () => {
    expect(getMoment(new Date('2026-10-05T18:52:00Z'))).toMatchObject({ phase: 'dawn', dayIndex: 1, clock: '03:52' });
  });

  it('builds preview instants for a chosen day, including the eve of day one', () => {
    expect(getMoment(previewDate('eve', 0, new Date()))).toMatchObject({ phase: 'eve', dayIndex: 0 });
    expect(getMoment(previewDate('service', 3, new Date()))).toMatchObject({ phase: 'service', dayIndex: 3 });
  });
});

describe('CompanionApp moment-aware home', () => {
  it('before the event shows a countdown and preparation, not a fake live venue status', async () => {
    const user = userEvent.setup();
    render(<CompanionApp now={kst('2026-09-24T12:00:00')} />);
    expect(screen.getByText('D-11')).toBeVisible();
    expect(screen.getByRole('heading', { name: '첫 새벽 전에 미리 해두면 좋아요' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '체육관에 먼저 들어갈 수 있어요' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /행사 날 새벽 화면 미리 보기/ }));
    expect(screen.getByRole('heading', { name: '체육관에 먼저 들어갈 수 있어요' })).toBeVisible();
    expect(within(worshipPanel()).getByText(/현장 확인/)).toBeVisible();
  });

  it('marks parking as an out-of-season example before the event', async () => {
    const user = userEvent.setup();
    render(<CompanionApp now={kst('2026-09-24T12:00:00')} />);
    await user.click(screen.getByRole('tab', { name: '주차' }));
    expect(screen.getByText(/지금은 행사 기간이 아니에요/)).toBeVisible();
  });

  it('at dawn shows time to service, freshness, and who confirmed it; stale hides the old state', async () => {
    const user = userEvent.setup();
    render(<CompanionApp now={kst('2026-10-06T03:52:00')} />);
    expect(screen.getByText('예배까지 48분')).toBeVisible();
    expect(within(worshipPanel()).getByText('03:46 현장 확인')).toBeVisible();
    expect(within(worshipPanel()).getByText(/송림 안내팀/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '서현 · 드림센터' }));
    expect(within(worshipPanel()).getByText(/드림센터 안내팀/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '상황 바꿔보기' }));
    const dialog = screen.getByRole('dialog', { name: '상황 바꿔보기' });
    await user.click(within(dialog).getByRole('checkbox', { name: '현황 정보가 오래된 상황' }));
    await user.click(within(dialog).getByRole('button', { name: '선택한 상황 보기' }));
    expect(screen.queryByText('03:46 현장 확인')).not.toBeInTheDocument();
    expect(within(worshipPanel()).getByText(/이전 상태를 숨겼어요/)).toBeVisible();
  });

  it('switches to the dim night palette automatically at dawn and can be turned off', async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionApp now={kst('2026-10-06T03:52:00')} />);
    const root = container.querySelector('.tc-companion');
    expect(root).toHaveAttribute('data-night', 'true');
    await user.click(screen.getByRole('button', { name: '새벽 모드' }));
    expect(root).not.toHaveAttribute('data-night');
  });

  it('keeps daytime light and offers a larger-text mode', async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionApp now={kst('2026-09-24T12:00:00')} />);
    const root = container.querySelector('.tc-companion');
    expect(root).not.toHaveAttribute('data-night');
    await user.click(screen.getByRole('button', { name: '글자 크게' }));
    expect(root).toHaveAttribute('data-text', 'large');
  });

  it('the night before calculates sleep for the chosen wake time and keeps the checklist local', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<CompanionApp now={kst('2026-10-04T22:30:00')} />);
    expect(screen.getByText(/여섯 날 중 첫째 날/)).toBeVisible();
    expect(screen.getByText('예배까지 6시간 10분')).toBeVisible();
    expect(screen.getByText('5시간')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '04:00' }));
    expect(screen.getByText('5시간 30분')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: '알람 맞추기' }));
    expect(screen.getByRole('checkbox', { name: '알람 맞추기' })).toBeChecked();
    expect(localStorage.length).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('during worship shows a quiet screen with venue status tucked away', () => {
    render(<CompanionApp now={kst('2026-10-06T05:05:00')} />);
    expect(screen.getByRole('heading', { name: '지금은 예배 중이에요' })).toBeVisible();
    expect(screen.getByText('현장 상황 보기')).toBeVisible();
    expect(screen.getByRole('heading', { name: '체육관에 먼저 들어갈 수 있어요', hidden: true })).not.toBeVisible();
  });

  it('after worship points to breakfast and names the next dawn; the last day says goodbye', async () => {
    const user = userEvent.setup();
    const view = render(<CompanionApp now={kst('2026-10-06T06:25:00')} />);
    expect(screen.getByText(/다음 새벽은 10월 7일\(수\) 04:40/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /같이 아침 먹고 갈까요/ }));
    expect(screen.getByRole('heading', { name: '같이 아침 먹고 갈까요?' })).toBeVisible();
    view.unmount();
    render(<CompanionApp now={kst('2026-10-10T06:25:00')} />);
    expect(screen.getByRole('heading', { name: '여섯 날의 새벽을 함께 지나왔어요' })).toBeVisible();
  });

  it('lets a prayer be handed to the user’s own group chat without any server call', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<CompanionApp now={kst('2026-10-06T03:52:00')} />);
    await user.click(screen.getByRole('tab', { name: '기도' }));
    await user.type(screen.getByLabelText('어떤 마음으로 기도하고 있나요?'), '아버지의 수술');
    await user.click(screen.getByRole('button', { name: /입력 내용 미리보기/ }));
    await user.click(screen.getByRole('button', { name: /다락방에 기도 부탁하기/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('아버지의 수술'));
    expect(screen.getByRole('status')).toHaveTextContent('복사했어요');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
});
