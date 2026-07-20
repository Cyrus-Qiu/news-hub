import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const sources = JSON.parse(await fs.readFile(path.join(root, 'sources.json'), 'utf8'));
const output = path.join(root, 'data', 'news.json');

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/\s+/g, ' ').trim();

const field = (block, tags) => {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (m) return decode(m[1]);
  }
  return '';
};

const linkOf = block => {
  const text = field(block, ['link']);
  if (/^https?:\/\//.test(text)) return text;
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["']/i);
  return href?.[1] || '';
};

function parse(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 30).map(block => {
    const title = field(block, ['title']);
    const url = linkOf(block);
    const summary = field(block, ['description', 'summary', 'content:encoded', 'content']);
    const dateText = field(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const date = new Date(dateText);
    if (!title || !url) return null;
    return {
      id: crypto.createHash('sha1').update(url).digest('hex').slice(0, 12),
      title,
      summary: summary.slice(0, 220),
      url,
      source: source.name,
      category: source.category,
      language: source.language,
      publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString()
    };
  }).filter(Boolean);
}

const settled = await Promise.allSettled(sources.map(async source => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {'user-agent': 'NewsHubRSS/1.0 (+https://cyrus-qiu.github.io/news-hub/)'}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {source: source.name, items: parse(await response.text(), source)};
  } finally { clearTimeout(timer); }
}));

const successful = settled.filter(x => x.status === 'fulfilled').map(x => x.value);
const failed = settled.filter(x => x.status === 'rejected').map((x, i) => String(x.reason?.message || x.reason || `source-${i}`));
let articles = successful.flatMap(x => x.items);
const seen = new Set();
articles = articles.filter(a => !seen.has(a.url) && seen.add(a.url))
  .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
  .slice(0, 120);

if (!articles.length) {
  try {
    const old = JSON.parse(await fs.readFile(output, 'utf8'));
    if (old.articles?.length) articles = old.articles;
  } catch {}
}

await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, JSON.stringify({
  updatedAt: new Date().toISOString(),
  sources: successful.map(x => ({name: x.source, count: x.items.length})),
  failedCount: failed.length,
  articles
}, null, 2) + '\n');
console.log(`Wrote ${articles.length} articles from ${successful.length}/${sources.length} sources`);
