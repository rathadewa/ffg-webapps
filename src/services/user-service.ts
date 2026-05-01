import { db } from "../db";
import { users, type UserRole } from "../db/schema/users";
import { sessions } from "../db/schema/sessions";
import { eq, or, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { generateSecret, verifySync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";

const cryptoPlugin = new NobleCryptoPlugin();
const base32Plugin = new ScureBase32Plugin();

function checkOTP(code: string, secret: string): boolean {
  const result = verifySync({ token: code, secret, crypto: cryptoPlugin, base32: base32Plugin });
  return result.valid;
}

export async function registerUser(data: {
  name: string;
  email: string;
  nik: number;
  password: string;
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.nik, data.nik),
  });

  if (existing) {
    throw new Error("NIK sudah terdaftar");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const twoFaSecret = generateSecret();

  await db.insert(users).values({
    name: data.name,
    email: data.email,
    nik: data.nik,
    password: hashedPassword,
    twoFaSecret,
  });
}

export async function loginUser(data: {
  nik?: string;
  email?: string;
  password: string;
}) {
  const user = await db.query.users.findFirst({
    where: or(
      data.email ? eq(users.email, data.email) : undefined,
      data.nik   ? eq(users.nik, Number(data.nik)) : undefined,
    ),
  });

  if (!user) {
    throw new Error("Email, NIK atau password salah");
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    throw new Error("Email, NIK atau password salah");
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(sessions).values({
    token,
    email: user.email,
    userId: user.id,
    expiresAt,
  });

  return { token, twoFaSetup: user.twoFaSetup };
}

export async function getTwoFaSecret(token: string) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });
  if (!session) throw new Error("unauthorised");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId!),
  });
  if (!user) throw new Error("unauthorised");

  let secret = user.twoFaSecret;
  if (!secret) {
    secret = generateSecret();
    await db.update(users).set({ twoFaSecret: secret }).where(eq(users.id, user.id));
  }

  return { secret, nik: user.nik };
}

export async function markTwoFaSetup(token: string, code: string) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });
  if (!session) throw new Error("unauthorised");

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId!) });
  if (!user?.twoFaSecret) throw new Error("unauthorised");

  const isValid = checkOTP(code, user.twoFaSecret);
  if (!isValid) throw new Error("Kode OTP tidak valid. Pastikan waktu perangkat Anda sinkron.");

  await db.update(users).set({ twoFaSetup: true }).where(eq(users.id, user.id));
}

export async function verifyTwoFa(token: string, code: string) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });
  if (!session) throw new Error("unauthorised");

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId!) });
  if (!user?.twoFaSecret) throw new Error("unauthorised");

  const isValid = checkOTP(code, user.twoFaSecret);
  if (!isValid) throw new Error("Kode OTP tidak valid atau sudah kedaluwarsa.");
}

export async function getSessionRole(token: string): Promise<UserRole | null> {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId!) });
  return (user?.role as UserRole) ?? null;
}

export async function getAllUsers(callerRole?: UserRole | null) {
  const hideSuper = callerRole !== "Superuser";
  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    nik: users.nik,
    role: users.role,
    twoFaSetup: users.twoFaSetup,
    createdAt: users.createdAt,
  }).from(users)
    .where(hideSuper ? sql`role != 'Superuser'` : undefined);
  return result;
}

export async function createUserByAdmin(data: {
  name: string;
  email: string;
  nik: number;
  password: string;
  role: UserRole;
}) {
  const existing = await db.query.users.findFirst({
    where: or(eq(users.nik, data.nik), eq(users.email, data.email)),
  });
  if (existing) throw new Error("NIK atau email sudah terdaftar");

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const twoFaSecret = generateSecret();

  await db.insert(users).values({
    name: data.name,
    email: data.email,
    nik: data.nik,
    role: data.role,
    password: hashedPassword,
    twoFaSecret,
  });
}

export async function updateUser(id: number, data: {
  name?: string;
  email?: string;
  nik?: number;
  password?: string;
  role?: UserRole;
}) {
  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!existing) throw new Error("User tidak ditemukan");

  const updates: Partial<typeof users.$inferInsert> = {};
  if (data.name)     updates.name  = data.name;
  if (data.email)    updates.email = data.email;
  if (data.nik)      updates.nik   = data.nik;
  if (data.role)     updates.role  = data.role;
  if (data.password) updates.password = await bcrypt.hash(data.password, 10);

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }
}

export async function deleteUser(id: number) {
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function logoutUser(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getCurrentUser(token: string) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
  });

  if (!session) {
    throw new Error("unauthorised");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId!),
  });

  if (!user) {
    throw new Error("unauthorised");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    createdAt: user.createdAt,
  };
}
