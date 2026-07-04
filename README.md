# SafeUnfollow

SafeUnfollow is a Next.js application with a cron-compatible SEO publishing pipeline. `npm run blog:publish` is the only weekly publication entrypoint and owns the complete state transition.

## Architecture

- `app/` contains the Next.js application and Markdown blog renderer.
- `content/blog/` contains published Markdown articles.
- `automation/keywords.json` is the publishing queue and durable keyword registry.
- `scripts/blog-publish.ts` owns locking, stage ordering, Git commit/push, deployment polling, rollback, and publication notifications.
- `scripts/generate-post.ts` only selects, generates, validates, and records one article locally.
- `scripts/search-console-report.ts` ingests Search Console data and is repository read-only unless `--update-keywords` is passed.
- `scripts/evergreen-refresh.ts` ranks published pages from Search Console performance, freshness, and cluster-link gaps; only explicit apply mode changes articles.
- `scripts/research/` collects Google SERP competitors through Serper, crawls permitted pages through Crawl4AI, and produces deterministic evidence and content briefs without an LLM.
- `scripts/sync-topic-clusters.ts` updates pillars, related links, and the roadmap after generation.
- `~/.hermes/logs/safeunfollow/` contains JSON Lines operational logs.

The LLM generates only the article body. Code generates `title`, `description`, `date`, `slug`, and `keywords` frontmatter. The blog page renders the frontmatter title as the article's only H1.

## Workflow

```text
Publication lock + clean worktree
→ Search Console refresh (`--update-keywords`)
→ SEO registry/cluster commit + push (when changed)
→ registry-selected article generation + validation
→ pillar/related-link/roadmap sync
→ one publication-state commit + push
→ Vercel deployment check
→ Telegram publication notification
```

The first unpublished keyword whose slug does not already exist is selected. Existing articles are never overwritten. Registry, article, pillar, related-link, and roadmap changes are committed together. A failure before that commit restores tracked files and removes pipeline-created untracked files. A push or deployment failure leaves a clean, durable local commit. The next run pushes a pending publication commit and exits without generating a second article.

The standalone report remains available for diagnostics:

```text
Search Console performance data
→ Weekly SEO report
→ Opportunity detection
→ Optional keyword registry update only with `--update-keywords`
→ Optional Telegram recommendations only with `--telegram`
```

Evergreen refresh is a separate, non-publishing workflow. It reuses the publication lock only while article changes are applied, so it cannot overlap `blog:publish`:

```text
Search Console page/query-page data
→ deterministic candidate scoring
→ refresh-candidates.json + refresh-roadmap.md
→ explicit apply with shared lock + clean-tree check
→ policy/link validation + success-only Telegram summary
```

## Environment variables

Copy the relevant values from `.env.local.example` into `.env.local` on the automation host.

| Variable | Required | Purpose |
| --- | --- | --- |
| `KV_REST_API_URL` | Application runtime and Redis operations | Upstash Redis REST endpoint |
| `KV_REST_API_TOKEN` | Application runtime and Redis operations | Upstash Redis REST token; keep server-side only |
| `OPENROUTER_API_KEY` | Yes | OpenRouter generation API key |
| `SAFEUNFOLLOW_BLOG_MODEL` | No | Primary model; defaults to `google/gemini-2.5-flash` |
| `SAFEUNFOLLOW_BLOG_URL` | No | Public blog base URL |
| `SAFEUNFOLLOW_CTA_URL` | No | Product CTA target used by the prompt |
| `SAFEUNFOLLOW_GIT_REMOTE` | No | Git remote; defaults to `origin` |
| `SAFEUNFOLLOW_GIT_BRANCH` | No | Push branch; defaults to `main` |
| `SAFEUNFOLLOW_DEPLOY_ATTEMPTS` | No | Maximum deployment URL checks |
| `SAFEUNFOLLOW_DEPLOY_INTERVAL_MS` | No | Delay between deployment checks |
| `TELEGRAM_BOT_TOKEN` | Recommended | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Recommended | Telegram destination chat |
| `GOOGLE_CLIENT_EMAIL` | SEO report | Service-account email |
| `GOOGLE_PRIVATE_KEY` | SEO report | Service-account private key; literal `\n` is accepted |
| `GOOGLE_SITE_URL` | No | Exact Search Console property; defaults to `https://safeunfollow.com/` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Alternative | Absolute path to a service-account JSON key |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Alternative | Complete service-account JSON injected by a secret manager |
| `SERPER_API_KEY` | Research live run | Server-side Serper key used to retrieve Google organic results; never prefix it with `NEXT_PUBLIC_` |
| `SERPER_API_URL` | No | SERP endpoint; defaults to `https://google.serper.dev/search` |
| `CRAWL4AI_BASE_URL` | Full research run | Reachable Crawl4AI service base URL without `/crawl`; defaults to `http://localhost:11235` |
| `CRAWL4AI_API_KEY` | Service-dependent | Optional secret sent as `X-API-Key`; leave unset for an unauthenticated local service |
| `RESEARCH_USER_AGENT` | No | Explicit crawler identity; defaults to the SafeUnfollow research bot URL |

Git credentials must already permit a non-interactive push to the configured remote. Vercel should remain connected to the GitHub branch; no direct Vercel credential is needed.

### Redis operations

Redis remains the operational source for Premium entitlement, Dodo subscription ID, renewal date, cancellation OTP state, OTP throttling, the Premium-check rate limit, and renewal-reminder deduplication. Browser-side uploads, parsing, snapshots, history comparison, and CSV generation use local storage and do not send Instagram export data to Redis.

| Key pattern | Data and lifecycle |
| --- | --- |
| `premium:<email>` | Premium entitlement; no TTL |
| `subscription_id:<email>` | Dodo subscription ID used for cancellation; no TTL |
| `renewal_date:<email>` | Renewal date used by reminder processing; no TTL |
| `cancel_token:<email>` | Six-digit cancellation OTP; 15-minute TTL |
| `otp_fail:<email>` | Failed OTP counter; 15-minute window |
| `otp_send:<identifier>` | Per-IP and per-email send counter; 60-second window |
| `ratelimit:<ip>` | Premium-check counter; 60-second window |
| `reminder_sent:<email>:<renewal-date>` | Renewal reminder deduplication marker; expires no earlier than 24 hours |

The required variables are `KV_REST_API_URL` and `KV_REST_API_TOKEN`. The same values must be configured for each Vercel environment that serves the application. They are server credentials and must never use a `NEXT_PUBLIC_` prefix.

Check configuration and connectivity from the repository root:

```bash
npm run redis:health
```

The command loads `.env.local` and then `.env`, validates both variables, sends `PING`, and exits nonzero on a missing variable, authentication error, archived database, or network failure. It does not read or change application keys.

Send a manual activity ping with:

```bash
npm run redis:ping
```

This command also reads or writes no application key. It records command activity at that moment, but it is not an availability guarantee or a substitute for monitoring or an appropriate production plan. No Redis cron is registered by this repository.

Run the Redis monitor manually with:

```bash
npm run redis:monitor
```

The monitor sends `PING`, prints the health result and UTC timestamp to stdout, and sends the same result to Telegram when both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured. A healthy result starts with `✅ SafeUnfollow Redis healthy`. A missing Redis variable, connection/authentication failure, archived database, or unexpected response starts with `❌ SafeUnfollow Redis unhealthy` and includes a concise reason. Unhealthy Redis and Telegram delivery failures exit nonzero so cron can record the failure. Missing Telegram variables only produce a console warning; the Redis result is still printed, and a healthy Redis check still exits successfully.

For a weekly Monday 10:00 check in the machine's local timezone, the recommended cron entry is:

```cron
0 10 * * 1 cd /Users/jeongjaelee/Desktop/github/instagram-unfollow-tracker && npm run redis:monitor >> /Users/jeongjaelee/.hermes/logs/safeunfollow/redis-monitor.log 2>&1
```

Create the log directory before registering that entry. This repository does not install or modify the crontab; register it manually only after verifying `npm run redis:monitor` with the intended runtime environment.

### Weekly Growth Dashboard

Generate the consolidated read-only operations and growth report with:

```bash
npm run growth:report
```

This reads Search Console, content frontmatter, topic-cluster and Evergreen inventories, Research artifacts, operational logs, and Redis `PING` status. It does not update SEO registries, content, Research, Redis keys, billing, payment, or the publish flow. It writes only these report artifacts:

- `automation/weekly-growth-report.md`
- `automation/weekly-growth-report.json`
- `reports/weekly/YYYY-WW.md`

The current JSON file is the comparison baseline for the next execution. If Search Console is unavailable, the report is still generated with `Not Available` metrics and an unhealthy Search Console status. Premium subscription, renewal, and cancellation counts remain `Not Available` until a read-only weekly billing event ledger exists; current Redis entitlement keys are not treated as historical billing events.

Generate the same files and send the concise Telegram summary with:

```bash
npm run growth:weekly
```

`growth:weekly` requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. The rule engine recommends title improvements below 2% CTR, refreshes for positions 8–20, internal links for orphan pages, and review when Evergreen candidates exist. System health reports Cron evidence, Redis, Research, Publish, and Search Console as healthy, warning, or unhealthy. Cron health is inferred from recent operational log activity and does not claim that crontab registration was directly verified.

Upstash documents that inactive Free databases may be archived after a minimum of 14 days. For an archived database:

1. Open the Upstash Console from the Vercel Marketplace integration and locate the archived database backup.
2. Create a replacement database and restore the archived backup into it. Follow the current [Upstash archive guidance](https://upstash.com/docs/redis/help/faq) and [backup/restore procedure](https://upstash.com/docs/redis/features/backup); restoring into a target replaces that target's existing data.
3. Reconnect the replacement database to the Vercel project or update `KV_REST_API_URL` and `KV_REST_API_TOKEN` in every affected environment.
4. Create a new deployment. Vercel environment-variable changes do not alter previous deployments.
5. Run `npm run redis:health` with the replacement credentials, then verify Premium check, cancellation-code delivery, and webhook processing in the target environment.
6. Reconcile recent subscription events against Dodo Payments and replay missed webhooks where supported, because an outage can leave Premium, subscription ID, or renewal keys behind the payment provider's state.

### Google Search Console authentication

1. In Google Cloud, create or select a project and enable the **Google Search Console API**.
2. Create a service account and a JSON key. Keep the downloaded key outside the repository.
3. In Search Console, select the exact `https://safeunfollow.com/` property, then open **Settings → Users and permissions → Add user**.
4. Add the JSON key's `client_email` as a user. Restricted access is sufficient for this read-only report; full access also works.
5. Configure one credential method:
   - Set `GOOGLE_CLIENT_EMAIL` to `client_email` and `GOOGLE_PRIVATE_KEY` to `private_key`. When the environment stores a key on one line, preserve its literal `\n` sequences.
   - Or set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of the uncommitted JSON key file.
   - Or inject the complete JSON object through `GOOGLE_SERVICE_ACCOUNT_JSON`.
6. Set `GOOGLE_SITE_URL=https://safeunfollow.com/`. It must exactly match the URL-prefix property in Search Console, including the trailing slash. A domain property would instead use the `sc-domain:safeunfollow.com` form.

The report requests only the `webmasters.readonly` OAuth scope. Never commit the private key or JSON key file.

## Validation rules

Before a commit, every generated post must have:

- exactly one rendered H1 (the frontmatter title, with no H1 in the body);
- at least two H2 headings and an H2 FAQ section;
- valid YAML with `title`, `description`, `date`, `slug`, and a non-empty `keywords` array;
- a meta description of no more than 160 characters;
- the exact keyword in the first 100 body words;
- a natural SafeUnfollow mention;
- No Login, No OAuth, No API, Privacy, Instagram Data Download, and Upload ZIP messaging;
- a linked, action-oriented CTA to SafeUnfollow;
- none of the banned phrases defined in the script's central `CONFIG` section.

Validation failure deletes the newly generated draft, records the reasons, sends Telegram details, and exits nonzero without committing or pushing.

## Manual execution

Install dependencies, ensure the working branch is correct, then run:

```bash
npm ci
npm run blog:publish
```

There is no keyword argument. Selection always comes from the registry so cron and manual runs use identical state transitions. `npm run seo:weekly` is an alias of this same entrypoint. Use `npm run blog:publish -- --dry-run` to verify entrypoint and lock wiring without changing files, Git, or network services.

## Cron schedule

Run from the repository root. The TypeScript entrypoint has its own atomic process lock, so cron and manual runs cannot overlap:

```cron
0 9 * * 1 cd /absolute/path/to/instagram-unfollow-tracker && git pull --ff-only && npm run blog:publish >> ~/.hermes/logs/safeunfollow/cron.log 2>&1
```

Confirm the paths to `git` and `npm` on the cron host. Cron must have access to the environment file, Git credentials, DNS, Google Search Console, OpenRouter, GitHub, the deployed site, and Telegram.

If an external Python scheduler must remain, reduce it to process invocation only:

```python
from pathlib import Path
import subprocess

repository = Path("/absolute/path/to/instagram-unfollow-tracker")
subprocess.run(["git", "pull", "--ff-only"], cwd=repository, check=True)
subprocess.run(["npm", "run", "blog:publish"], cwd=repository, check=True)
```

The Python wrapper must not select keywords, validate content, commit or push Git changes, or send Telegram messages. Scheduling stays in cron. For an Asia/Seoul host, `0 9 * * 1` means Monday 09:00 KST. No crontab is modified by this repository.

## Adding keywords

Append an object to `automation/keywords.json`:

```json
{
  "keyword": "your target keyword",
  "slug": "your-target-keyword",
  "published": false,
  "published_at": null,
  "last_attempt": null
}
```

Keep keywords in the desired publication order. Slugs must be unique and should contain lowercase ASCII letters, numbers, and hyphens. Commit registry additions before the next cron run.

Search Console candidates use `source: "search_console"` and include discovery and performance fields. Matching is case-insensitive and whitespace-normalized, so existing keywords are not duplicated. `npm run seo:report` never changes repository files. The weekly publication entrypoint explicitly requests keyword updates and commits/pushes them before generation.

Audit registry/content consistency without writing, or explicitly reconcile existing Markdown files:

```bash
npm run blog:reconcile
npm run blog:reconcile -- --write
```

## Search Console weekly report

Run a read-only console report for the last 28 complete Search Console days:

```bash
npm run seo:report
```

Explicitly update the registry outside the weekly publication flow only for maintenance:

```bash
npm run seo:report -- --update-keywords
```

The report queries summary, `query`, `page`, and `query + page` dimensions. It prints total clicks, impressions, CTR, average position, the top 10 queries by impressions, top 10 pages by clicks, opportunities, and 5–10 keyword recommendations.

An opportunity must have at least 20 impressions, CTR below 2%, and average position from 5 through 30. These queries are candidates for title/meta improvements, new articles, or internal links. Search Console returns CTR as a ratio; the registry stores that original ratio while reports display percentages.

Structured results are appended to `~/.hermes/logs/safeunfollow/search-console.log`. Every JSON Lines record contains timestamp, stage, status, date range, query/page counts, and errors.

## Evergreen refresh engine

Generate the refresh plan from the last 28 complete Search Console days:

```bash
npm run refresh:plan
```

This reads `automation/keywords.json`, `automation/topic-clusters.json`, and published Markdown without changing them. It writes only the two review artifacts:

- `automation/refresh-candidates.json` — machine-readable metrics, score breakdown, reasons, and proposed changes.
- `automation/refresh-roadmap.md` — operator-readable ranked roadmap.

Use `npm run refresh:plan -- --dry-run` to calculate and print candidates without writing even the reports. Candidate priority combines:

- impressions with average position 8–30 (up to 35 points);
- CTR below 2% (up to 25 points);
- age of at least 180 days (up to 20 points);
- missing pillar link, fewer than two related links, and no inbound links (up to 20 points).

The minimum candidate score is 20. Search Console page metrics are preferred; query-page rows provide the target query and a metric fallback.

Review and commit the generated plan before applying it, because actual apply requires a clean worktree. Preview the top candidate without changing files:

```bash
npm run refresh:apply -- --limit=1 --dry-run
```

Apply an approved candidate:

```bash
npm run refresh:apply -- --limit=1
```

Apply defaults to one article. It uses the same atomic lock as `blog:publish`, rejects a dirty worktree, prints semantic and before/after line summaries, and rolls article writes back if a write fails. The deterministic update writes the proposed title and description to frontmatter, adds an `updated` date, inserts current privacy positioning, enriches an existing FAQ without duplicating generated questions, canonicalizes pillar links to `/pillars/<slug>`, and rebuilds Related Articles from same-cluster posts plus reviewed fallback recommendations. Known stale instructions are replaced with Accounts Center, variable export-preparation time, and intact Instagram Data ZIP wording. Validation rejects banned phrases, missing No Login/No OAuth/no Instagram API/No Account Connection/Instagram Data ZIP/Zero Ban Risk/Privacy First positioning, overlong descriptions, non-canonical or missing pillar links, missing FAQ or related sections, and broken internal links.

Dry-run reports each candidate as `CHANGED` with field/section details or `NO-OP` with the reason. A no-op can be expected when the generated SEO proposal is already present but Search Console performance signals still keep the article in the candidate list. Non-dry-run apply skips no-op files.

Telegram is sent only after a non-dry-run apply succeeds. The engine does not commit or push; inspect the diff, run the normal validation commands, and commit the approved content change manually. `npm run refresh:weekly` is a plan-only alias suitable for a separate scheduled review job.

## Research intelligence engine

The Sprint 6 research layer is independent from publication, refresh, billing, payment, parsing, and the application UI. It does not call an LLM and never invokes `blog:publish`. Its pipeline is:

```text
Search Console keyword registry and metrics
→ deterministic keyword prioritization
→ Google organic SERP through Serper
→ robots.txt permission and crawl-delay check
→ top five external results through Crawl4AI
→ evidence extraction and competitor analysis
→ JSON/Markdown research artifact
→ deterministic Markdown content brief
```

### Real API test setup

The two supported readiness levels are intentionally different:

- **Serper only:** set `SERPER_API_KEY`. A dry-run can verify keyword parsing, selection, and output paths without network calls or file writes. A live run can query Serper, but it cannot create a research artifact or content brief without Crawl4AI; it exits with setup guidance instead of a generic no-evidence error.
- **Serper + Crawl4AI:** set `SERPER_API_KEY` and point `CRAWL4AI_BASE_URL` at a reachable service. This is the required setup for a complete live run. Set `CRAWL4AI_API_KEY` only if that Crawl4AI deployment expects `X-API-Key` authentication.

Run the first real test in this order:

1. Install the pinned Node dependencies with `npm ci`.
2. Copy the research variables from `.env.local.example` into the uncommitted root `.env.local`, then replace `SERPER_API_KEY` with a real key.
3. Verify CLI selection without calling either API:

   ```bash
   npm run research:keyword -- "instagram unfollow limit" --dry-run
   ```

4. Start a compatible local Crawl4AI container (use version 0.8.6 or a later security-reviewed release, and pin the reviewed image in production), then verify its health endpoint:

   ```bash
   docker run -d --name safeunfollow-crawl4ai -p 11235:11235 --shm-size=1g unclecode/crawl4ai:0.8.6
   curl --fail http://localhost:11235/health
   ```

5. Keep `CRAWL4AI_BASE_URL=http://localhost:11235` for that container and run the live keyword test:

   ```bash
   npm run research:keyword -- "instagram unfollow limit"
   ```

The dry-run prints the normalized keyword and planned `research/<slug>.json` path. It does not validate API credentials or connectivity. The live run calls Serper, checks each result's `robots.txt`, calls Crawl4AI, then writes the JSON/Markdown evidence and `automation/content-briefs/<slug>.md`. Add `--force` after the keyword to bypass a fresh seven-day cache:

```bash
npm run research:keyword -- "instagram unfollow limit" --force
```

Other entrypoints are:

```bash
npm run research
npm run research:keyword -- "instagram unfollow limit"
npm run research:brief
```

`npm run research` selects one keyword from `automation/keywords.json`. Unpublished entries are preferred, then Search Console impressions, CTR opportunity, and average position 5–30 determine priority. `research:keyword` bypasses selection. `research:brief` rebuilds briefs from existing JSON evidence without SERP or crawl requests; pass a keyword after `--` to rebuild only one.

Use `--dry-run` for a read-only plan, `--force` to bypass a fresh cache, and `RESEARCH_USER_AGENT` to identify the crawler operator. The default cache TTL is seven days. A fresh `research/<slug>.json` is reused; the companion `research/<slug>.md` and `automation/content-briefs/<slug>.md` are restored from cached evidence if missing.

Each normalized keyword has an atomic lock under the operating system temporary directory. Concurrent research for the same keyword fails immediately, while different keywords may run independently. Dead-process lock files are replaced safely.

Before Crawl4AI is called, the engine requests each origin's `robots.txt` with the configured User-Agent. Specific bot groups take precedence over `*`; `Allow`, `Disallow`, and `Crawl-delay` are enforced. Pages are crawled sequentially, request timeouts default to 30 seconds, and HTTP 429 responses retry up to three attempts using `Retry-After` or exponential backoff. A failed or disallowed competitor is skipped; the run fails if no source yields evidence.

The JSON evidence schema is versioned and records the keyword, slug, generation/expiry times, SERP positions and questions, plus every source's URL, crawl time, title, description, summary, H1/H2 headings, FAQ questions, JSON-LD types/raw values, same-origin links, last-updated value, canonical URL, word count, and SEO observations. Aggregate competitor analysis records common and missing topics, average word count, FAQ coverage, and schema coverage.

The content brief schema is also versioned. Its Markdown sections are Search Intent, Competitor Summary, Missing Topics, Suggested Outline, Suggested FAQ, Suggested Internal Links, Suggested Title, and Suggested Description. Article generation is intentionally not wired to the brief in this sprint; a later generation change should consume only this brief, never raw SERP responses.

For a compatible hosted Crawl4AI deployment, set `CRAWL4AI_BASE_URL` to its documented base URL and set `CRAWL4AI_API_KEY` if required. For self-hosting, keep the default base URL; the engine uses `/crawl` with `BrowserConfig` and `CrawlerRunConfig`, disables Crawl4AI's own cache, sends the explicit User-Agent, and sets the page timeout.

## Publishing lifecycle

1. Acquire the shared lock and reject a dirty worktree.
2. Push a clean pending automation commit left by an earlier push interruption.
3. Refresh Search Console data with explicit write mode; commit and push SEO registry/cluster changes.
4. Select the first unpublished, non-duplicate registry entry.
5. Generate the body and frontmatter, then run SEO validation.
6. Mark the entry published and run cluster, pillar, related-link, and roadmap sync.
7. Commit and push all publication state together.
8. Poll the public article URL and send the Telegram result.

Logs are JSON Lines records in `generation.log`, `validation.log`, and `publish.log`. Generation/validation records include keyword and duration; orchestrator records include timestamp, stage, status, and error.

`content/blog/index.md` is not generated because the `/blog` UI reads article files directly. `npm run clusters:sync -- --navigation` is the explicit opt-in if a standalone Markdown navigation artifact is needed later. Pillar links use their canonical `/pillars/<slug>` routes.

## Recovery procedure

- **Generation, validation, sync, or pre-commit failure:** The orchestrator restores its tracked changes and removes its newly created files. The keyword stays unpublished and the worktree stays clean.
- **Git commit failure:** The same rollback runs. Inspect the error, correct Git configuration or hooks, and rerun.
- **Git push failure:** The completed commit remains local with a clean worktree. Restore network/authentication and rerun; pending commits are pushed before new work starts.
- **Deployment failure:** The push already succeeded. Inspect the Vercel deployment, fix or redeploy it, then verify the article URL manually. Registry state is already published.
- **Telegram failure:** Publication may already be complete. Use `publish.log`, the Git commit, and the public URL to confirm before rerunning.
- **Search Console credential failure:** Confirm that both direct credential variables are set together, or that `GOOGLE_APPLICATION_CREDENTIALS` points to a readable JSON file. Then verify the service-account email is a Search Console property user.
- **Search Console API failure:** Confirm the API is enabled, `GOOGLE_SITE_URL` exactly matches the property, and inspect `search-console.log`. A standalone report only fails itself; the weekly entrypoint aborts before generation and restores uncommitted SEO changes.
- **Lock contention:** Another cron or manual publication is active. Let it finish. A lock owned by a dead PID is removed automatically on the next run.

## Troubleshooting

- **No unpublished keywords remaining:** Add a registry entry, or correct an entry deliberately if its article was never published.
- **Slug skipped:** A matching file already exists under `content/blog/`; duplicate protection intentionally advances to the next entry.
- **Meta description too long:** Shorten the configured description template or keyword.
- **Missing product messaging or CTA:** Inspect `validation.log`; update the generation prompt or retry the unpublished keyword.
- **Deployment timeout:** Increase the deployment attempts/interval, then inspect Vercel. Do not assume a timeout means the Git push failed.
- **No Telegram message:** Verify both Telegram variables and that the bot can post to the configured chat.
- **Search Console 403:** The service account lacks property access, the API is disabled, or the configured site URL does not match the property.
- **Empty Search Console report:** New properties can have no rows for the selected period. The script still emits a zero-value report and does not fabricate opportunities.
- **Private key parse/authentication error:** Preserve the full PEM header/footer and either real newlines or literal `\n` sequences.

For application development, use `npm run dev`, `npm run lint`, and `npm run build`.
