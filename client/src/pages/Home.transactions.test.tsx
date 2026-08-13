import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state: any = {
  transactions: { data: [], isLoading: false, refetch: vi.fn() },
  receipts: { data: [], isLoading: false, refetch: vi.fn() },
  notifications: { data: [], isLoading: false, refetch: vi.fn() },
  markAsRead: vi.fn(),
};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 7, role: "user", name: "Test User" } }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    wallet: {
      getTransactions: { useQuery: () => state.transactions },
      getDepositReceipts: { useQuery: () => state.receipts },
    },
    notifications: {
      getAll: { useQuery: () => state.notifications },
      markAsRead: { useMutation: () => ({ mutate: state.markAsRead, isPending: false }) },
    },
  },
}));

import {
  TransactionsPage,
  transactionHistoryLabel,
  transactionHistoryStatusLabel,
  transactionHistoryStatusTone,
} from "./Home";

describe("transaction history presentation", () => {
  beforeEach(() => {
    state.transactions = { data: [], isLoading: false, refetch: vi.fn() };
    state.receipts = { data: [], isLoading: false, refetch: vi.fn() };
    state.notifications = { data: [], isLoading: false, refetch: vi.fn() };
    state.markAsRead = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses user-facing Uzbek labels for all wallet transaction categories", () => {
    expect(transactionHistoryLabel("topup")).toBe("Balans to‘ldirish");
    expect(transactionHistoryLabel("withdrawal")).toBe("Yechib olish");
    expect(transactionHistoryLabel("seller_payout")).toBe("Sotuvchi payout");
    expect(transactionHistoryLabel("order_refund")).toBe("Buyurtma qaytarimi");
    expect(transactionHistoryLabel("referral_reward")).toBe("Referral bonusi");
    expect(transactionHistoryLabel("order_payment")).toBe("Buyurtma to‘lovi");
  });

  it("maps pending, completed, and failed statuses clearly", () => {
    expect(transactionHistoryStatusLabel("pending")).toBe("Kutilmoqda");
    expect(transactionHistoryStatusLabel("completed")).toBe("Yakunlandi");
    expect(transactionHistoryStatusLabel("failed")).toBe("Rad etildi");
    expect(transactionHistoryStatusTone("pending")).toBe("gold");
    expect(transactionHistoryStatusTone("completed")).toBe("green");
    expect(transactionHistoryStatusTone("failed")).toBe("muted");
  });

  it("renders pending receipt status and lets the user mark an unread notification as read", () => {
    state.receipts = {
      data: [{ id: 41, transactionId: null, amount: "20000", status: "pending", createdAt: new Date("2026-08-14T10:00:00Z"), reviewNote: null }],
      isLoading: false,
      refetch: vi.fn(),
    };
    state.notifications = {
      data: [{ id: 9, title: "Chek qabul qilindi", message: "Admin tekshiruvi kutilmoqda.", isRead: false, createdAt: new Date("2026-08-14T10:01:00Z") }],
      isLoading: false,
      refetch: vi.fn(),
    };

    render(<TransactionsPage onNavigate={vi.fn()} />);

    expect(screen.getByText("Admin tekshiruvi kutilmoqda")).toBeTruthy();
    expect(screen.getByText("Kutilmoqda")).toBeTruthy();
    expect(screen.getByText("1 ta yangi")).toBeTruthy();
    fireEvent.click(screen.getByText("Chek qabul qilindi"));
    expect(state.markAsRead).toHaveBeenCalledWith(9);
  });

  it("shows a loading skeleton while transaction, receipt, or notification data is loading", () => {
    state.transactions = { data: [], isLoading: true, refetch: vi.fn() };
    state.receipts = { data: [], isLoading: true, refetch: vi.fn() };
    state.notifications = { data: [], isLoading: true, refetch: vi.fn() };

    render(<TransactionsPage onNavigate={vi.fn()} />);

    expect(screen.getByText("Ma’lumotlar yuklanmoqda...")).toBeTruthy();
    expect(screen.getAllByRole("generic").length).toBeGreaterThan(0);
  });
});
