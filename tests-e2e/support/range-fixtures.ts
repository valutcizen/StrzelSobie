import type { APIRequestContext } from '@playwright/test';

type FiringLineFixture = {
  id: number;
  tracksCount: number;
};

type RangeDetailsFixture = {
  firingLines?: FiringLineFixture[];
};

export const getFiringLineForTracks = async (
  context: APIRequestContext,
  apiBaseUrl: string,
  rangeSlug: string,
  requiredTracks = 1,
): Promise<FiringLineFixture> => {
  const response = await context.get(`${apiBaseUrl}/api/v1/ranges/${rangeSlug}`);
  if (!response.ok()) {
    throw new Error(`Failed to fetch range details for ${rangeSlug} (status: ${response.status()}).`);
  }

  const payload = (await response.json()) as RangeDetailsFixture;
  const firingLine = (payload.firingLines ?? []).find((line) => line.tracksCount >= requiredTracks);

  if (!firingLine) {
    throw new Error(`No firing line on ${rangeSlug} supports ${requiredTracks} track(s).`);
  }

  return firingLine;
};
