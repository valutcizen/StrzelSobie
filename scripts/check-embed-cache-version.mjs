import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const zeroSha = /^0+$/;
const embedPaths = [
  'src/embed-map/',
];
const workerIndexPath = 'src/worker/src/index.ts';
const cacheVersionPattern = /EMBED_MAP_CACHE_VERSION/;
const remoteName = process.argv[2] ?? 'origin';

const runGit = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const getDefaultRange = () => {
  try {
    const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
    return `${upstream}...HEAD`;
  } catch {
    const rootCommit = runGit(['rev-list', '--max-parents=0', 'HEAD']).split('\n')[0];
    return `${rootCommit}..HEAD`;
  }
};

const getNewBranchRange = (localSha) => {
  const remoteRefs = [
    `${remoteName}/HEAD`,
    `${remoteName}/main`,
    'origin/HEAD',
    'origin/main',
  ];

  for (const remoteRef of remoteRefs) {
    try {
      const base = runGit(['merge-base', localSha, remoteRef]);
      if (base) {
        return `${base}..${localSha}`;
      }
    } catch {
      // Try the next known default branch ref.
    }
  }

  const rootCommit = runGit(['rev-list', '--max-parents=0', localSha]).split('\n')[0];
  return `${rootCommit}..${localSha}`;
};

const parsePrePushRanges = () => {
  const input = readFileSync(0, 'utf8').trim();
  if (!input) {
    return [getDefaultRange()];
  }

  return input
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 4)
    .map(([, localSha, , remoteSha]) => {
      if (zeroSha.test(localSha)) {
        return null;
      }

      if (zeroSha.test(remoteSha)) {
        return getNewBranchRange(localSha);
      }

      return `${remoteSha}..${localSha}`;
    })
    .filter(Boolean);
};

const getChangedFiles = (range) =>
  runGit(['diff', '--name-only', range])
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

const hasEmbedMapChange = (files) =>
  files.some((file) => embedPaths.some((path) => file.startsWith(path)));

const hasCacheVersionChange = (range) => {
  const diff = runGit(['diff', range, '--', workerIndexPath]);
  return cacheVersionPattern.test(diff);
};

const ranges = parsePrePushRanges();
const failingRanges = ranges.filter((range) => {
  const changedFiles = getChangedFiles(range);
  return hasEmbedMapChange(changedFiles) && !hasCacheVersionChange(range);
});

if (failingRanges.length > 0) {
  console.error(
    [
      'Push blocked: src/embed-map changed without updating EMBED_MAP_CACHE_VERSION.',
      `Update EMBED_MAP_CACHE_VERSION in ${workerIndexPath} so browsers fetch a fresh embed bundle.`,
      `Checked ranges: ${failingRanges.join(', ')}`,
    ].join('\n'),
  );
  process.exit(1);
}
