import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as usersSchema from "./schema/users";
import * as sessionsSchema from "./schema/sessions";
import * as pengukuranSchema from "./schema/pengukuran_order_psb";
import * as tiketSchema from "./schema/tiket_pengerjaan";

const schema = { ...usersSchema, ...sessionsSchema, ...pengukuranSchema, ...tiketSchema };

const pool = mysql.createPool({
  host:     Bun.env.DB_HOST     ?? "localhost",
  port:     Number(Bun.env.DB_PORT ?? 3306),
  user:     Bun.env.DB_USER     ?? "root",
  password: Bun.env.DB_PASSWORD ?? "",
  database: Bun.env.DB_NAME     ?? "ffg_webapps",
  timezone: "+07:00",
});

export const db = drizzle(pool, { schema, mode: "default" });
