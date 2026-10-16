import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

describe("GET /health", () => {
  it("reports db down when not connected", async () => {
    const res = await request(createApp()).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.db).toBe("down");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(createApp()).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
