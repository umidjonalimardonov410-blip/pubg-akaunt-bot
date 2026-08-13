import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authenticated: false,
  listQuery: { data: undefined as any, isLoading: false },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: state.authenticated, user: null }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    favorites: {
      list: { useQuery: () => state.listQuery },
      ids: { useQuery: () => ({ data: [], isLoading: false }) },
      toggle: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({
      favorites: {
        ids: { invalidate: vi.fn(), setData: vi.fn() },
        list: { invalidate: vi.fn() },
      },
    }),
  },
}));

import { SavedPage } from "./EnhancedPages";

describe("SavedPage states", () => {
  beforeEach(() => {
    state.authenticated = false;
    state.listQuery = { data: undefined, isLoading: false };
  });

  afterEach(() => cleanup());

  it("asks unauthenticated users to open their profile", () => {
    render(<SavedPage onNavigate={vi.fn()} />);
    expect(screen.getByText("Saqlangan akkauntlar")).toBeTruthy();
    expect(screen.getByText("Qiziqqan akkauntlaringizni saqlash uchun profilga kiring.")).toBeTruthy();
  });

  it("shows a loading state for an authenticated user", () => {
    state.authenticated = true;
    state.listQuery = { data: undefined, isLoading: true };

    render(<SavedPage onNavigate={vi.fn()} />);
    expect(screen.getByText("Saqlanganlar yuklanmoqda...")).toBeTruthy();
  });

  it("shows a clear empty state when there are no saved accounts", () => {
    state.authenticated = true;
    state.listQuery = { data: [], isLoading: false };

    render(<SavedPage onNavigate={vi.fn()} />);
    expect(screen.getByText("Ro‘yxat hozircha bo‘sh")).toBeTruthy();
    expect(screen.getByText("Bozorda yurakcha tugmasini bosib akkaunt saqlang.")).toBeTruthy();
  });

  it("renders a saved account in the populated watchlist", () => {
    state.authenticated = true;
    state.listQuery = {
      data: [{ id: 77, playerName: "Inferno Warrior", level: 78, price: 1499000, region: "KRJP", thumbnailUrl: "/manus-storage/test.jpg", description: "Saved account" }],
      isLoading: false,
    };

    render(<SavedPage onNavigate={vi.fn()} />);
    expect(screen.getByText("Inferno Warrior")).toBeTruthy();
    expect(screen.getByText(/1\s*499\s*000\s*so‘m/)).toBeTruthy();
  });
});
