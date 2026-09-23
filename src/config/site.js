/**
 * 站点级配置（纯数据，无 JSX）——换域名 / 换站名只改这一个文件
 *
 * 读取方：
 * - 浏览器端：src/hooks/useDocumentMeta.js、src/config/rooms.js（房间 meta 标题）
 * - 构建期：  seo-plugin.js（JSON-LD、SEO DOM、llms.txt、sitemap.xml）
 *
 * SITE_URL 用于 canonical / og:url / og:image / JSON-LD 绝对地址与 sitemap。
 * CI（如 Cloudflare Pages）可用环境变量 SITE_URL 或 CF_PAGES_URL 覆盖，无需改代码。
 */

// 站点正式地址（末尾不要带斜杠）。当前部署在 GitHub Pages 用户站点（仓库名 Cuih369.github.io → 域名根路径）。
// 以后绑定自定义域名时只改这一行：canonical / og:url / og:image / JSON-LD / sitemap.xml / robots.txt 都跟着变。
export const SITE_URL = 'https://cuih369.github.io';

export const SITE_NAME = '个人博客';
export const SITE_LOCALE = 'zh-CN';
export const SITE_DESCRIPTION = '交互式 3D 个人博客：在手绘走廊与房间里阅读文章、浏览项目与联系方式。';

export const AUTHOR_NAME = 'CUiH';
export const AUTHOR_HANDLE = 'Cuih369';
export const AUTHOR_GITHUB_URL = 'https://github.com/Cuih369';

/**
 * 社交 / 联系方式链接（「联系方式」房间水面上的木桶点击后打开）
 * 留空字符串的条目不会渲染对应木桶——填上自己的主页即可自动出现。
 */
export const SOCIAL_URLS = {
    github: AUTHOR_GITHUB_URL,
    linkedin: '',   // TODO: 填上你的领英主页
    facebook: '',   // TODO: 填上你的脸书主页
    instagram: '',  // TODO: 填上你的 Instagram
};

/** 读取社交链接；未配置时返回空字符串 */
export const socialUrl = (id) => SOCIAL_URLS[id] || '';

/** 去掉末尾斜杠的站点根地址 */
export const siteBase = () => SITE_URL.replace(/\/+$/, '');

/** 页面标题：`作品集与项目 — 个人博客` */
export const titleWithSite = (page) => (page ? `${page} — ${SITE_NAME}` : SITE_NAME);