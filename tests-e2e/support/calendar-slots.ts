import { closeSync, mkdirSync, openSync, rmSync } from 'fs';
import { join } from 'path';

export interface SlotCandidate {
  eventDate: string;
  startTime: string;
  endTime: string;
}

const SLOT_DURATION_MINUTES = 30;
const SLOT_LOCK_ROOT = join(process.cwd(), 'tmp', 'e2e-slot-locks');

const pad = (value: number) => String(value).padStart(2, '0');

const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTime = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const getWeekStart = (reference = new Date()): Date => {
  const day = reference.getDay();
  const offset = (day + 6) % 7; // Monday = 0
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const buildWeekSlots = (weekStart: Date): SlotCandidate[] => {
  const dayOffsets = [0, 1, 2, 3, 4, 5, 6];
  const hours = Array.from({ length: 13 }, (_, index) => 7 + index); // 07:00–19:30
  const minutes = [0, 30];

  const slots: SlotCandidate[] = [];

  for (const dayOffset of dayOffsets) {
    for (const hour of hours) {
      for (const minute of minutes) {
        const start = new Date(weekStart);
        start.setDate(weekStart.getDate() + dayOffset);
        start.setHours(hour, minute, 0, 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + SLOT_DURATION_MINUTES);

        slots.push({
          eventDate: formatDate(start),
          startTime: formatTime(start),
          endTime: formatTime(end),
        });
      }
    }
  }

  return slots;
};

const ensureDir = (path: string) => {
  mkdirSync(path, { recursive: true });
};

const sanitize = (value: string) => value.replace(/[^0-9a-zA-Z_-]/g, '-');

interface SlotClaim {
  slot: SlotCandidate;
  release: () => void;
}

export const claimSlot = (seed: string): SlotClaim => {
  const weekStart = getWeekStart();
  const weekKey = formatDate(weekStart);
  const slots = buildWeekSlots(weekStart);
  const rotatedSlots = (() => {
    if (slots.length === 0) {
      return slots;
    }
    const offset = hashSeed(seed) % slots.length;
    return [...slots.slice(offset), ...slots.slice(0, offset)];
  })();

  ensureDir(SLOT_LOCK_ROOT);
  const weekDir = join(SLOT_LOCK_ROOT, weekKey);
  ensureDir(weekDir);

  for (const slot of rotatedSlots) {
    const slotKey = sanitize(`${slot.eventDate}-${slot.startTime}`);
    const lockFile = join(weekDir, `${slotKey}.lock`);

    try {
      const handle = openSync(lockFile, 'wx');
      closeSync(handle);
      return {
        slot,
        release: () => {
          rmSync(lockFile, { force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Unable to claim a calendar slot for this week.');
};
