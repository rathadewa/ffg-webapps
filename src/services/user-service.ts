import { db } from "../db";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

  await db.insert(users).values({
    name: data.name,
    email: data.email,
    nik: data.nik,
    password: hashedPassword,
  });
}
