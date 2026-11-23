// @ts-check

const {themes} = require("prism-react-renderer");

function normalizeBaseUrl(value) {
  if (!value) {
    return "/";
  }

  const trimmed = value.trim();
  return trimmed === "/" ? "/" : `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

const githubRepository = process.env.GITHUB_REPOSITORY || "";
const [githubOwner, githubProject] = githubRepository.split("/", 2);
const isGitHubPagesRoot =
  githubOwner &&
  githubProject &&
  `${githubOwner}.github.io`.toLowerCase() === githubProject.toLowerCase();

const netlifySiteUrl =
  process.env.NETLIFY === "true"
    ? process.env.DEPLOY_PRIME_URL || process.env.URL
    : "";

const siteUrl =
  process.env.SITE_URL ||
  netlifySiteUrl ||
  (githubOwner
    ? `https://${githubOwner}.github.io`
    : "https://docs.neoforged.net");
const siteBaseUrl = normalizeBaseUrl(
  process.env.SITE_BASE_URL ||
    (githubProject && !isGitHubPagesRoot ? `/${githubProject}/` : "/"),
);

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "NeoForge 26.1",
  tagline: "NeoForge 模组开发资料",
  favicon: "img/favicon.png",

  url: siteUrl,
  baseUrl: siteBaseUrl,

  organizationName: githubOwner || "neoforged",
  projectName: githubProject || "documentation",

  // 译文和教程仍在补充，暂时不因未完成内容中的链接中止构建。
  onBrokenLinks: "ignore",
  onBrokenAnchors: "ignore",

  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "./docs",
          routeBasePath: "docs",
          sidebarPath: require.resolve("./sidebars.js"),
          exclude: ["README.md", "INDEX.md"],
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "tutorial",
        path: "./tutorial",
        routeBasePath: "tutorial",
        sidebarPath: require.resolve("./tutorial-sidebar.js"),
        exclude: ["README.md", "OUTLINE.md"],
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "NeoForge 26.1",
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            docsPluginId: "tutorial",
            position: "left",
            label: "教程",
          },
          {
            type: "docSidebar",
            sidebarId: "docsSidebar",
            position: "left",
            label: "中文文档",
          },
        ],
      },
      prism: {
        theme: themes.oneLight,
        darkTheme: themes.vsDark,
        additionalLanguages: [
          "java",
          "gradle",
          "toml",
          "groovy",
          "kotlin",
          "javascript",
          "json",
          "json5",
          "properties",
        ],
      },
    }),

  markdown: {
    mermaid: true,
    preprocessor: ({fileContent}) =>
      fileContent.replaceAll("<=", "&lt;="),
    hooks: {
      onBrokenMarkdownLinks: "ignore",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],
};

module.exports = config;
