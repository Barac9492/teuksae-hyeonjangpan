import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { defaultAppConfig } from "../domain/config";
import { LocalAppRepository } from "../data/LocalAppRepository";
import {
  communityJournalStorageKey,
  createShareEntry,
  MAX_JOURNAL_ENTRIES,
  readJournal,
  writeJournal,
} from "../features/community/communityJournal";
import {
  buildCarpoolMessage,
  buildSnackMessage,
  buildThanksMessage,
  formatTimeLabel,
} from "../features/community/shareMessages";
import {
  peoplePerDot,
  planDots,
  WE_CIRCLE_DOTS,
} from "../features/community/weCircleLayout";

describe("share message builders", () => {
  it("builds a carpool offer that names time, place, and seats", () => {
    const text = buildCarpoolMessage({
      role: "offer",
      dayLabel: "목",
      time: "04:00",
      from: "정자동",
      venueName: "드림센터",
      seats: 2,
    });
    expect(text).toContain("[특새 카풀 · 같이 타요]");
    expect(text).toContain("목요일 새벽 4:00 정자동 출발 → 드림센터");
    expect(text).toContain("빈자리 2자리");
  });

  it("builds a carpool request that keeps online as an equal option", () => {
    const text = buildCarpoolMessage({
      role: "request",
      dayLabel: "금",
      time: "03:50",
      from: "   ",
      venueName: "송림 본당",
      seats: 1,
    });
    expect(text).toContain("태워주세요");
    expect(text).toContain("우리 동네");
    expect(text).toContain("온라인으로도 같은 예배");
  });

  it("marks allergens explicitly in snack messages", () => {
    const withNuts = buildSnackMessage({
      dayLabel: "토",
      item: "호두과자",
      servings: 20,
      allergens: ["견과류", "밀"],
      venueName: "체육관",
    });
    expect(withNuts).toContain("견과류, 밀 들어 있어요");
    expect(withNuts).toContain("호두과자 20개, 개별 포장");

    const plain = buildSnackMessage({
      dayLabel: "토",
      item: "",
      servings: 0,
      allergens: [],
      venueName: "",
    });
    expect(plain).toContain("간식 1개");
    expect(plain).toContain("넣지 않았어요");
  });

  it("formats time labels for early-morning departures", () => {
    expect(formatTimeLabel("04:10")).toBe("새벽 4:10");
    expect(formatTimeLabel("13:05")).toBe("오후 1:05");
    expect(formatTimeLabel("nonsense")).toBe("새벽");
  });

  it("falls back to a gentle thanks line when the note is empty", () => {
    expect(buildThanksMessage("  ")).toContain("함께여서 고마웠어요");
    expect(buildThanksMessage("태워주신 분")).toContain("태워주신 분");
  });
});

describe("community journal (device only)", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips entries and drops malformed rows", () => {
    const entry = createShareEntry("snack", "  백설기 12개  ", 3);
    writeJournal(window.localStorage, [entry]);
    expect(readJournal(window.localStorage)).toEqual([
      { ...entry, note: "백설기 12개" },
    ]);

    window.localStorage.setItem(
      communityJournalStorageKey,
      JSON.stringify({
        version: 1,
        entries: [entry, { id: "x", kind: "leaderboard" }],
      }),
    );
    expect(readJournal(window.localStorage)).toHaveLength(1);
  });

  it("caps the stored journal", () => {
    const entries = Array.from({ length: MAX_JOURNAL_ENTRIES + 10 }, (_, i) =>
      createShareEntry("thanks", `note ${i}`, 0),
    );
    writeJournal(window.localStorage, entries);
    expect(readJournal(window.localStorage)).toHaveLength(MAX_JOURNAL_ENTRIES);
  });

  it("never stores names, seats, or scores in the journal payload", () => {
    writeJournal(window.localStorage, [
      createShareEntry("carpool", "빈자리 2자리를 다락방에 열었어요", 3),
    ]);
    const raw = window.localStorage.getItem(communityJournalStorageKey) ?? "";
    expect(raw).not.toMatch(/phone|email|score|rank|streak/);
  });
});

describe("we circle", () => {
  it("spreads online dots evenly and gives every dot equal size", () => {
    const dots = planDots({
      todayTotal: 2000,
      onsiteTotal: 1500,
      onlineTotal: 500,
      unselectedTotal: 0,
      tomorrowTotal: 0,
    });
    expect(dots).toHaveLength(WE_CIRCLE_DOTS);
    const online = dots.filter((dot) => dot.online).length;
    expect(online).toBe(Math.round(WE_CIRCLE_DOTS / 4));
    expect(peoplePerDot(2000)).toBe(Math.round(2000 / WE_CIRCLE_DOTS));
    expect(peoplePerDot(0)).toBe(1);
  });
});

describe("우리 tab", () => {
  beforeEach(() => window.localStorage.clear());

  it("lights up your dot, builds kakao text, and keeps the journal local", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const repository = new LocalAppRepository(
      defaultAppConfig,
      window.localStorage,
    );
    render(<App config={defaultAppConfig} repository={repository} />);

    await user.click(screen.getAllByRole("button", { name: "우리" })[0]);
    expect(
      screen.getByRole("heading", { name: "분당우리교회" }),
    ).toBeInTheDocument();

    const yourDot = screen.getByTestId("we-your-dot");
    expect(yourDot).toHaveClass("empty");
    await user.click(
      screen.getByRole("button", { name: "오늘 왔어요, 내 점 켜기" }),
    );
    expect(repository.getSnapshot().attendance.today).toBe(true);
    expect(screen.getByTestId("we-your-dot")).not.toHaveClass("empty");
    expect(screen.getByText("여기, 당신")).toBeInTheDocument();

    const communityCard = screen.getByRole("button", { name: /함께 있음/ });
    expect(communityCard).toHaveAttribute("aria-expanded", "false");
    await user.click(communityCard);
    expect(communityCard).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/munus/)).toBeInTheDocument();

    const carpoolForm = screen.getByRole("form", { name: "카풀 문장 만들기" });
    await user.type(within(carpoolForm).getByLabelText("출발 동네"), "정자동");
    const carpoolSection = carpoolForm.closest("section");
    expect(carpoolSection).not.toBeNull();
    if (!carpoolSection) return;
    expect(within(carpoolSection).getByText(/정자동 출발/)).toBeInTheDocument();
    await user.click(
      within(carpoolSection).getByRole("button", { name: "문장 복사" }),
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("[특새 카풀 · 같이 타요]"),
    );

    await user.click(
      within(carpoolSection).getByRole("button", { name: "나눔 기록에 남기기" }),
    );
    const journal = screen.getByRole("list", { name: "나눔 기록" });
    expect(within(journal).getByText("카풀")).toBeInTheDocument();
    expect(readJournal(window.localStorage)).toHaveLength(1);

    const stored = window.localStorage.getItem("teuksae-app-v1-snapshot") ?? "";
    expect(stored).not.toContain("carpool");

    await user.click(
      within(journal).getByRole("button", { name: "카풀 기록 지우기" }),
    );
    expect(readJournal(window.localStorage)).toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: "주간" })[0]);
    expect(screen.getByText(/우리 나눔 기록 0건/)).toBeInTheDocument();
  });
});
