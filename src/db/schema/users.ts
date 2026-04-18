import { int, mysqlTable, varchar, timestamp, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nik: int("nik").notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  twoFaSetup: boolean("two_fa_setup").notNull().default(false),
  twoFaSecret: varchar("two_fa_secret", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});