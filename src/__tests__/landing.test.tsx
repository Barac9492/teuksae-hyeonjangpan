import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { LandingPage } from '../features/landing/LandingPage';

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: true })) });
});

afterEach(cleanup);

describe('우리 landing page', () => {
  it('renders the approved first screen with honest draft information', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1, name: '우리' })).toBeVisible();
    expect(screen.getByText('하나님 앞에, 함께.')).toBeVisible();
    expect(screen.getByText('행사 일정 · 추후 안내')).toBeVisible();
    expect(screen.getByText('디자인 시안 · 공식 행사 안내가 아닙니다.')).toBeVisible();
  });

  it('changes the worship scene while keeping the shared verse', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    const story = screen.getByRole('region', { name: /서로 다른 자리/ });
    const originalImage = within(story).getByRole('img').getAttribute('src');
    const originalVerse = story.querySelector('blockquote')?.textContent;
    await user.click(screen.getByRole('button', { name: '가정에서' }));
    expect(within(story).getByRole('img').getAttribute('src')).not.toBe(originalImage);
    expect(story.querySelector('blockquote')?.textContent).toBe(originalVerse);
    expect(screen.getByRole('button', { name: '가정에서' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '예배당에서' }));
    expect(within(story).getByRole('img')).toHaveAttribute('src', originalImage);
  });

  it('opens the right venue from each call to action and resets venue guidance', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    await user.click(screen.getAllByRole('button', { name: '오늘 예배' })[0]);
    expect(screen.getByRole('button', { name: '온라인' })).toHaveAttribute('aria-pressed', 'true');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    await user.click(screen.getByRole('button', { name: '온라인 예배 준비하기' }));
    expect(screen.getByText('성경을 펴고, 잠시 조용히 마음을 준비해주세요.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '드림센터' }));
    expect(screen.getByRole('heading', { name: '드림센터에서 만나요.' })).toBeVisible();
    expect(screen.getByRole('button', { name: '오시기 전에 확인해주세요' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: '현장 안내' }));
    expect(screen.getByRole('button', { name: '송림본당' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports opening and closing the prayer with a keyboard', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    const button = screen.getByRole('button', { name: '함께 기도하기' });
    button.focus();
    await user.keyboard('[Enter]');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('우리의 기도 · 예시')).toBeVisible();
    await user.keyboard('[Space]');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('우리의 기도 · 예시')).not.toBeVisible();
  });
});
