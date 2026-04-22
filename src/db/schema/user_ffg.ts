import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const userFfg = mysqlTable("user_ffg", {
  id:         int("id").primaryKey().autoincrement(),
  nama:       varchar("nama",        { length: 255 }).notNull(),
  distrik:    varchar("distrik",     { length: 255 }),
  hsa:        varchar("hsa",         { length: 255 }),
  sto:        varchar("sto",         { length: 255 }),
  idTelegram: varchar("id_telegram", { length: 255 }),
});
