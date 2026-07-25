import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const sources = JSON.parse(await fs.readFile(path.join(root, 'sources.json'), 'utf8'));
const output = path.join(root, 'data', 'news.json');

const decode = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/\s+/g, ' ').trim();

const cleanSummary = (value = '', title = '') => {
  let text = decode(value)
    .replace(/^(图片来源|图像来源|Image source|Photograph):?[^。.!！?？]{0,90}[。.!！?？]?\s*/i, '')
    .replace(/(点击查看大图|责任编辑：\S+|更多精彩内容请关注)[\s\S]*$/i, '')
    .trim();
  if (text.startsWith(title)) text = text.slice(title.length).replace(/^[：:，,\s-]+/, '');
  return text.length > 180 ? `${text.slice(0, 178).trim()}…` : text;
};

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
  return block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || '';
};

const rules = [
  ['AI', /\b(ai|artificial intelligence|machine learning|llm|chatgpt|openai|anthropic|grok|人工智能|大模型|智能体|生成式)\b/i],
  ['科技', /\b(technology|tech|semiconductor|chip|software|cyber|robot|nvidia|apple|google|microsoft|芯片|半导体|科技|互联网|机器人|网络安全)\b/i],
  ['财经', /\b(market|stock|bond|rate|inflation|tariff|oil|gold|bank|econom|finance|trade|市场|股市|利率|通胀|关税|原油|黄金|银行|经济|金融|贸易)\b/i],
  ['商业', /\b(business|company|startup|merger|acquisition|earnings|retail|企业|公司|创业|并购|财报|零售|消费)\b/i],
  ['国际', /\b(world|global|war|election|government|diplomacy|military|国际|全球|战争|选举|政府|外交|军事)\b/i]
];

function classify(title, summary, source) {
  const text = `${title} ${summary}`;
  for (const [category, pattern] of rules) if (pattern.test(text)) return category;
  return source.category;
}

const normalizedTitle = title => title.toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '')
  .replace(/(最新|突发|快讯|独家|视频|组图)/g, '')
  .slice(0, 80);

function parse(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 30).map(block => {
    const title = field(block, ['title']);
    const url = linkOf(block);
    const rawSummary = field(block, ['description', 'summary', 'content:encoded', 'content']);
    const summary = cleanSummary(rawSummary, title);
    const date = new Date(field(block, ['pubDate', 'published', 'updated', 'dc:date']));
    if (!title || !url) return null;
    return {
      id: crypto.createHash('sha1').update(url).digest('hex').slice(0, 12),
      title,
      summary,
      url,
      source: source.name,
      category: classify(title, summary, source),
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
      headers: {'user-agent': 'NewsHubRSS/1.1 (+https://cyrus-qiu.github.io/news-hub/)'}
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {source: source.name, items: parse(await response.text(), source)};
  } finally { clearTimeout(timer); }
}));

const successful = settled.filter(x => x.status === 'fulfilled').map(x => x.value);
const failed = settled.filter(x => x.status === 'rejected').map(x => String(x.reason?.message || x.reason));
let articles = successful.flatMap(x => x.items)
  .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));

const seenUrls = new Set();
const seenTitles = new Set();
articles = articles.filter(article => {
  const titleKey = normalizedTitle(article.title);
  if (seenUrls.has(article.url) || (titleKey.length > 10 && seenTitles.has(titleKey))) return false;
  seenUrls.add(article.url);
  if (titleKey.length > 10) seenTitles.add(titleKey);
  return true;
}).slice(0, 120);

if (!articles.length) {
  try {
    const old = JSON.parse(await fs.readFile(output, 'utf8'));
    if (old.articles?.length) articles = old.articles;
  } catch {}
}

await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, JSON.stringify({
  updatedAt: new Date().toISOString(),
  updateIntervalMinutes: 30,
  sources: successful.map(x => ({name: x.source, count: x.items.length})),
  failedCount: failed.length,
  articles
}, null, 2) + '\n');
console.log(`Wrote ${articles.length} articles from ${successful.length}/${sources.length} sources`);
