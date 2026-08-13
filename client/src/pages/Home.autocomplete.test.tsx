import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useSuggestionsQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounts: {
      suggestions: {
        useQuery: (...args: unknown[]) => useSuggestionsQuery(...args),
      },
    },
  },
}));

import { SearchPanel } from "./Home";

describe("SearchPanel autocomplete", () => {
  beforeEach(() => {
    useSuggestionsQuery.mockReturnValue({
      data: [
        { type: "Skin", label: "M416 Glacier", value: "M416 Glacier" },
        { type: "Akkaunt ID", label: "PUBG-123", value: "PUBG-123", accountId: 7 },
        { type: "O\'yinchi", label: "Inferno Warrior", value: "Inferno Warrior", accountId: 7 },
      ],
      isFetching: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows suggestions after the user enters at least two characters", () => {
    render(<SearchPanel onFilters={vi.fn()} />);
    const input = screen.getByPlaceholderText("Akkaunt ID, skin yoki o'yinchi nomini qidiring...");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "M4" } });

    expect(screen.getByText("M416 Glacier")).toBeTruthy();
    expect(screen.getByText("Skin")).toBeTruthy();
  });

  it("applies an account ID suggestion to the search filters", () => {
    const onFilters = vi.fn();
    render(<SearchPanel onFilters={onFilters} />);
    const input = screen.getByPlaceholderText("Akkaunt ID, skin yoki o'yinchi nomini qidiring...");

    fireEvent.change(input, { target: { value: "PUB" } });
    fireEvent.click(screen.getByText("PUBG-123"));

    expect(onFilters).toHaveBeenLastCalledWith(expect.objectContaining({ search: "PUBG-123" }));
  });

  it("applies a player suggestion to the search filters", () => {
    const onFilters = vi.fn();
    render(<SearchPanel onFilters={onFilters} />);
    const input = screen.getByPlaceholderText("Akkaunt ID, skin yoki o'yinchi nomini qidiring...");

    fireEvent.change(input, { target: { value: "Inf" } });
    fireEvent.click(screen.getByText("Inferno Warrior"));

    expect(onFilters).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Inferno Warrior" }));
  });

  it("applies a skin suggestion to the selected skin filters", () => {
    const onFilters = vi.fn();
    render(<SearchPanel onFilters={onFilters} />);
    const input = screen.getByPlaceholderText("Akkaunt ID, skin yoki o'yinchi nomini qidiring...");

    fireEvent.change(input, { target: { value: "M416" } });
    fireEvent.click(screen.getByText("M416 Glacier"));

    expect(onFilters).toHaveBeenLastCalledWith(expect.objectContaining({ skins: ["M416 Glacier"] }));
  });

  it("renders loading and empty states from the suggestion query", () => {
    useSuggestionsQuery.mockReturnValue({ data: [], isFetching: true });
    const { rerender } = render(<SearchPanel onFilters={vi.fn()} />);
    const input = screen.getByPlaceholderText("Akkaunt ID, skin yoki o'yinchi nomini qidiring...");
    fireEvent.change(input, { target: { value: "M4" } });
    expect(screen.getByText("Tavsiya qidirilmoqda...")).toBeTruthy();

    useSuggestionsQuery.mockReturnValue({ data: [], isFetching: false });
    rerender(<SearchPanel onFilters={vi.fn()} />);
    expect(screen.getByText("Mos tavsiya topilmadi. Filtrlarni sinab ko‘ring.")).toBeTruthy();
  });
});

  it("updates phone filters without a refetch loop when the query changes", () => {
    const onFilters = vi.fn();
    render(<SearchPanel onFilters={onFilters} />);
    const input = screen.getByPlaceholderText("Akkaunt ID, skin yoki o'yinchi nomini qidiring...");

    fireEvent.change(input, { target: { value: "M4" } });
    const callsAfterFirstInput = useSuggestionsQuery.mock.calls.length;
    fireEvent.change(input, { target: { value: "M416" } });

    expect(onFilters).toHaveBeenCalledTimes(2);
    expect(onFilters).toHaveBeenLastCalledWith(expect.objectContaining({ search: "M416" }));
    expect(useSuggestionsQuery.mock.calls.length).toBe(callsAfterFirstInput + 1);
    expect(useSuggestionsQuery.mock.calls.length).toBeLessThan(5);
  });
