/**
 * Script migrasi: pindahkan semua data user_ffg ke tabel users dengan role='Agent'
 *
 * Jalankan SETELAH kolom baru ditambahkan ke users:
 *   bun scripts/migrate-agents.ts
 *
 * Password default untuk semua agent yang dimigrasikan: Agent@12345
 */

import { db } from "../src/db";
import { users } from "../src/db/schema/users";
import { userFfg } from "../src/db/schema/user_ffg";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateSecret } from "otplib";

async function main() {
  const agents = await db.select().from(userFfg);

  if (agents.length === 0) {
    console.log("Tidak ada data user_ffg untuk dimigrasikan.");
    process.exit(0);
  }

  console.log(`Memigrasikan ${agents.length} agent...`);

  const defaultHash = await bcrypt.hash("Agent@12345", 10);
  let sukses = 0;
  let skip = 0;

  for (const agent of agents) {
    const email = `agent.${agent.id}@ffg.internal`;

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      console.log(`  ↷ Skip (sudah ada): ${agent.nama} → ${email}`);
      skip++;
      continue;
    }

    try {
      await db.insert(users).values({
        name:        agent.nama,
        email,
        password:    defaultHash,
        role:        "Agent",
        distrik:     agent.distrik    ?? null,
        hsa:         agent.hsa        ?? null,
        sto:         agent.sto        ?? null,
        idTelegram:  agent.idTelegram ?? null,
        twoFaSecret: generateSecret(),
      });
      console.log(`  ✓ Migrated: ${agent.nama} → ${email}`);
      sukses++;
    } catch (e) {
      console.error(`  ✗ Gagal migrasikan ${agent.nama}:`, (e as Error).message);
    }
  }

  console.log(`\nSelesai: ${sukses} berhasil, ${skip} di-skip.`);
  console.log("Password default: Agent@12345");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
