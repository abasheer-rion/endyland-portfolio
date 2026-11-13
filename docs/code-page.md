# GitHub page (`/code/`)

> **Current as of:** 2026-11-13 (built and checked, not committed or deployed) · **Code:** `code/`, `data/github.json`, `.github/scripts/fetch-github.mjs`, `.github/workflows/github-stats.yml`

`/code/` shows GitHub activity for the account `abasheer-rion`: the past year as a dot plate, totals, languages and
the public repositories. Home has a short strip (`#code`) that reads the same file and links to the page.

## Data flow

1. `.github/scripts/fetch-github.mjs` calls the GitHub GraphQL API and writes `data/github.json`. It uses Node
   built-ins only.
2. `code/main.js` and `home/home.js` fetch `/data/github.json` from the same site. Nothing is requested from GitHub in
   the browser, so the CSP and the privacy page do not change.
3. If the file fails to load, `/code/` keeps its heading, one sentence and the profile button. The home strip keeps its text.

## What the file holds

Fetch date, login, scope (`all` or `public`), date range, totals (contributions, commits, pull requests, reviews,
issues), counts of private work, streaks, busiest day and weekday, the daily calendar, languages by bytes and the
public repositories.

- Private repository names, descriptions and links are never written. Private work appears as counts only.
- Languages cover the account's own repositories, public and private. Organization repositories are not included.
- Public repositories link to their page on this site through the `PAGES` map in the script.
- One public repository is kept off the list on purpose (`HIDDEN_REPOS` in the script).
- GitHub reports 9 private repositories but 0 private commits in the past year for this login, so private work adds nothing
  to the counts.

## Daily refresh

`github-stats.yml` runs every day at 09:17 UTC and can be started by hand. It runs on `main` only and has no push
trigger, so its own commit cannot start it again.

- It runs the script, and if anything other than the fetch date changed it runs `check-site.sh`, commits
  `data/github.json` as `github-actions[bot]`, pushes to `main` and starts `deploy.yml` by hand (a push made with the
  built-in token does not start other workflows).
- With the repo secret `GH_STATS_TOKEN` (a read-only token on the owner's account) the numbers include private work.
  Without it the job only has public data. If the file on disk was made with the owner token, the script leaves it alone
  and prints a warning. Starting the job by hand with `allow_public` ticked overwrites it with public numbers.
- If `main` blocks pushes from Actions, the job's push fails. Allow `github-actions[bot]` or turn the job off.

## Refresh by hand

    GH_STATS_TOKEN=$(env -u GITHUB_TOKEN -u GH_TOKEN gh auth token) env -u GITHUB_TOKEN -u GH_TOKEN node .github/scripts/fetch-github.mjs

The file on disk was fetched on 2026-11-12 with the owner's login. Totals checked against the API on 2026-11-13: 462
contributions, 275 commits, 178 pull requests.

## Not checked

- The workflow has not run on GitHub, because nothing is committed or pushed.
- Whether the built-in Actions token reads the contribution calendar the same way a user token does.
- Hover on the dot plate with a real mouse. Keyboard focus and the tooltip were checked in headless Chrome at 1440 and 390 wide.
