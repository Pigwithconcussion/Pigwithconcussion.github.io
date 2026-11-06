# patrick

[个人网站](https://pigwithconcussion.github.io/) · [简体中文](https://pigwithconcussion.github.io/zh-CN/) · [English](https://pigwithconcussion.github.io/en-US/)

Patrick Zhao 的个人站，收录公开项目、硬件阅读和学习笔记。DuBand 卡片指向百度开源项目的分叉。

## 本地预览

双击 `index.html`，或运行 `node server.mjs` 后访问 `http://127.0.0.1:4173`。无需安装依赖。

## 更新网站

在 `index.html` 维护卡片链接，在 `languages.js` 更新翻译，在 `config.js` 设置头像和 GitHub 账号。向 `main` 推送后，GitHub Actions 运行 `node build.mjs`，并将静态文件部署到 GitHub Pages。

页面布局参考 [Darren You 的个人站](https://darrenyou.com/en-US)。星空、个人资料与项目内容在本仓库维护。
