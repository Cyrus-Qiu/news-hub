# 上传和发布步骤

1. 解压 `news-hub-github-pages.zip`。
2. 打开 <https://github.com/Cyrus-Qiu/news-hub>。
3. 点击 **Add file → Upload files**。
4. 将解压目录中的全部文件和文件夹拖入上传区域，包括 `.github` 文件夹。
5. 在页面底部填写提交说明，例如 `Deploy news hub`，点击 **Commit changes**。
6. 打开仓库的 **Actions** 页面，等待 `Deploy GitHub Pages` 变为绿色。
7. 部署地址通常为：<https://cyrus-qiu.github.io/news-hub/>

如果第一次运行提示 Pages 尚未启用，请进入 **Settings → Pages**，将 Source 设为 **GitHub Actions**，然后回到 Actions 重新运行工作流。
