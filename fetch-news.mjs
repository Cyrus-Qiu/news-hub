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

const aiPattern = /\b(ai|artificial intelligence|machine learning|deep learning|llm|language model|foundation model|generative|chatgpt|openai|anthropic|claude|gemini|grok|deepseek|hugging face|transformer|diffusion|inference|reasoning model)\b|人工智能|大模型|生成式|多模态|智能体/i;
const rules = [
  ['AI编程', /\b(coding agent|code generation|developer tool|software engineer|programming|coding|developer|api|sdk|cli|ide|github|copilot|codex|cursor|mcp|agent framework|vibe coding|typescript|javascript|python|repository)\b|编程|代码生成|开发者|开发工具|智能编程|代码助手/i],
  ['基础设施', /\b(gpu|accelerator|inference|serving|runtime|cloud|serverless|edge|database|vector database|data center|deployment|kubernetes|observability|semiconductor|chip)\b|推理服务|云计算|服务器|数据中心|芯片|半导体|部署/i],
  ['开源', /\b(open source|open-source|github|hugging face|weights|repository|apache|mit license)\b|开源|开放权重/i],
  ['AI研究', /\b(research|paper|benchmark|evaluation|alignment|safety|interpretability|training|reasoning|robotics)\b|研究|论文|基准测试|对齐|安全|训练|推理/i],
  ['AI模型', /\b(model|chatgpt|claude|gemini|grok|deepseek|llm|multimodal|foundation model)\b|模型|大模型|多模态/i],
  ['AI产品', /\b(product|launch|feature|assistant|agent|search|browser|workspace)\b|产品|功能|助手|智能体/i],
  ['行业动态', /\b(startup|funding|acquisition|partnership|regulation|policy|copyright|enterprise|revenue)\b|融资|收购|合作|监管|政策|版权|企业/i]
];

function classify(title, summary, source) {
  const text = `${title} ${summary}`;
  for (const [category, pattern] of rules) if (pattern.test(text)) return category;
  return source.category;
}

function isRelevant(title, summary, source) {
  return source.dedicatedAI || aiPattern.test(`${title} ${summary}`);
}

const normalizedTitle = title => title.toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '')
  .replace(/(最新|突发|快讯|独家|视频|组图)/g, '')
  .slice(0, 80);

function parse(xml, source) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 50).map(block => {
    const title = field(block, ['title']);
    const url = linkOf(block);
    const rawSummary = field(block, ['description', 'summary', 'content:encoded', 'content']);
    const summary = cleanSummary(rawSummary, title);
    const date = new Date(field(block, ['pubDate', 'published', 'updated', 'dc:date']));
    if (!title || !url || !isRelevant(title, summary, source)) return null;
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
