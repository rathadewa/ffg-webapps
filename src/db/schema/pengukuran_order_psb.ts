import { mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const pengukuranOrderPsb = mysqlTable("pengukuran_order_psb", {
  orderId:          varchar("order_id",         { length: 20  }).primaryKey(),
  source:           varchar("source",           { length: 10  }),
  sto:              varchar("sto",              { length: 255 }),
  external:         varchar("external",         { length: 255 }),
  speedy:           varchar("speedy",           { length: 255 }),
  lastUpdate:       varchar("last_update",      { length: 12  }),
  pots:             varchar("pots",             { length: 255 }),
  status:           varchar("status",           { length: 15  }),

  // Tipe pekerjaan
  orderType:        mysqlEnum("order_type", ["logic", "fisik"]).notNull().default("logic"),

  // Kolom status dari UMAS ONU
  umasOnuStatus:    varchar("umas_onu_status",  { length: 20  }),

  // Kolom pengerjaan
  downTime:         timestamp("down_time"),
  pic:              varchar("pic",              { length: 255 }),
  statusPengerjaan: mysqlEnum("status_pengerjaan", ["belum", "pickup", "done"]).notNull().default("belum"),
  pickupTime:       timestamp("pickup_time"),
  doneTime:         timestamp("done_time"),
  penyebabLoss:     varchar("penyebab_loss",    { length: 50  }),
  segmenInfra:      varchar("segmen_infra",     { length: 50  }),
  actsol:           varchar("actsol",           { length: 255 }),
  evidence:         text("evidence"),
});
