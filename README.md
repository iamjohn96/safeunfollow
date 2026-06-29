# SafeUnfollow

SafeUnfollow is a Next.js application with a cron-compatible SEO publishing pipeline. The pipeline turns a registered keyword into a validated Markdown article, commits and pushes it, waits for the Vercel URL to become available, and reports the result through Telegram.

## Architecture

- `app/` contains the Next.js application and Markdown blog renderer.
- `content/blog/` contains published Markdown articles.
- `automation/keywords.json` is the publishing queue and durable keyword registry.
- `scripts/generate-post.ts` owns generation, validation, Git publication, deployment polling, logging, and notifications.
- `scripts/search-console-report.ts` ingests Search Console performance data, finds SEO opportunities, and optionally enriches the keyword registry.
- `~/.hermes/logs/safeunfollow/` contains JSON Lines operational logs.

The LLM generates only the article body. Code generates `title`, `description`, `date`, `slug`, and `keywords` frontmatter. The blog page renders the frontmatter title as the article's only H1.

## Workflow

```text
Keyword registry
→ Gemini 2.5 Flash via OpenRouter
→ Markdown body + code-generated frontmatter
→ SEO validation
→ Git commit
→ GitHub push
→ Vercel deployment check
→ Telegram notification
```

The first unpublished keyword whose slug does not already exist is selected. Existing articles are never overwritten. After validation, the article is committed using `feat(blog): publish "<title>"` and pushed. Only after that push succeeds is the published registry state written and persisted in a small follow-up commit. A failed generation or validation never reaches Git. A failed push leaves the local commit intact for recovery.

Search Console intelligence is a separate feedback loop and does not change the publishing path:

```text
Search Console performance data
→ Weekly SEO report
→ Opportunity detection
→ Optional keyword registry update
→ Telegram recommendations
```

## Environment variables

Copy the relevant values from `.env.local.example` into `.env.local` on the automation host.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | OpenRouter generation API key |
| `SAFEUNFOLLOW_BLOG_MODEL` | No | Primary model; defaults to `google/gemini-2.5-flash` |
| `SAFEUNFOLLOW_BLOG_URL` | No | Public blog base URL |
| `SAFEUNFOLLOW_CTA_URL` | No | Product CTA target used by the prompt |
| `SAFEUNFOLLOW_GITHUB_REPOSITORY` | No | Repository identity for operations/documentation |
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

There is no keyword argument. Selection always comes from the registry so cron and manual runs use identical state transitions. If no eligible keywords remain, the command exits successfully and sends `No unpublished keywords remaining.`

## Cron schedule

Run from the repository root. This example publishes every Monday at 09:00 in the host timezone and uses a lock to prevent overlapping jobs:

```cron
0 9 * * 1 cd /absolute/path/to/instagram-unfollow-tracker && /usr/bin/flock -n /tmp/safeunfollow-blog.lock npm run blog:publish >> ~/.hermes/logs/safeunfollow/cron.log 2>&1
```

Confirm the paths to `npm` and `flock` on the cron host. Cron must have access to the environment file, Git credentials, DNS, OpenRouter, GitHub, the deployed site, and Telegram.

Run Search Console intelligence every Monday at 09:00 KST when the host cron uses its UTC+9 local timezone:

```cron
0 0 * * 1 cd /Users/jeongjaelee/Desktop/instagram-unfollow-tracker && npm run seo:weekly >> /Users/jeongjaelee/.hermes/logs/safeunfollow/search-console-cron.log 2>&1
```

The supplied expression itself runs at local midnight. Therefore it is Monday 09:00 KST only when the cron scheduler interprets the expression as UTC; for a host configured directly to Asia/Seoul, use `0 9 * * 1`. Verify the scheduler timezone rather than assuming it.

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

Search Console candidates use `source: "search_console"` and include discovery and performance fields. Matching is case-insensitive and whitespace-normalized, so existing keywords are not duplicated. `npm run seo:report` never changes the registry. `npm run seo:weekly` writes metric updates and new candidates to the working tree but does not create a Git commit; review and commit those changes explicitly.

## Search Console weekly report

Run a read-only console report for the last 28 complete Search Console days:

```bash
npm run seo:report
```

Run the automated report, Telegram summary, and registry enrichment:

```bash
npm run seo:weekly
```

The report queries summary, `query`, `page`, and `query + page` dimensions. It prints total clicks, impressions, CTR, average position, the top 10 queries by impressions, top 10 pages by clicks, opportunities, and 5–10 keyword recommendations.

An opportunity must have at least 20 impressions, CTR below 2%, and average position from 5 through 30. These queries are candidates for title/meta improvements, new articles, or internal links. Search Console returns CTR as a ratio; the registry stores that original ratio while reports display percentages.

Structured results are appended to `~/.hermes/logs/safeunfollow/search-console.log`. Every JSON Lines record contains timestamp, stage, status, date range, query/page counts, and errors.

## Publishing lifecycle

1. The first unpublished, non-duplicate entry is selected.
2. `last_attempt` is updated.
3. The body is generated with model fallback and retry handling.
4. Frontmatter is generated with the current local system date.
5. SEO QA runs before Git.
6. The article commit is pushed.
7. `published` and `published_at` are updated, committed, and pushed so registry state is durable across cron hosts.
8. The public article URL is polled until available.
9. Telegram receives title, keyword, slug, URL, short article commit, model, generation time, publication date, and the Search Console indexing action.

Logs are JSON Lines records in `generation.log`, `validation.log`, and `publish.log`. Every entry includes `timestamp`, `keyword`, `stage`, `duration_ms`, `status`, and `error`.

## Recovery procedure

- **Generation or validation failure:** Read the matching logs and Telegram reason. Fix configuration or prompt/rules as needed, then rerun. The keyword stays unpublished.
- **Git commit failure:** Inspect `git status`, resolve the reported repository problem, and rerun after ensuring no generated article will be overwritten.
- **Git push failure:** Restore network/authentication and run `git push origin HEAD:main` (adjust remote/branch if configured). The article or registry-state commit remains local; inspect `git log -2 --oneline` to see which phase failed. Do not regenerate the article.
- **Deployment failure:** The push already succeeded. Inspect the Vercel deployment, fix or redeploy it, then verify the article URL manually. Registry state is already published.
- **Telegram failure:** Publication may already be complete. Use `publish.log`, the Git commit, and the public URL to confirm before rerunning.
- **Search Console credential failure:** Confirm that both direct credential variables are set together, or that `GOOGLE_APPLICATION_CREDENTIALS` points to a readable JSON file. Then verify the service-account email is a Search Console property user.
- **Search Console API failure:** Confirm the API is enabled, `GOOGLE_SITE_URL` exactly matches the property, and inspect `search-console.log`. A reporting failure does not affect blog publishing.
- **Registry update recovery:** `seo:weekly` does not commit. Review `git diff -- automation/keywords.json`; keep and commit valid recommendations or restore that file manually before the next run.

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
