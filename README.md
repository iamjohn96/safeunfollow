# SafeUnfollow

SafeUnfollow is a Next.js application with a cron-compatible SEO publishing pipeline. `npm run blog:publish` is the only weekly publication entrypoint and owns the complete state transition.

## Architecture

- `app/` contains the Next.js application and Markdown blog renderer.
- `content/blog/` contains published Markdown articles.
- `automation/keywords.json` is the publishing queue and durable keyword registry.
- `scripts/blog-publish.ts` owns locking, stage ordering, Git commit/push, deployment polling, rollback, and publication notifications.
- `scripts/generate-post.ts` only selects, generates, validates, and records one article locally.
- `scripts/search-console-report.ts` ingests Search Console data and is repository read-only unless `--update-keywords` is passed.
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

## Environment variables

Copy the relevant values from `.env.local.example` into `.env.local` on the automation host.

| Variable | Required | Purpose |
| --- | --- | --- |
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

Git credentials must already permit a non-interactive push to the configured remote. Vercel should remain connected to the GitHub branch; no direct Vercel credential is needed.

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
