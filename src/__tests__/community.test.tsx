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
  DAWN_PHASES,
  describeDawn,
  formatMinute,
  inkForSky,
  phaseAt,
} from "../features/community/dawnSky";
import {
  buildCarpoolMessage,
  buildSnackMessage,
  buildThanksMessage,
  formatTimeLabel,
} from "../features/community/shareMessages";
import { planDriverNight } from "../features/community/sleepGuard";
import {
  peoplePerDot,
  planPeople,
  sampleStrokes,
  WE_GLYPH_COUNT,
  WE_GLYPH_POINTS,
  YOUR_POINT_INDEX,
} from "../features/community/weGlyph";
import { composePoem } from "../features/community/wePoem";

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

  it("formats time labels and thanks fallbacks", () => {
    expect(formatTimeLabel("04:10")).toBe("새벽 4:10");
    expect(formatTimeLabel("13:05")).toBe("오후 1:05");
    expect(formatTimeLabel("nonsense")).toBe("새벽");
    expect(buildThanksMessage("  ")).toContain("함께여서 고마웠어요");
  });
});

describe("community journal (device only)", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips entries, drops malformed rows, and caps the list", () => {
    const entry = createShareEntry("snack", "  백설기 12개  ", 3);
    writeJournal(window.localStorage, [entry]);
    expect(readJournal(window.localStorage)).toEqual([{ ...entry, note: "백설기 12개" }]);

    window.localStorage.setItem(
      communityJournalStorageKey,
      JSON.stringify({ version: 1, entries: [entry, { id: "x", kind: "leaderboard" }] }),
    );
    expect(readJournal(window.localStorage)).toHaveLength(1);

    writeJournal(
      window.localStorage,
      Array.from({ length: MAX_JOURNAL_ENTRIES + 10 }, (_, i) =>
        createShareEntry("thanks", `note ${i}`, 0),
      ),
    );
    expect(readJournal(window.localStorage)).toHaveLength(MAX_JOURNAL_ENTRIES);
  });
});

describe("people glyph", () => {
  it("samples strokes at even spacing and keeps every dot the same weight", () => {
    const line = sampleStrokes([[[0, 0], [90, 0]]], 9);
    expect(line).toHaveLength(11);
    expect(line[10]).toEqual({ x: 90, y: 0 });

    expect(WE_GLYPH_COUNT).toBe(WE_GLYPH_POINTS.length);
    expect(WE_GLYPH_COUNT).toBeGreaterThan(80);
    expect(YOUR_POINT_INDEX).toBeLessThan(WE_GLYPH_COUNT);

    const people = planPeople(2000, 500);
    const online = people.filter((dot) => dot.online).length;
    expect(online).toBe(Math.round(WE_GLYPH_COUNT / 4));
    expect(new Set(people.map((dot) => dot.order)).size).toBe(WE_GLYPH_COUNT);
    expect(peoplePerDot(0)).toBe(1);
  });
});

describe("dawn sky and poem", () => {
  it("moves through the phases of a teuksae day in order", () => {
    expect(phaseAt(0).id).toBe("night");
    expect(phaseAt(4 * 60 + 40).id).toBe("together");
    expect(phaseAt(6 * 60 + 10).id).toBe("bread");
    expect(phaseAt(23 * 60).id).toBe("rest");
    expect(DAWN_PHASES.map((p) => p.startMinute)).toEqual(
      [...DAWN_PHASES.map((p) => p.startMinute)].sort((a, b) => a - b),
    );
    expect(formatMinute(280)).toBe("04:40");
  });

  it("is dark at night and bright at noon", () => {
    const night = describeDawn(60);
    const noon = describeDawn(720);
    expect(night.glow).toBeLessThan(0.1);
    expect(noon.glow).toBe(1);
    expect(inkForSky(night)).toBe("light");
    expect(inkForSky(noon)).toBe("dark");
    expect(night.top).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("reads counts as scenes, never as ranks", () => {
    const counts = {
      todayTotal: 2659,
      onsiteTotal: 2041,
      onlineTotal: 618,
      unselectedTotal: 0,
      tomorrowTotal: 1384,
    };
    const poem = composePoem(counts, 0);
    expect(poem[0]).toContain("2,659개의 알람");
    expect(poem.at(-1)).toContain("1,384명이 내일도");
    expect(poem.join("\n")).not.toMatch(/순위|1등|연속/);
    expect(composePoem(counts, 5)).not.toEqual(poem);
  });
});

describe("driver sleep guard", () => {
  it("computes wake and departure across midnight and flags short sleep", () => {
    const ok = planDriverNight({ arriveAt: "04:20", driveMinutes: 25, prepMinutes: 30, bedtime: "22:00" });
    expect(ok?.departAt).toBe("03:55");
    expect(ok?.wakeAt).toBe("03:25");
    expect(ok?.sleepMinutes).toBe(325);
    expect(ok?.verdict).toBe("short");

    const danger = planDriverNight({ arriveAt: "04:20", driveMinutes: 60, prepMinutes: 30, bedtime: "00:30" });
    expect(danger?.verdict).toBe("danger");
    expect(danger?.message).toContain("온라인");

    const good = planDriverNight({ arriveAt: "04:20", driveMinutes: 10, prepMinutes: 20, bedtime: "21:30" });
    expect(good?.verdict).toBe("ok");
    expect(planDriverNight({ arriveAt: "x", driveMinutes: 1, prepMinutes: 1, bedtime: "22:00" })).toBeNull();
  });
});

describe("우리 tab", () => {
  beforeEach(() => window.localStorage.clear());

  it("merges 나 into 우리, lights your dot, and keeps sharing local", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const repository = new LocalAppRepository(defaultAppConfig, window.localStorage);
    render(<App config={defaultAppConfig} repository={repository} />);

    await user.click(screen.getAllByRole("button", { name: "우리" })[0]);

    await user.click(screen.getByRole("button", { name: /^나\./ }));
    expect(screen.getByText("우리", { selector: ".merge-we-word" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "분당우리교회" })).toBeInTheDocument();

    expect(screen.getByTestId("glyph-your-dot")).toHaveClass("empty");
    await user.click(screen.getByRole("button", { name: "오늘 왔어요, 내 점 켜기" }));
    expect(repository.getSnapshot().attendance.today).toBe(true);
    expect(screen.getByTestId("glyph-your-dot")).not.toHaveClass("empty");
    expect(screen.getByText("여기, 당신")).toBeInTheDocument();

    expect(screen.getByLabelText("오늘의 시")).toHaveTextContent("2,041명이 앉을 자리를 찾았고");

    const bread = screen.getByRole("button", { name: /떡 떼기/ });
    await user.click(bread);
    await user.click(bread);
    expect(screen.getByText("4조각")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "나란히 모드 열기" }));
    await user.click(screen.getByRole("button", { name: /^우 3번째/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("3 / 6");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const carpoolForm = screen.getByRole("form", { name: "카풀 문장 만들기" });
    await user.type(within(carpoolForm).getByLabelText("출발 동네"), "정자동");
    const carpoolSection = carpoolForm.closest("section");
    expect(carpoolSection).not.toBeNull();
    if (!carpoolSection) return;
    expect(within(carpoolSection).getByText(/정자동 출발/)).toBeInTheDocument();
    await user.click(within(carpoolSection).getByRole("button", { name: "문장 복사" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("[특새 카풀 · 같이 타요]"));

    await user.click(within(carpoolSection).getByRole("button", { name: "나눔 기록에 남기기" }));
    const journal = screen.getByRole("list", { name: "나눔 기록" });
    expect(within(journal).getByText("카풀")).toBeInTheDocument();
    expect(readJournal(window.localStorage)).toHaveLength(1);
    expect(window.localStorage.getItem("teuksae-app-v1-snapshot") ?? "").not.toContain("carpool");

    await user.click(within(journal).getByRole("button", { name: "카풀 기록 지우기" }));
    expect(readJournal(window.localStorage)).toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: "주간" })[0]);
    expect(screen.getByText(/우리 나눔 기록 0건/)).toBeInTheDocument();
  });
});
