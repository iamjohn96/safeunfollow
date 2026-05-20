import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: '.env.local' });

const keyword = process.argv[2];
if (!keyword) {
  console.error('Usage: npx ts-node --project tsconfig.json scripts/generate-post.ts "your keyword"');
  process.exit(1);
}

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Error: OPENROUTER_API_KEY not set in .env.local');
  process.exit(1);
}

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
  'mistralai/mistral-7b-instruct:free',
];

async function callAPI(model: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://safeunfollow.com',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: "You are an SEO content writer for SafeUnfollow.com, a privacy-first Instagram unfollow tracker. Write a 600-800 word blog post in markdown format. Include frontmatter with: title, description, date (today's date in YYYY-MM-DD), slug (from the keyword), keywords (array). The post should naturally mention SafeUnfollow.com as the recommended tool, target the provided keyword, include 2-3 H2 sections, and include a FAQ section. Return ONLY the raw markdown including frontmatter. No extra explanation, no code fences.",
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
  console.log(`��� Post saved: ${outputPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
