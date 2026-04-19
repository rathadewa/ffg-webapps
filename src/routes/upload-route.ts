import { Elysia } from "elysia";
import { getSessionRole } from "../services/user-service";
import { importIndihome, importIndibiz } from "../services/upload-service";
import type { UserRole } from "../db/schema/users";

const ALLOWED: UserRole[] = ["Administrator", "Manager"];

async function resolveToken(headers: Record<string, string | undefined>): Promise<string> {
  return (headers["authorization"] ?? "").split(" ")[1] ?? "";
}

export const uploadRoute = new Elysia()
  .post("/api/upload/indihome", async ({ request, headers, set }) => {
    try {
      const token = await resolveToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role || !ALLOWED.includes(role)) { set.status = 403; return { error: "Akses ditolak." }; }

      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) { set.status = 400; return { error: "File tidak ditemukan." }; }
      if (!file.name.match(/\.(xlsx|xls)$/i)) { set.status = 400; return { error: "Format file harus .xlsx atau .xls." }; }

      const buffer = await file.arrayBuffer();
      const result = await importIndihome(buffer);
      return { data: result };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  })
  .post("/api/upload/indibiz", async ({ request, headers, set }) => {
    try {
      const token = await resolveToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const role = await getSessionRole(token);
      if (!role || !ALLOWED.includes(role)) { set.status = 403; return { error: "Akses ditolak." }; }

      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) { set.status = 400; return { error: "File tidak ditemukan." }; }
      if (!file.name.match(/\.(xlsx|xls)$/i)) { set.status = 400; return { error: "Format file harus .xlsx atau .xls." }; }

      const buffer = await file.arrayBuffer();
      const result = await importIndibiz(buffer);
      return { data: result };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  });
