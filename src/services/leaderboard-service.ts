import { db } from "../db";
import { sql } from "drizzle-orm";

export type OrderType = "logic" | "fisik";

export interface LeaderboardEntry {
  rank:            number;
  nama:            string;
  userTelegram:    string | null;
  sto:             string | null;
  tiketDikerjakan: number;
  tiketDone:       number;
  tiketGagal:      number;
  avgPickupMenit:  number | null;
  avgDoneMenit:    number | null;
  trend:           "up" | "down" | "stable";
}

export async function getLeaderboard(
  orderType: OrderType = "logic",
  dateFrom?: string,   // yyyy-mm-dd
  dateTo?:   string,   // yyyy-mm-dd
): Promise<LeaderboardEntry[]> {

  const dateFilter =
    dateFrom && dateTo ? sql`AND p.pickup_time >= ${dateFrom} AND p.pickup_time < DATE_ADD(${dateTo}, INTERVAL 1 DAY)` :
    dateFrom           ? sql`AND p.pickup_time >= ${dateFrom}` :
    dateTo             ? sql`AND p.pickup_time < DATE_ADD(${dateTo}, INTERVAL 1 DAY)` :
    sql``;

  const result = await db.execute(sql`
    SELECT
      u.id,
      u.name                                                                             AS nama,
      u.id_telegram                                                                      AS user_telegram,
      u.sto,
      COUNT(CASE WHEN p.status_pengerjaan IN ('pickup','done') THEN 1 END)               AS tiket_dikerjakan,
      COUNT(CASE WHEN p.status_pengerjaan = 'done'             THEN 1 END)               AS tiket_done,
      COUNT(CASE WHEN p.status_pengerjaan = 'pickup'           THEN 1 END)               AS tiket_gagal,
      AVG(CASE WHEN p.pickup_time IS NOT NULL AND p.down_time IS NOT NULL
        THEN TIMESTAMPDIFF(MINUTE, p.down_time, p.pickup_time) END)                      AS avg_pickup_menit,
      AVG(CASE WHEN p.done_time IS NOT NULL AND p.pickup_time IS NOT NULL
        THEN TIMESTAMPDIFF(MINUTE, p.pickup_time, p.done_time) END)                      AS avg_done_menit,
      COUNT(CASE WHEN p.status_pengerjaan = 'done'
        AND p.done_time >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 1 END)                  AS recent_done,
      COUNT(CASE WHEN p.status_pengerjaan = 'done'
        AND p.done_time >= DATE_SUB(NOW(), INTERVAL 28 DAY)
        AND p.done_time  < DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 1 END)                 AS prev_done
    FROM users u
    LEFT JOIN pengukuran_order_psb p ON p.pic = u.id_telegram AND p.order_type = ${orderType} ${dateFilter}
    WHERE u.role = 'Agent'
    GROUP BY u.id, u.name, u.id_telegram, u.sto
    ORDER BY tiket_done DESC, tiket_dikerjakan DESC
  `);

  const rows = ((result as any)[0] ?? []) as any[];

  return rows.map((row: any, i: number) => {
    const recentDone = Number(row.recent_done ?? 0);
    const prevDone   = Number(row.prev_done   ?? 0);
    const trend: "up" | "down" | "stable" =
      recentDone > prevDone ? "up"   :
      recentDone < prevDone ? "down" : "stable";

    return {
      rank:            i + 1,
      nama:            row.nama          ?? "—",
      userTelegram:    row.user_telegram  ?? null,
      sto:             row.sto            ?? null,
      tiketDikerjakan: Number(row.tiket_dikerjakan ?? 0),
      tiketDone:       Number(row.tiket_done       ?? 0),
      tiketGagal:      Number(row.tiket_gagal      ?? 0),
      avgPickupMenit:  row.avg_pickup_menit != null ? Math.round(Number(row.avg_pickup_menit)) : null,
      avgDoneMenit:    row.avg_done_menit   != null ? Math.round(Number(row.avg_done_menit))   : null,
      trend,
    };
  });
}
