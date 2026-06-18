import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
if (!process.env.OPENROUTER_API_KEY) {
  dotenv.config({ path: '.env' });
}

const keyword = process.argv[2];
if (!keyword) {
  console.error('Usage: npx tsx scripts/generate-post.ts "your keyword"');
  process.exit(1);
}

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Error: OPENROUTER_API_KEY not set');
  process.exit(1);
}

const primaryModel = process.env.SAFEUNFOLLOW_BLOG_MODEL || 'google/gemini-2.5-flash';

const MODELS = [
  primaryModel,
  'google/gemini-2.5-flash',
  'openai/gpt-oss-120b:free',
].filter((model, index, arr) => model && arr.indexOf(model) === index);

async function callAPI(model: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://safeunfollow.com',
      'X-Title': 'SafeUnfollow Blog Automation',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2600,
      temperature: 0.55,
      messages: [
        {
          role: 'system',
          content: `You are the official SEO content writer for SafeUnfollow.com.

Write a 700-900 word blog post in raw markdown.

Return ONLY raw markdown.
Do not use code fences.
Do not add explanations outside the markdown.

Frontmatter must include:
title
description
date
slug
keywords

SafeUnfollow product facts:
- SafeUnfollow helps users check who unfollowed them on Instagram.
- SafeUnfollow does not require Instagram login.
- SafeUnfollow does not require account connection.
- SafeUnfollow does not use Instagram OAuth.
- SafeUnfollow does not use the Instagram API.
- Users request their Instagram data from Instagram.
- Users download the Instagram ZIP file.
- Users upload the downloaded Instagram data file to SafeUnfollow.
- SafeUnfollow analyzes followers and following data from that uploaded file.
- Premium is $3.99/month or $19.99/year.
- Premium includes unlimited snapshots, CSV export, and change history timeline.

Required usage flow:
1. Request Instagram data.
2. Download the Instagram ZIP file.
3. Upload the file to SafeUnfollow.
4. Review the results.

Required positioning:
- No Login Required
- No OAuth
- No API
- Zero Ban Risk
- Privacy First

Do not invent features.

Never say:
- connect your Instagram account
- log in with Instagram
- sign in with Instagram
- account syncing
- account linking
- 30 scans/month
- engagement score
- inactive follower alerts

The article should explain why the data-file method is safer than login-based unfollow tracker apps.
Include 2-4 H2 sections and a FAQ section.
Naturally mention SafeUnfollow.com as the recommended privacy-first option.`,
        },
        { role: 'user', content: keyword },
      ],
    }),
  });

  if (response.status === 429 || response.status === 503) {
    throw new Error(`RATE_LIMIT:${response.status}`);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API_ERROR:${response.status}:${err}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

async function main() {
  let content = '';

  for (const model of MODELS) {
    try {
      console.log(`⏳ Trying model: ${model}`);
      content = await callAPI(model);
      console.log(`✅ Got response from: ${model}`);
      break;
    } catch (e: any) {
      if (e.message.startsWith('RATE_LIMIT')) {
        console.log(`⏱ Rate limited on ${model}, waiting 15s...`);
        await new Promise(r => setTimeout(r, 15000));

        try {
          content = await callAPI(model);
          console.log(`✅ Got response from: ${model} (retry)`);
          break;
        } catch {
          console.log(`❌ Still failing, trying next model...`);
        }
      } else {
        console.log(`❌ ${model} failed: ${e.message}, trying next...`);
      }
    }
  }

  if (!content) {
    console.error('All models failed. Try again later.');
    process.exit(1);
  }

  content = content.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();

  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outputPath = path.join('content', 'blog', `${slug}.md`);

  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✅ Post saved: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
