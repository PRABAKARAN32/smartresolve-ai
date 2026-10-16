import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
const app = createApp();

describe("auth (no database needed)", () => {
  it("blocks role elevation at registration", async () => {
    const res = await request(app).post("/auth/register").send({
      displayName: "Eve",
      email: "eve@example.com",
      password: "password123",
      role: "ADMIN",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a short password", async () => {
    const res = await request(app).post("/auth/register").send({
      displayName: "Eve",
      email: "eve@example.com",
      password: "short",
    });
    expect(res.status).toBe(400);
  });

  it("rejects NoSQL operator objects in login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: { $gt: "" }, password: "x" });
    expect(res.status).toBe(400);
  });

  it("requires a token for /me", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a forged token", async () => {
    const res = await request(app)
      .get("/me")
      .set("Authorization", "Bearer not.a.real.token");
    expect(res.status).toBe(401);
  });
});
