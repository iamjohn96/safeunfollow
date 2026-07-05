import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../lib/markdown-rendering';

test('renders article Markdown with semantic structure and section hooks', async () => {
  const rendered = await renderMarkdown(`## Main section

Short paragraph with **important positioning** and an [internal guide](/blog/guide).

1. Request the export.
2. Download the ZIP.

- No login
- No OAuth

## FAQ

### Does this access my account?

No. It avoids direct account access.

[Upload your Instagram data](https://safeunfollow.com/upload)

## Related Articles

- [Read the guide](/blog/guide)
`);

  assert.match(rendered, /<h2>Main section<\/h2>/);
  assert.match(rendered, /<ol>/);
  assert.match(rendered, /<ul>/);
  assert.match(rendered, /<strong>important positioning<\/strong>/);
  assert.match(rendered, /href="\/blog\/guide"/);
  assert.match(rendered, /class="markdown-faq-heading"/);
  assert.match(rendered, /class="markdown-faq-question"/);
  assert.match(rendered, /class="markdown-faq-answer markdown-inline-cta"><a href="https:\/\/safeunfollow\.com\/upload"/);
  assert.match(rendered, /class="markdown-faq-answer">No\. It avoids direct account access\.<\/p>/);
  assert.match(rendered, /class="markdown-related-heading"/);
  assert.match(rendered, /class="markdown-related-list"/);
});
