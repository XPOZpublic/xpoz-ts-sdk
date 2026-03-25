import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as tools from '../config/tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typesDir = resolve(__dirname, '..', 'types');

function extractInterfaceFields(filePath: string): Record<string, string[]> {
  const content = readFileSync(filePath, 'utf-8');
  const result: Record<string, string[]> = {};

  const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match;

  while ((match = interfaceRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    const fields: string[] = [];

    const fieldRegex = /^\s+(\w+)\??:/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push(fieldMatch[1]);
    }

    if (fields.length > 0) {
      result[name] = fields.sort();
    }
  }

  return result;
}

const toolNames = Object.values(tools).filter((v): v is string => typeof v === 'string').sort();

const twitterInterfaces = extractInterfaceFields(resolve(typesDir, 'twitter.ts'));
const instagramInterfaces = extractInterfaceFields(resolve(typesDir, 'instagram.ts'));
const redditInterfaces = extractInterfaceFields(resolve(typesDir, 'reddit.ts'));

let tiktokInterfaces: Record<string, string[]> = {};
try {
  tiktokInterfaces = extractInterfaceFields(resolve(typesDir, 'tiktok.ts'));
} catch {
  tiktokInterfaces = {};
}

const fields: Record<string, string[]> = {
  'twitter.user': twitterInterfaces['TwitterUser'] || [],
  'twitter.tweet': twitterInterfaces['TwitterPost'] || [],
  'instagram.user': instagramInterfaces['InstagramUser'] || [],
  'instagram.post': instagramInterfaces['InstagramPost'] || [],
  'instagram.comment': instagramInterfaces['InstagramComment'] || [],
  'reddit.user': redditInterfaces['RedditUser'] || [],
  'reddit.post': redditInterfaces['RedditPost'] || [],
  'reddit.comment': redditInterfaces['RedditComment'] || [],
  'reddit.subreddit': redditInterfaces['RedditSubreddit'] || [],
};

if (tiktokInterfaces['TiktokUser']) {
  fields['tiktok.user'] = tiktokInterfaces['TiktokUser'];
}
if (tiktokInterfaces['TiktokPost']) {
  fields['tiktok.post'] = tiktokInterfaces['TiktokPost'];
}
if (tiktokInterfaces['TiktokComment']) {
  fields['tiktok.comment'] = tiktokInterfaces['TiktokComment'];
}

const expectations = {
  sdk: '@xpoz/xpoz (TypeScript)',
  version: 'auto-generated',
  generatedAt: new Date().toISOString().split('T')[0],
  tools: toolNames,
  fields,
};

console.log(JSON.stringify(expectations, null, 2));
