# 讯息流 News Hub

一个响应式中文新闻资讯聚合站，聚合国内、国际、科技、财经、AI 与商业资讯。

## 数据来源

当前接入以下公开 RSS：

- 人民网：全部新闻
- 中国新闻网：即时新闻
- BBC 中文
- The Guardian：World、Technology、Business

GitHub Actions 每 30 分钟运行一次 `fetch-news.mjs`，将去重后的最新 120 条新闻写入 `data/news.json`。网页只展示标题、摘要、时间和来源，阅读全文会跳转到原始媒体。

单个来源抓取失败时会自动跳过；如果全部来源失败，会保留上一次成功生成的数据。

## 更新与配置

- 新闻源配置：`sources.json`
- 抓取程序：`fetch-news.mjs`
- 定时任务：`.github/workflows/update-news.yml`
- 生成数据：`data/news.json`
