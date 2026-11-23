# NeoForge 26.1 文档网站

网站直接使用官方 NeoForged Documentation 的 Docusaurus 文档主题。

- 教程内容来自 `tutorial/`
- 中文文档内容来自 `docs/`
- 网页配置与主题位于项目根目录

双击 `启动网站.cmd` 可启动本地预览。网站会直接读取上述两个目录中的 Markdown 文件，不需要同步或复制文章。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个空仓库，不要同时创建 README、许可证或 `.gitignore`。
2. 打开仓库的 `Settings` → `Pages`，将 `Build and deployment` 的 `Source` 设为 `GitHub Actions`。
3. 在项目根目录初始化并推送仓库：

   ```powershell
   git init -b main
   git add .
   git commit -m "Add NeoForge documentation website"
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```

推送后，`.github/workflows/deploy-pages.yml` 会自动构建并发布网站。普通仓库的地址为 `https://<用户名>.github.io/<仓库名>/`；若仓库名为 `<用户名>.github.io`，地址为 `https://<用户名>.github.io/`。

绑定自定义域名时，在仓库的 `Settings` → `Secrets and variables` → `Actions` → `Variables` 中添加 `SITE_URL`（例如 `https://docs.example.com`）和 `SITE_BASE_URL`（值为 `/`），然后在 `Settings` → `Pages` 中填写同一个域名。
