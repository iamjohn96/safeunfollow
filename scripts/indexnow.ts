// Usage:
//   npm run indexnow -- --all                 submit every URL in app/sitemap.ts
//   npm run indexnow -- <url> [<url> ...]     submit specific URLs
//   add --dry-run to print the payload without sending it
// Run only after the deploy that contains the changed pages (and the key file) is live.
import sitemap from '../app/sitemap';
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY_LOCATION, INDEXNOW_KEY, indexNowPayloads } from '../lib/indexnow';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const explicit = args.filter(arg => !arg.startsWith('--'));
  const urls = all ? sitemap().map(entry => entry.url) : explicit;

  if (urls.length === 0) {
    console.error('Pass --all or one or more URLs.');
    process.exit(1);
  }

  const payloads = indexNowPayloads(urls);
  if (payloads.length === 0) {
    console.error('No safeunfollow.com https URLs to submit.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(JSON.stringify(payloads, null, 2));
    return;
  }

  const keyCheck = await fetch(INDEXNOW_KEY_LOCATION);
  const served = (await keyCheck.text()).trim();
  if (!keyCheck.ok || served !== INDEXNOW_KEY) {
    console.error(`Key file not live at ${INDEXNOW_KEY_LOCATION} (status ${keyCheck.status}). Deploy first.`);
    process.exit(1);
  }

  for (const payload of payloads) {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    console.log(`IndexNow ${res.status} ${res.statusText}: ${payload.urlList.length} URLs`);
    if (res.status !== 200 && res.status !== 202) {
      console.error(await res.text());
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
