import { int, mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./users";

export const sessions = mysqlTable("sessions", {
  id: int("id").primaryKey().autoincrement(),
  token: varchar("token", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  userId: int("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
