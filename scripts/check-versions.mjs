#!/usr/bin/env node
// Reports pinned dependencies against the registry (ADR-0002 version policy).
// For each package: pinned version, newest version in the same major that is >= 14 days old,
// and the absolute latest. Never modifies package.json.
import { readFile } from 'node:fs/promises';

const MIN_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const pins = { ...pkg.dependencies, ...pkg.devDependencies };

/** @param {string} version */
const isStable = (version) => /^\d+\.\d+\.\d+$/.test(version);
/** @param {string} a @param {string} b */
const compare = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1)
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

const rows = await Promise.all(
  Object.entries(pins).map(async ([name, pinned]) => {
    const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`);
    if (!response.ok) return { name, pinned, eligible: '?', latest: '?', status: 'registry error' };
    /** @type {{ time: Record<string, string>; 'dist-tags': { latest: string } }} */
    const data = await response.json();
    const major = String(pinned).split('.')[0];
    const now = Date.now();
    const eligible = Object.keys(data.time)
      .filter((v) => isStable(v) && v.split('.')[0] === major)
      .filter((v) => now - Date.parse(data.time[v] ?? '') >= MIN_AGE_MS)
      .sort(compare)
      .at(-1);
    const latest = data['dist-tags'].latest;
    const status = eligible && compare(eligible, String(pinned)) > 0 ? 'update available' : 'ok';
    return { name, pinned, eligible: eligible ?? '-', latest, status };
  }),
);

console.table(rows);
