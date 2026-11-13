#!/usr/bin/env node
// Writes data/github.json for the /code/ page. Node built-ins only (needs Node 18+ for fetch).
//
//   GH_STATS_TOKEN=... node .github/scripts/fetch-github.mjs      the owner's token: private work is counted
//   GITHUB_TOKEN=...   node .github/scripts/fetch-github.mjs      any other token: public data only
//
// Locally, without showing the token:
//   GH_STATS_TOKEN=$(env -u GITHUB_TOKEN -u GH_TOKEN gh auth token) node .github/scripts/fetch-github.mjs
//
// Private repository names, descriptions and links are never written. Private work shows up as counts only.
// If the file on disk was made with the owner's token and this run only has a public token, the file is
// left alone (set ALLOW_PUBLIC_DOWNGRADE=1 to overwrite it), so the numbers do not drop by accident.
// The file is rewritten only when something other than fetched_at changed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOGIN = 'abasheer-rion';
// Public repos the owner keeps off the site.
const HIDDEN_REPOS = new Set(['parking-app']);
// Public repo name -> its page on this site.
const PAGES = {
  'ride-beamforming': '/research/rf-direction-finder/',
  parity: '/research/parity/',
  'endyland-portfolio': '/web-design/endyland/',
};
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/github.json');

const token = process.env.GH_STATS_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.error('No token. Set GH_STATS_TOKEN or GITHUB_TOKEN.');
  process.exit(1);
}

const QUERY = `
query($login: String!) {
  viewer { login }
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        repository { isPrivate }
        contributions { totalCount }
      }
      pullRequestContributionsByRepository(maxRepositories: 100) {
        repository { isPrivate }
        contributions { totalCount }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name
        isPrivate
        isArchived
        description
        url
        homepageUrl
        pushedAt
        stargazerCount
        primaryLanguage { name }
        languages(first: 30, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }
      }
    }
  }
}`;

async function gql(query, variables) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          authorization: `bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'endyland-portfolio-stats',
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
      const body = await res.json();
      if (body.errors && !body.data) throw new Error(body.errors.map((e) => e.message).join('; '));
      return body.data;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw lastErr;
}

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();

// Longest run of days with at least one contribution, and the run that reaches today.
// A day with nothing yet does not break the current run until it is over.
function streaks(days) {
  let longest = { days: 0, from: null, to: null };
  let run = 0;
  let start = null;
  for (const [date, count] of days) {
    if (count > 0) {
      if (run === 0) start = date;
      run++;
      if (run > longest.days) longest = { days: run, from: start, to: date };
    } else run = 0;
  }
  let i = days.length - 1;
  if (i >= 0 && days[i][1] === 0) i--;
  let cur = 0;
  let to = null;
  let from = null;
  for (; i >= 0 && days[i][1] > 0; i--) {
    if (cur === 0) to = days[i][0];
    from = days[i][0];
    cur++;
  }
  return { longest, current: { days: cur, from, to } };
}

function build(data) {
  const user = data.user;
  if (!user) throw new Error(`No user ${LOGIN}`);
  const owner = data.viewer && data.viewer.login === LOGIN;
  const cc = user.contributionsCollection;

  const days = cc.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => [d.date, d.contributionCount]);
  for (let i = 1; i < days.length; i++) {
    if (days[i][0] !== addDays(days[i - 1][0], 1)) throw new Error('Calendar has a gap');
  }

  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  let busiest = { date: null, count: 0 };
  let active = 0;
  for (const [date, count] of days) {
    weekdayTotals[weekdayOf(date)] += count;
    if (count > 0) active++;
    if (count > busiest.count) busiest = { date, count };
  }
  const topWeekday = weekdayTotals.indexOf(Math.max(...weekdayTotals));

  const sumPrivate = (list) =>
    list.filter((x) => x.repository.isPrivate).reduce((n, x) => n + x.contributions.totalCount, 0);

  const repos = user.repositories.nodes;
  const langBytes = new Map();
  for (const r of repos) {
    for (const e of r.languages.edges) langBytes.set(e.node.name, (langBytes.get(e.node.name) || 0) + e.size);
  }
  const totalBytes = [...langBytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...langBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes, percent: Math.round((bytes / totalBytes) * 1000) / 10 }));

  const publicRepos = repos
    .filter((r) => !r.isPrivate && !HIDDEN_REPOS.has(r.name))
    .map((r) => ({
      name: r.name,
      description: r.description || '',
      language: r.primaryLanguage ? r.primaryLanguage.name : null,
      pushed_at: r.pushedAt.slice(0, 10),
      stars: r.stargazerCount,
      url: r.url,
      homepage: r.homepageUrl || null,
      page: PAGES[r.name] || null,
      archived: r.isArchived,
    }));

  return {
    fetched_at: new Date().toISOString().slice(0, 10),
    login: LOGIN,
    profile_url: `https://github.com/${LOGIN}`,
    // "all": made with the owner's token, private work is counted. "public": public data only.
    scope: owner ? 'all' : 'public',
    range: { from: days[0][0], to: days[days.length - 1][0] },
    totals: {
      contributions: cc.contributionCalendar.totalContributions,
      commits: cc.totalCommitContributions,
      pull_requests: cc.totalPullRequestContributions,
      reviews: cc.totalPullRequestReviewContributions,
      issues: cc.totalIssueContributions,
      active_days: active,
    },
    private: owner
      ? {
          repos: repos.filter((r) => r.isPrivate).length,
          commits: sumPrivate(cc.commitContributionsByRepository),
          pull_requests: sumPrivate(cc.pullRequestContributionsByRepository),
        }
      : { repos: null, commits: null, pull_requests: null, restricted_contributions: cc.restrictedContributionsCount },
    streaks: streaks(days),
    busiest_day: busiest,
    busiest_weekday: { name: WEEKDAYS[topWeekday], contributions: weekdayTotals[topWeekday] },
    weekdays: WEEKDAYS.map((name, i) => ({ name, contributions: weekdayTotals[i] })),
    calendar: { start: days[0][0], counts: days.map((d) => d[1]) },
    languages,
    repos: publicRepos,
  };
}

const next = build(await gql(QUERY, { login: LOGIN }));

let prev = null;
try {
  prev = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  // first run
}

if (prev && prev.scope === 'all' && next.scope === 'public' && process.env.ALLOW_PUBLIC_DOWNGRADE !== '1') {
  console.log('::warning::data/github.json was made with the owner token and this run only has a public token. File left as it is. Add the GH_STATS_TOKEN secret, or set ALLOW_PUBLIC_DOWNGRADE=1.');
  process.exit(0);
}

const strip = (o) => JSON.stringify({ ...o, fetched_at: null });
if (prev && strip(prev) === strip(next)) {
  console.log('No change.');
  process.exit(0);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(next, null, 1)}\n`);
console.log(`Wrote data/github.json (${next.scope}): ${next.totals.contributions} contributions, ${next.repos.length} public repos listed.`);
