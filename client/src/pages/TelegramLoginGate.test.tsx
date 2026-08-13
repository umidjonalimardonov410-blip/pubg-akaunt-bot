import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const telegramMocks = vi.hoisted(() => ({
  initTelegramWebApp: vi.fn(),
  getTelegramMiniAppLaunchUrl: vi.fn(() => "https://t.me/inferno_bot?startapp=market"),
  authenticateTelegramWebApp: vi.fn(),
}));

vi.mock("@/lib/telegram", () => telegramMocks);

import { TelegramLoginGate } from "./Home";

describe("TelegramLoginGate", () => {
  beforeEach(() => {
    telegramMocks.initTelegramWebApp.mockReset();
    telegramMocks.getTelegramMiniAppLaunchUrl.mockClear();
    telegramMocks.authenticateTelegramWebApp.mockReset();
  });

  afterEach(() => cleanup());

  it("shows the Telegram-only login prompt with safe guidance", () => {
    render(<TelegramLoginGate title="Profilga Telegram orqali kiring" description="Profilingiz Telegram sessiyasiga ulanadi." />);

    expect(screen.getByText("Profilga Telegram orqali kiring")).toBeTruthy();
    expect(screen.getByText("Profilingiz Telegram sessiyasiga ulanadi.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /telegram orqali kirish/i })).toBeTruthy();
    expect(screen.getByText(/Login va parolni bu yerga yubormang/i)).toBeTruthy();
  });

  it("opens the Mini App launch URL when opened outside Telegram", () => {
    telegramMocks.initTelegramWebApp.mockReturnValue(null);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<TelegramLoginGate title="Profilga Telegram orqali kiring" description="Profilingiz Telegram sessiyasiga ulanadi." />);
    fireEvent.click(screen.getByRole("button", { name: /telegram orqali kirish/i }));

    expect(telegramMocks.getTelegramMiniAppLaunchUrl).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith("https://t.me/inferno_bot?startapp=market", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });
});
