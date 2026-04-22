import { db } from "../db";
import { userFfg } from "../db/schema/user_ffg";
import { eq, sql, like, and, SQL } from "drizzle-orm";

export interface UserFfgRow {
  id:         number;
  nama:       string;
  distrik:    string | null;
  hsa:        string | null;
  sto:        string | null;
  idTelegram: string | null;
}

export interface UserFfgResult {
  rows:       UserFfgRow[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export async function listUserFfg(opts: {
  page:    number;
  limit:   number;
  search?: string;
  distrik?:string;
  sto?:    string;
}): Promise<UserFfgResult> {
  const { page, limit, search, distrik, sto } = opts;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];
  if (search)  conditions.push(like(userFfg.nama,    `%${search}%`));
  if (distrik) conditions.push(like(userFfg.distrik, `%${distrik}%`));
  if (sto)     conditions.push(like(userFfg.sto,     `%${sto}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [countResult, rowsResult] = await Promise.all([
    db.select({ total: sql<number>`COUNT(*)` }).from(userFfg).where(where),
    db.select().from(userFfg).where(where).limit(limit).offset(offset).orderBy(userFfg.id),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return {
    rows: rowsResult.map((r) => ({
      id:         r.id,
      nama:       r.nama,
      distrik:    r.distrik ?? null,
      hsa:        r.hsa     ?? null,
      sto:        r.sto     ?? null,
      idTelegram: r.idTelegram ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function createUserFfg(data: {
  nama: string; distrik?: string; hsa?: string; sto?: string; idTelegram?: string;
}): Promise<void> {
  await db.insert(userFfg).values({
    nama:       data.nama,
    distrik:    data.distrik    ?? null,
    hsa:        data.hsa        ?? null,
    sto:        data.sto        ?? null,
    idTelegram: data.idTelegram ?? null,
  });
}

export async function updateUserFfg(id: number, data: {
  nama?: string; distrik?: string; hsa?: string; sto?: string; idTelegram?: string;
}): Promise<void> {
  await db.update(userFfg).set({
    nama:       data.nama,
    distrik:    data.distrik    ?? null,
    hsa:        data.hsa        ?? null,
    sto:        data.sto        ?? null,
    idTelegram: data.idTelegram ?? null,
  }).where(eq(userFfg.id, id));
}

export async function deleteUserFfg(id: number): Promise<void> {
  await db.delete(userFfg).where(eq(userFfg.id, id));
}
