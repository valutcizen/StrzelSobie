import { test, expect, describe } from "vitest";
import { env, createAdmin, createWorker } from "../../utils/e2e-utils";
import { RangeDetailsDto } from "@strzel-sobie/common";

describe("GET /api/v1/ranges/:rangeSlug", () => {
  test("should return 404 if range does not exist", async () => {
    const worker = await createWorker();

    const response = await worker.fetch("/api/v1/ranges/non-existent-range", {
      method: "GET",
    });

    expect(response.status).toBe(404);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Range not found");
  });

  test("should return range details if range exists", async () => {
    const worker = await createWorker();
    const admin = createAdmin(env.DB);

    // Assuming a range with slug 'dobczyce' is in the mock data
    const response = await worker.fetch("/api/v1/ranges/dobczyce", {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as { result: RangeDetailsDto };

    expect(json.result.slug).toBe("dobczyce");
    expect(json.result.displayName).toBe("Strzelnica Dobczyce");
    expect(json.result.totalTracks).toBe(10);
    expect(json.result.operatingHours).toBeTypeOf("object");
  });
});
