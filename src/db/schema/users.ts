import { int, mysqlTable, varchar, timestamp, boolean, mysqlEnum } from "drizzle-orm/mysql-core";

export type UserRole = "Superuser" | "Administrator" | "Agent" | "Teknisi";
export const ROLES: UserRole[] = ["Superuser", "Administrator", "Agent", "Teknisi"];

export const users = mysqlTable("users", {
  id:          int("id").primaryKey().autoincrement(),
  name:        varchar("name",         { length: 255 }).notNull(),
  email:       varchar("email",        { length: 255 }).notNull().unique(),
  nik:         int("nik").unique(),
  password:    varchar("password",     { length: 255 }).notNull(),
  role:        mysqlEnum("role", ["Superuser", "Administrator", "Agent", "Teknisi"]).notNull().default("Agent"),
  twoFaSetup:  boolean("two_fa_setup").notNull().default(false),
  twoFaSecret: varchar("two_fa_secret", { length: 64 }),
  createdAt:   timestamp("created_at").defaultNow().notNull(),

  // Field khusus Agent (ex-user_ffg)
  distrik:     varchar("distrik",      { length: 255 }),
  hsa:         varchar("hsa",          { length: 255 }),
  sto:         varchar("sto",          { length: 255 }),
  idTelegram:  varchar("id_telegram",  { length: 255 }),
});
