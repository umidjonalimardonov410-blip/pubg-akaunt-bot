export type DailyPoint = {
  date: string;
  orders: number;
  revenue: number;
  newUsers: number;
  listings: number;
};

type OrderLike = { createdAt: Date | string; price: unknown; status: string };
type DatedLike = { createdAt: Date | string };

export function toDayKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

/**
 * Builds a dense day-by-day analytics series (no gaps) for the admin charts.
 */
export function buildDailySeries(
  input: { orders: OrderLike[]; users: DatedLike[]; listings: DatedLike[] },
  days = 14,
  now = new Date(),
): DailyPoint[] {
  const buckets = new Map<string, DailyPoint>();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const key = toDayKey(day);
    buckets.set(key, { date: key, orders: 0, revenue: 0, newUsers: 0, listings: 0 });
  }

  for (const order of input.orders) {
    const bucket = buckets.get(toDayKey(order.createdAt));
    if (!bucket) continue;
    bucket.orders += 1;
    if (order.status === "completed") bucket.revenue += Number(order.price ?? 0);
  }
  for (const user of input.users) {
    const bucket = buckets.get(toDayKey(user.createdAt));
    if (bucket) bucket.newUsers += 1;
  }
  for (const listing of input.listings) {
    const bucket = buckets.get(toDayKey(listing.createdAt));
    if (bucket) bucket.listings += 1;
  }

  return Array.from(buckets.values());
}

export function buildStatusBreakdown(rows: { status: string }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export function buildTopSellers(
  orders: { sellerId: number; price: unknown; status: string }[],
  sellers: { id: number; name?: string | null }[],
  limit = 5,
) {
  const nameById = new Map(sellers.map(seller => [seller.id, seller.name || `Sotuvchi #${seller.id}`]));
  const totals = new Map<number, { sales: number; revenue: number }>();
  for (const order of orders) {
    if (order.status !== "completed") continue;
    const current = totals.get(order.sellerId) ?? { sales: 0, revenue: 0 };
    current.sales += 1;
    current.revenue += Number(order.price ?? 0);
    totals.set(order.sellerId, current);
  }
  return Array.from(totals.entries())
    .map(([sellerId, value]) => ({ sellerId, name: nameById.get(sellerId) ?? `Sotuvchi #${sellerId}`, ...value }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
