import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Hermes 中文文档',
  tagline: 'Hermes Agent 中文社区翻译',
  favicon: 'img/favicon.ico',

  url: 'https://hermes-doc-cn.huangjiarong.top',
  baseUrl: '/',

  organizationName: 'hjr168',
  projectName: 'hermes-docs-cn',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['en', 'zh-CN'],
  },

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ['en', 'zh'],
        indexBlog: true,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
      }),
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',  // Docs at the root of /docs/
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/hjr168/hermes-docs-cn/edit/main/docs/',
        },
        blog: {
          routeBasePath: 'changelog',
          path: 'blog',
          blogTitle: '版本动态',
          blogSidebarTitle: '版本动态',
          blogSidebarCount: 'ALL',
          postsPerPage: 10,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/hermes-agent-banner.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Hermes 中文文档',
      logo: {
        alt: 'Hermes Agent',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/changelog',
          label: '版本动态',
          position: 'left',
        },
        {
          to: '/about',
          label: '关于',
          position: 'left',
        },
        {
          href: 'https://github.com/NousResearch/hermes-agent',
          label: '上游项目',
          position: 'right',
        },
        {
          href: 'https://github.com/hjr168/hermes-docs-cn',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://discord.gg/NousResearch',
          label: 'Discord',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            { label: '快速开始', to: '/getting-started/quickstart' },
            { label: '用户指南', to: '/user-guide/cli' },
            { label: '开发者指南', to: '/developer-guide/architecture' },
            { label: '参考', to: '/reference/cli-commands' },
          ],
        },
        {
          title: '社区',
          items: [
            { label: 'Discord', href: 'https://discord.gg/NousResearch' },
            { label: '上游 GitHub', href: 'https://github.com/NousResearch/hermes-agent' },
          ],
        },
        {
          title: '更多',
          items: [
            { label: '本站 GitHub', href: 'https://github.com/hjr168/hermes-docs-cn' },
            { label: 'Nous Research', href: 'https://nousresearch.com' },
          ],
        },
      ],
      copyright: `非官方社区翻译 · 原始项目 <a href="https://github.com/NousResearch/hermes-agent">NousResearch/hermes-agent</a> · MIT License · ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json', 'python', 'toml'],
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
