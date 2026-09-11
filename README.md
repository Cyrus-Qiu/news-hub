# 讯息流 News Hub

面向 AI 与软件开发者的中文资讯聚合项目，聚焦硅谷前沿 AI、智能编程、开源项目、模型研究和基础设施动态。

- ChatGPT Sites：<https://briefing-news-hub.xrqiu.chatgpt.site/>
- GitHub Pages：<https://cyrus-qiu.github.io/news-hub/>

## 当前功能

- 每 30 分钟自动抓取和去重最新资讯
- 使用 DeepL API Free 将英文标题与摘要翻译为简体中文
- 保留英文原始标题与摘要，翻译失败时自动回退到英文
- 展示 BTC、ETH、纳斯达克、美元指数、WTI 原油和黄金等市场数据
- ChatGPT Sites 按需读取 GitHub 中生成的 JSON 数据
- DeepSeek 新闻总结、问答及单条新闻解读
- GitHub Trending 日榜、周榜和月榜，以及中文、英文项目筛选
- 读取公开 GitHub 仓库信息与 README，生成 AI 项目解读

## 新闻来源

当前接入以下公开 RSS / Atom 源：

| 来源 | 主要方向 | 默认分类 |
| --- | --- | --- |
| OpenAI News | 模型、产品与公司动态 | AI模型 |
| GitHub AI & ML | Copilot、开发工具与 AI 编程 | AI编程 |
| Hugging Face Blog | 开源模型、工具与社区 | 开源 |
| Google DeepMind | AI 研究与模型进展 | AI研究 |
| Vercel | AI 应用开发与前端基础设施 | AI编程 |
| Cloudflare Blog | AI 推理、云与边缘基础设施 | 基础设施 |
| TechCrunch AI | AI 创业、融资与行业动态 | 行业动态 |

对于 Vercel 和 Cloudflare 等非纯 AI 信息源，抓取程序会先进行关键词相关度过滤。

## 数据处理链路

1. GitHub Actions 按计划运行抓取程序。
2. `fetch-news.mjs` 读取 RSS / Atom，清洗摘要、分类、去重，并保留最多 120 条新闻。
3. 新增的英文新闻通过 DeepL 翻译；已翻译的文章会复用已有结果，避免重复消耗额度。
4. `fetch-markets.mjs` 从 CoinGecko 和 FRED 获取市场数据。
5. 结果写入 `data/news.json` 和 `data/markets.json`，再由 GitHub Pages 与 ChatGPT Sites 读取展示。
6. 单个数据源失败时自动跳过；严重失败时尽量保留上一次成功数据。

## 自动更新

工作流位于 `.github/workflows/update-news.yml`：

- 定时计划：每小时第 7 分钟和第 37 分钟运行
- 代码或数据源配置变更时自动运行
- 支持在 GitHub Actions 页面手动运行
- 数据发生变化后由 `github-actions[bot]` 自动提交

## 环境变量

GitHub 仓库需要配置以下 Actions Secret：

| 名称 | 用途 |
| --- | --- |
| `DEEPL_API_KEY` | 翻译新增英文新闻的标题与摘要 |

DeepSeek Key 配置在 ChatGPT Sites 的环境变量中，不保存在本仓库。

## 主要文件

| 文件 | 说明 |
| --- | --- |
| `sources.json` | 新闻源、语言和默认分类配置 |
| `fetch-news.mjs` | 新闻抓取、过滤、分类、去重与翻译 |
| `fetch-markets.mjs` | 市场数据抓取 |
| `.github/workflows/update-news.yml` | 定时更新工作流 |
| `data/news.json` | 自动生成的新闻数据 |
| `data/markets.json` | 自动生成的市场数据 |

## 数据与内容说明

本站只保存和展示公开信息源提供的标题、摘要、发布时间、来源及原文链接。阅读全文会跳转到原始网站；AI 生成内容仅用于辅助理解，重要信息请以原始报道和项目仓库为准。
