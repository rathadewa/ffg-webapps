import { int, mysqlTable, varchar, timestamp, boolean, mysqlEnum } from "drizzle-orm/mysql-core";

export type UserRole = "Administrator" | "Manager" | "Agent" | "Teknisi";
export const ROLES: UserRole[] = ["Administrator", "Manager", "Agent", "Teknisi"];

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nik: int("nik").notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["Administrator", "Manager", "Agent", "Teknisi"]).notNull().default("Agent"),
  twoFaSetup: boolean("two_fa_setup").notNull().default(false),
  twoFaSecret: varchar("two_fa_secret", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});