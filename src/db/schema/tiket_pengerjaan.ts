import { int, mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
import { userFfg } from "./user_ffg";
import { pengukuranOrderPsb } from "./pengukuran_order_psb";

export const tiketPengerjaan = mysqlTable("tiket_pengerjaan", {
  id:           int("id").primaryKey().autoincrement(),
  userFfgId:    int("user_ffg_id").notNull().references(() => userFfg.id),
  orderId:      varchar("order_id", { length: 20 }).notNull().references(() => pengukuranOrderPsb.orderId),
  score:        int("score").notNull().default(0),
  catatan:      varchar("catatan", { length: 500 }),
  dikerjakanAt: timestamp("dikerjakan_at").defaultNow().notNull(),
});
