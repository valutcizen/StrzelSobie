import { test, expect, describe } from "vitest";
import { env, createAdmin, createWorker, login, createUser } from "../../utils/e2e-utils";
import { UpdateRangeCommand } from "@strzel-sobie/common";

describe("PATCH /api/v1/ranges/:rangeSlug", () => {
  test("should return 401 for unauthenticated user", async () => {
    const worker = await createWorker();
    const updateCmd: UpdateRangeCommand = { totalTracks: 15 };

    const response = await worker.fetch("/api/v1/ranges/dobczyce", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateCmd),
    });

    expect(response.status).toBe(401);
  });

  test("should return 403 for user who is not an admin for the range", async () => {
    const worker = await createWorker();
    const user = await createUser(env.DB, { email: "test@user.com" });
    const token = await login(worker, user.email);

    const updateCmd: UpdateRangeCommand = { totalTracks: 15 };

    const response = await worker.fetch("/api/v1/ranges/dobczyce", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_token=${token}`,
      },
      body: JSON.stringify(updateCmd),
    });

    expect(response.status).toBe(403);
  });

  test("should return 404 if range does not exist", async () => {
    const worker = await createWorker();
    const admin = await createAdmin(env.DB);
    const token = await login(worker, admin.email);

    const updateCmd: UpdateRangeCommand = { totalTracks: 15 };

    const response = await worker.fetch("/api/v1/ranges/non-existent-range", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_token=${token}`,
      },
      body: JSON.stringify(updateCmd),
    });

    expect(response.status).toBe(404);
  });

  test("should return 400 for invalid request body", async () => {
    const worker = await createWorker();
    const admin = await createAdmin(env.DB);
    const token = await login(worker, admin.email);

    const response = await worker.fetch("/api/v1/ranges/dobczyce", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_token=${token}`,
      },
      body: JSON.stringify({ totalTracks: "invalid" }),
    });

    expect(response.status).toBe(400);
  });

  test("should update range details for an authorized admin", async () => {
    const worker = await createWorker();
    const admin = await createAdmin(env.DB, "dobczyce");
    const token = await login(worker, admin.email);

    const updateCmd: UpdateRangeCommand = {
      totalTracks: 20,
      operatingHours: { monday: { open: "10:00", close: "22:00" } },
    };

    const response = await worker.fetch("/api/v1/ranges/dobczyce", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_token=${token}`,
      },
      body: JSON.stringify(updateCmd),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // Verify the update
    const verifyResponse = await worker.fetch("/api/v1/ranges/dobczyce");
    const verifyJson = (await verifyResponse.json()) as { result: any };
    expect(verifyJson.result.totalTracks).toBe(20);
    expect(verifyJson.result.operatingHours.monday.open).toBe("10:00");
  });
});
