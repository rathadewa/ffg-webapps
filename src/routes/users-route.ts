import { Elysia, t } from "elysia";
import { registerUser, loginUser, getCurrentUser, logoutUser, markTwoFaSetup, getTwoFaSecret } from "../services/user-service";

export const usersRoute = new Elysia()
  .post(
    "/api/users",
    async ({ body, set }) => {
      try {
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
      const authorization = headers["authorization"] ?? "";
      const token = authorization.split(" ")[1];
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      const data = await getTwoFaSecret(token);
      return { data };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  })
  .post("/api/users/2fa-setup", async ({ headers, set }) => {
    try {
      const authorization = headers["authorization"] ?? "";
      const token = authorization.split(" ")[1];
      if (!token) { set.status = 401; return { error: "unauthorised" }; }
      await markTwoFaSetup(token);
      return { data: "OK" };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  })
  .post("/api/users/logout", async ({ headers, set }) => {
    const authorization = headers["authorization"] ?? "";
    const token = authorization.split(" ")[1];
    if (!token) {
      set.status = 401;
      return { error: "unauthorised" };
    }
    await logoutUser(token);
    return { data: "OK" };
  })
  .get("/api/users/current", async ({ headers, set }) => {
    try {
      const authorization = headers["authorization"] ?? "";
      const token = authorization.split(" ")[1];

      if (!token) {
        set.status = 401;
        return { error: "unauthorised" };
      }

      const user = await getCurrentUser(token);
      return { data: user };
    } catch (error) {
      set.status = 401;
      return { error: (error as Error).message };
    }
  });
