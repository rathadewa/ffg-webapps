import { db } from "../db";
import { users } from "../db/schema/users";
import { eq, like, and, sql, SQL } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateSecret } from "otplib";

export interface UserFfgRow {
  id:         number;
  nama:       string;
  email:      string;
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
  page:     number;
  limit:    number;
  search?:  string;
  distrik?: string;
  sto?:     string;
}): Promise<UserFfgResult> {
  const { page, limit, search, distrik, sto } = opts;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [eq(users.role, "Agent")];
  if (search)  conditions.push(like(users.name,    `%${search}%`));
  if (distrik) conditions.push(like(users.distrik, `%${distrik}%`));
  if (sto)     conditions.push(like(users.sto,     `%${sto}%`));

  const where = and(...conditions);

  const [countResult, rowsResult] = await Promise.all([
    db.select({ total: sql<number>`COUNT(*)` }).from(users).where(where),
    db.select({
      id:         users.id,
      name:       users.name,
      email:      users.email,
      distrik:    users.distrik,
      hsa:        users.hsa,
      sto:        users.sto,
      idTelegram: users.idTelegram,
    }).from(users).where(where).limit(limit).offset(offset).orderBy(users.id),
  ]);

  const total = Number(countResult[0]?.total ?? 0);

  return {
    rows: rowsResult.map((r) => ({
      id:         r.id,
      nama:       r.name,
      email:      r.email,
      distrik:    r.distrik    ?? null,
      hsa:        r.hsa        ?? null,
      sto:        r.sto        ?? null,
      idTelegram: r.idTelegram ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function createUserFfg(data: {
  nama: string; email: string; distrik?: string; hsa?: string; sto?: string; idTelegram?: string;
}): Promise<void> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) throw new Error("Email sudah terdaftar");

  const hashedPassword = await bcrypt.hash("Agent@12345", 10);

  await db.insert(users).values({
    name:        data.nama,
    email:       data.email,
    password:    hashedPassword,
    role:        "Agent",
    distrik:     data.distrik    ?? null,
    hsa:         data.hsa        ?? null,
    sto:         data.sto        ?? null,
    idTelegram:  data.idTelegram ?? null,
    twoFaSecret: generateSecret(),
  });
}

export async function updateUserFfg(id: number, data: {
  nama?: string; distrik?: string; hsa?: string; sto?: string; idTelegram?: string;
}): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.nama        !== undefined) updates.name        = data.nama;
  if (data.distrik     !== undefined) updates.distrik     = data.distrik    || null;
  if (data.hsa         !== undefined) updates.hsa         = data.hsa        || null;
  if (data.sto         !== undefined) updates.sto         = data.sto        || null;
  if (data.idTelegram  !== undefined) updates.idTelegram  = data.idTelegram || null;

  if (Object.keys(updates).length > 0) {
    await db.update(users)
      .set(updates as any)
      .where(and(eq(users.id, id), eq(users.role, "Agent")));
  }
}

export async function deleteUserFfg(id: number): Promise<void> {
  await db.delete(users).where(and(eq(users.id, id), eq(users.role, "Agent")));
}
