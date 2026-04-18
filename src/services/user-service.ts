import { db } from "../db";
import { users } from "../db/schema/users";
import { sessions } from "../db/schema/sessions";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { generateSecret } from "otplib";

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
    throw new Error("Email atau NIK salah");
  }

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    throw new Error("Email atau NIK salah");
  }

  const token = uuidv4();

  await db.insert(sessions).values({
    token,
    email: user.email,
    userId: user.id,
  });

  return { token, twoFaSetup: user.twoFaSetup };
}

export async function getTwoFaSecret(token: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
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

export async function markTwoFaSetup(token: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  });
  if (!session) throw new Error("unauthorised");
  await db.update(users).set({ twoFaSetup: true }).where(eq(users.id, session.userId!));
}

export async function logoutUser(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getCurrentUser(token: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
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
    createdAt: user.createdAt,
  };
}
