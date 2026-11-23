# NeoForge 26.1 中文教程

面向模组开发新手的中文 NeoForge 26.1 教程。

在线访问：<https://neoforgetutorial.github.io/>

## 内容目录

- `tutorial/`：教程正文。
- `docs/`：中文参考文档。
- `tutorial/generatedimages/`：示例贴图与像素源稿。
- `official-docs/`：仅保存在本地，用于技术核对；不参与网站构建，也不上传至 GitHub。

## 本地预览

需要 Node.js 24。首次运行先安装依赖：

```powershell
npm ci
```

然后双击 `启动网站.cmd`，或执行：

```powershell
npm start
```

网站会读取 `tutorial/` 和 `docs/` 中的 Markdown 文件，修改文章后无需复制到其他目录。

## 发布

推送提交到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动构建并发布网站。
