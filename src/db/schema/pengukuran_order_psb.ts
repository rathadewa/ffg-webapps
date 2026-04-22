import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const pengukuranOrderPsb = mysqlTable("pengukuran_order_psb", {
  orderId:    varchar("order_id",   { length: 20  }).primaryKey(),
  source:     varchar("source",     { length: 10  }),   // "indihome" | "indibiz"
  sto:        varchar("sto",        { length: 255 }),
  external:   varchar("external",   { length: 255 }),
  speedy:     varchar("speedy",     { length: 255 }),
  lastUpdate: varchar("last_update",{ length: 12  }),   // dd-mm-yyyy
  pots:       varchar("pots",       { length: 255 }),
});
