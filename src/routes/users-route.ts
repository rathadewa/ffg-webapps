import { Elysia, t } from "elysia";
import { registerUser, loginUser, getCurrentUser, logoutUser, markTwoFaSetup, getTwoFaSecret, verifyTwoFa, getAllUsers, createUserByAdmin, updateUser, deleteUser, getSessionRole } from "../services/user-service";
import type { UserRole } from "../db/schema/users";

const ADMIN_ROLES: UserRole[] = ["Administrator", "Manager"];

async function requireRole(headers: Record<string, string | undefined>, set: { status?: unknown }): Promise<string | null> {
  const authorization = headers["authorization"] ?? "";
  const token = authorization.split(" ")[1];
  if (!token) { set.status = 401; return null; }
  const role = await getSessionRole(token);
  if (!role || !ADMIN_ROLES.includes(role)) { set.status = 403; return null; }
  return token;
}

function getToken(headers: Record<string, string | undefined>): string {
  const authorization = headers["authorization"] ?? "";
  return authorization.split(" ")[1] ?? "";
}

export const usersRoute = new Elysia()
  .post(
    "/api/users",
    async ({ body, headers, set }) => {
      try {
        const token = getToken(headers);
        if (!token) { set.status = 401; return { error: "unauthorised" }; }
        const role = await getSessionRole(token);
        if (!role || !ADMIN_ROLES.includes(role)) { set.status = 403; return { error: "Akses ditolak. Hanya Administrator atau Manager yang dapat mendaftarkan pengguna baru." }; }
        await registerUser(body);
        set.status = 201;
        return { data: "OK" };
      } catch (error) {
        set.status = 400;
        return { error: (error as Error).message };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        nik: t.Number(),
        password: t.String(),
      }),
    }
  )
  .post(
    "/api/users/login",
    async ({ body, set }) => {
      try {
        const token = await loginUser(body);
        return { data: token };
      } catch (error) {
        set.status = 401;
        return { error: (error as Error).message };
      }
    },
    {
      body: t.Object({
        nik:      t.Optional(t.String()),
        email:    t.Optional(t.String()),
        password: t.String(),
      }),
    }
  )
  .get("/api/users/2fa-secret", async ({ headers, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const data = await getTwoFaSecret(token);
      return { data };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  })
  .post("/api/users/2fa-setup", async ({ body, headers, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      await markTwoFaSetup(token, body.code);
      return { data: "OK" };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  }, { body: t.Object({ code: t.String() }) })
  .post("/api/users/verify-2fa", async ({ body, headers, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      await verifyTwoFa(token, body.code);
      return { data: "OK" };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  }, { body: t.Object({ code: t.String() }) })
  .post("/api/users/logout", async ({ headers, set }) => {
    const token = getToken(headers);
    if (!token) { set.status = 401; return { error: "unauthorised" }; }
    await logoutUser(token);
    return { data: "OK" };
  })
  .get("/api/users/current", async ({ headers, set }) => {
    try {
      const token = getToken(headers);
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const user = await getCurrentUser(token);
      return { data: user };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  })
  .get("/api/users", async ({ headers, set }) => {
    try {
      const token = await requireRole(headers, set);
      if (!token) return { error: "Akses ditolak." };
      const data = await getAllUsers();
      return { data };
    } catch (error) {
      set.status = 500;
      return { error: (error as Error).message };
    }
  })
  .post("/api/users/admin", async ({ body, headers, set }) => {
    try {
      const token = await requireRole(headers, set);
      if (!token) return { error: "Akses ditolak." };
      await createUserByAdmin(body);
      set.status = 201;
      return { data: "OK" };
    } catch (error) {
      set.status = 400;
      return { error: (error as Error).message };
    }
  }, {
    body: t.Object({
      name:     t.String(),
      email:    t.String(),
      nik:      t.Number(),
      password: t.String(),
      role:     t.Union([t.Literal("Administrator"), t.Literal("Manager"), t.Literal("Agent"), t.Literal("Teknisi")]),
    }),
  })
  .put("/api/users/:id", async ({ params, body, headers, set }) => {
    try {
      const token = await requireRole(headers, set);
      if (!token) return { error: "Akses ditolak." };
      await updateUser(Number(params.id), body);
      return { data: "OK" };
    } catch (error) {
      set.status = 400;
      return { error: (error as Error).message };
    }
  }, {
    body: t.Object({
      name:     t.Optional(t.String()),
      email:    t.Optional(t.String()),
      nik:      t.Optional(t.Number()),
      password: t.Optional(t.String()),
      role:     t.Optional(t.Union([t.Literal("Administrator"), t.Literal("Manager"), t.Literal("Agent"), t.Literal("Teknisi")])),
    }),
  })
  .delete("/api/users/:id", async ({ params, headers, set }) => {
    try {
      const token = await requireRole(headers, set);
      if (!token) return { error: "Akses ditolak." };
      await deleteUser(Number(params.id));
      return { data: "OK" };
    } catch (error) {
      set.status = 400;
      return { error: (error as Error).message };
    }
  });
