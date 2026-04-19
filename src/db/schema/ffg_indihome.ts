import { bigint, mysqlTable, varchar, date } from "drizzle-orm/mysql-core";

export const ffgIndihome = mysqlTable("ffg_indihome", {
  noOrder:    bigint("no_order", { mode: "number" }).primaryKey(),
  sto:        varchar("sto", { length: 255 }),
  external:   varchar("external", { length: 255 }),
  speedy:     varchar("speedy", { length: 255 }),
  lastUpdate: date("last_update"),
  orderId:    varchar("order_id", { length: 255 }),
});
