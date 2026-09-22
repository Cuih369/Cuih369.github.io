import { createClient } from '@sanity/client';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS } from './src/config/rooms.js';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, AUTHOR_NAME, AUTHOR_HANDLE } from './src/config/site.js';
import { collectPosts } from './src/content/postRecord.js';
import { markdownToPlainText } from './src/content/markdown.js';

const sanityClient = createClient({
    projectId: 'kv5wjjmj', // TODO: 换成你自己的 Sanity projectId，或改走本地数据（见 docs/ARCHITECTURE.md §7）
    dataset: 'production',
    useCdn: true,
    apiVersion: '2024-03-01',
});

// 站点绝对地址：优先环境变量（Cloudflare Pages 构建期提供 CF_PAGES_URL），否则读 src/config/site.js
const SITE_BASE = (process.env.SITE_URL || process.env.CF_PAGES_URL || SITE_URL).replace(/\/+$/, '');

// Tech stack filename -> human-readable name mapping for JSON-LD
// 平台标识 → 展示名称映射（供爬虫读取的语义 HTML 使用）
const PLATFORM_LABELS = {
    youtube: 'YouTube',
    blog: '博客',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    x: 'X（Twitter）',
    linkedin: '领英',
    codrops: 'Codrops',
};

const TECH_STACK_NAMES = {
    'reactlogo.webp': 'React',
    'htmllogo.webp': 'HTML',
    'csslogo.webp': 'CSS',
    'jslogo.webp': 'JavaScript',
    'tailwindlogo.webp': 'Tailwind CSS',
    'firebaselogo.webp': 'Firebase',
    'netlifylogo.webp': 'Netlify',
    'wordpresslogo.webp': 'WordPress',
    'elementorlogo.webp': 'Elementor',
    'phplogo.webp': 'PHP',
};

// =============================================================================
// 博客文章（src/content/posts/*.md）
// -----------------------------------------------------------------------------
// 构建期用 node:fs 读目录，不依赖 Vite 的 import.meta.glob；
// 解析规则与浏览器端共用 src/content/postRecord.js，两边结果一致。
// =============================================================================

const POSTS_DIR = fileURLToPath(new URL('./src/content/posts/', import.meta.url));

/** 读取全部已发布文章（草稿不进 sitemap / SEO） */
function loadPosts() {
    try {
        const fileMap = {};
        readdirSync(POSTS_DIR).forEach((file) => {
            if (file.slice(-3) === '.md') {
                fileMap['./posts/' + file] = readFileSync(join(POSTS_DIR, file), 'utf8');
            }
        });
        return collectPosts(fileMap).filter((post) => !post.draft);
    } catch (error) {
        console.error('SEO Plugin Error: 读取 src/content/posts 失败', error);
        return [];
    }
}

/** 注入到 HTML 里的文本先转义（Markdown 里可能出现 & < >） */
function escapeHtmlText(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** 摘要：优先 front matter 的 summary，否则从正文抽一段 */
function postExcerpt(post, limit) {
    const text = post.summary || markdownToPlainText(post.body);
    const max = limit || 200;
    if (text.length <= max) return text;
    return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/** 博客的 JSON-LD 节点：一个 Blog + 每篇文章一个 BlogPosting */
function buildBlogJsonLdNodes(posts) {
    const nodes = [];
    if (!posts || posts.length === 0) return nodes;

    const blogId = SITE_BASE + '/blog#blog';
    nodes.push({
        '@type': 'Blog',
        '@id': blogId,
        url: SITE_BASE + '/blog',
        name: SITE_NAME + ' — 文章',
        description: SITE_DESCRIPTION,
        inLanguage: 'zh-CN',
        publisher: { '@id': SITE_BASE + '/#person' },
        blogPost: posts.map((post) => ({ '@id': SITE_BASE + post.path + '#post' }))
    });

    posts.forEach((post) => {
        nodes.push({
            '@type': 'BlogPosting',
            '@id': SITE_BASE + post.path + '#post',
            headline: post.title,
            name: post.title,
            description: postExcerpt(post, 200),
            url: SITE_BASE + post.path,
            mainEntityOfPage: SITE_BASE + post.path,
            isPartOf: { '@id': blogId },
            inLanguage: 'zh-CN',
            image: SITE_BASE + '/og-image.png',
            author: { '@id': SITE_BASE + '/#person' },
            publisher: { '@id': SITE_BASE + '/#person' },
            ...(post.date ? { datePublished: formatIsoDate(post.date), dateModified: formatIsoDate(post.date) } : {}),
            ...(post.minutes ? { timeRequired: 'PT' + post.minutes + 'M' } : {}),
            ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {})
        });
    });

    return nodes;
}

/** 爬虫可见的博客列表（注入到 #seo-content 里） */
function buildBlogSectionHtml(posts) {
    if (!posts || posts.length === 0) return '';

    let html = '  <section id="blog">\n';
    html += '    <h2>博客文章</h2>\n';
    html += '    <p><a href="' + SITE_BASE + '/blog">全部文章</a></p>\n';
    html += '    <ul>\n';
    posts.forEach((post) => {
        html += '      <li>\n';
        html += '        <h3><a href="' + SITE_BASE + post.path + '">' + escapeHtmlText(post.title) + '</a></h3>\n';
        if (post.date) html += '        <p><time datetime="' + post.date + '">' + post.date + '</time></p>\n';
        html += '        <p>' + escapeHtmlText(postExcerpt(post, 200)) + '</p>\n';
        html += '      </li>\n';
    });
    html += '    </ul>\n  </section>\n';
    return html;
}

/**
 * 把博客内容（本地 Markdown，与 Sanity 无关）注入 SEO 输出。
 * @param {string} html 已被 Sanity 逻辑处理过的 HTML
 * @param {Array} posts 已发布文章
 * @param {boolean} withJsonLd 主流程已注入过含博客的 JSON-LD 时传 false，避免重复
 */
function injectBlogSeo(html, posts, withJsonLd) {
    if (!posts || posts.length === 0) return html;

    let output = html.replace(
        /(<div id="seo-content"[^>]*>)([\s\S]*?)(<\/div>)/,
        (match, open, inner, close) => open + inner + buildBlogSectionHtml(posts) + close
    );

    if (withJsonLd) {
        const script = '\n  <!-- 博客结构化数据（本地 Markdown） -->\n  <script type="application/ld+json">\n' +
            JSON.stringify({ '@context': 'https://schema.org', '@graph': buildBlogJsonLdNodes(posts) }, null, 2) +
            '\n  </script>\n';
        output = output.replace('</head>', script + '</head>');
    }

    return output;
}

/**
 * Helper to ensure dates are in ISO-8601 format with timezone for SEO.
 */
function formatIsoDate(dateString) {
    if (!dateString) return undefined;
    if (dateString.includes('T')) return dateString; // Already has time/timezone
    return `${dateString}T12:00:00Z`; // Default to noon UTC
}

/**
 * Build dynamic JSON-LD structured data from Sanity content.
 * This generates schema.org entities that AI search engines (Google AI Overviews,
 * Perplexity, Gemini) use to understand and cite content in their answers.
 */
function buildJsonLd(globalInfo, projects, studio, awards, faqList, posts) {
    const graph = [];

    // --- 1. Person: Central node of the Knowledge Graph ---
    const person = {
        '@type': 'Person',
        '@id': SITE_BASE + '/#person',
        name: AUTHOR_NAME,
        alternateName: [AUTHOR_HANDLE],
        url: SITE_BASE,
        jobTitle: '创意前端开发者',
        description: globalInfo?.aboutMe || '专注于 3D 网页体验的创意开发者。',
        knowsAbout: ['React', 'Three.js', 'JavaScript', 'TypeScript', 'GSAP', 'Next.js', 'WebGL', '3D Graphics', 'Web Development'],
        sameAs: [
            globalInfo?.linkedinUrl,
            globalInfo?.githubUrl,
            globalInfo?.instagramUrl,
            globalInfo?.xUrl,
            globalInfo?.tiktokUrl,
            globalInfo?.youtubeUrl
        ].filter(Boolean)
    };
    graph.push(person);

    // --- 2. WebSite ---
    const website = {
        '@type': 'WebSite',
        '@id': SITE_BASE + '/#website',
        url: SITE_BASE,
        name: globalInfo?.siteTitle || SITE_NAME,
        description: globalInfo?.siteDescription || SITE_DESCRIPTION,
        publisher: { '@id': SITE_BASE + '/#person' }
    };
    graph.push(website);

    // --- 3. ProfilePage ---
    const profilePage = {
        '@type': 'ProfilePage',
        '@id': SITE_BASE + '/#profilepage',
        url: SITE_BASE,
        mainEntity: { '@id': SITE_BASE + '/#person' },
        about: { '@id': SITE_BASE + '/#person' }
    };
    graph.push(profilePage);

    // --- 4. FAQPage (GEO & AI search engine optimizer) ---
    if (faqList && faqList.length > 0) {
        const faqPage = {
            '@type': 'FAQPage',
            '@id': SITE_BASE + '/#faq',
            mainEntity: faqList.map(item => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer
                }
            }))
        };
        graph.push(faqPage);
    }

    // --- 5. ItemList: Portfolio Projects (Google rich results for lists) ---
    if (projects && projects.length > 0) {
        graph.push({
            '@type': 'ItemList',
            '@id': SITE_BASE + '/#projectslist',
            name: ` 的作品集项目`,
            description: '精选 Web 开发项目，展示 React、Three.js 与创意前端工程能力。',
            numberOfItems: projects.length,
            itemListElement: projects.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'CreativeWork',
                    name: p.seoTitle || p.title,
                    description: p.seoDescription || p.description || '',
                    url: p.url || undefined,
                    creator: { '@id': SITE_BASE + '/#person' },
                    ...(p.techStack && p.techStack.length > 0 ? {
                        keywords: p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')
                    } : {}),
                }
            }))
        });

        // Individual CreativeWork entries for each project (richer detail)
        projects.forEach(p => {
            const projectSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            graph.push({
                '@type': 'CreativeWork',
                '@id': `${SITE_BASE}/#project-${projectSlug}`,
                name: p.seoTitle || p.title,
                description: p.seoDescription || p.description || '',
                url: p.url || undefined,
                creator: { '@id': SITE_BASE + '/#person' },
                ...(p.techStack && p.techStack.length > 0 ? {
                    keywords: p.techStack.map(t => TECH_STACK_NAMES[t] || t).join(', ')
                } : {}),
            });
        });
    }

    // --- 6. Studio Content (YouTube -> VideoObject, Blog -> Article, TikTok -> VideoObject) ---
    if (studio && studio.length > 0) {
        studio.forEach((s, idx) => {
            const studioSlug = `studio-item-${idx}`;
            if (s.platform === 'youtube') {
                let embedUrl = undefined;
                if (s.url) {
                    const ytMatch = s.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^"&?\/\s]{11})/);
                    if (ytMatch && ytMatch[1]) {
                        embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
                    }
                }

                graph.push({
                    '@type': 'VideoObject',
                    '@id': `${SITE_BASE}/#${studioSlug}`,
                    name: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    contentUrl: s.url || undefined,
                    ...(embedUrl ? { embedUrl } : {}),
                    thumbnailUrl: s.thumbnailUrl || SITE_BASE + '/og-image.png',
                    ...(s.duration ? { duration: `PT${s.duration.replace(':', 'M')}S` } : {}),
                    ...(s.date ? { uploadDate: formatIsoDate(s.date) } : {}),
                    ...(s.views ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: s.views } } : {}),
                    author: { '@id': SITE_BASE + '/#person' },
                });
            } else if (s.platform === 'blog') {
                graph.push({
                    '@type': 'Article',
                    '@id': `${SITE_BASE}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || SITE_BASE + '/og-image.png',
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    ...(s.readTime ? { timeRequired: `PT${s.readTime.replace(' min', '')}M` } : {}),
                    author: { '@id': SITE_BASE + '/#person' },
                });
            } else if (s.platform === 'tiktok') {
                graph.push({
                    '@type': 'VideoObject',
                    '@id': `${SITE_BASE}/#${studioSlug}`,
                    name: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    contentUrl: s.url || undefined,
                    thumbnailUrl: s.thumbnailUrl || SITE_BASE + '/og-image.png',
                    ...(s.date ? { uploadDate: formatIsoDate(s.date) } : {}),
                    ...(s.views ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WatchAction', userInteractionCount: s.views } } : {}),
                    ...(s.likes ? { aggregateRating: { '@type': 'AggregateRating', ratingCount: s.likes } } : {}),
                    author: { '@id': SITE_BASE + '/#person' },
                });
            } else if (s.platform === 'instagram' || s.platform === 'x' || s.platform === 'linkedin') {
                graph.push({
                    '@type': 'SocialMediaPosting',
                    '@id': `${SITE_BASE}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || SITE_BASE + '/og-image.png',
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    ...(s.likes ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: s.likes } } : {}),
                    author: { '@id': SITE_BASE + '/#person' },
                });
            } else if (s.platform === 'codrops') {
                graph.push({
                    '@type': 'Article',
                    '@id': `${SITE_BASE}/#${studioSlug}`,
                    headline: s.seoTitle || s.title,
                    description: s.seoDescription || s.description || '',
                    url: s.url || undefined,
                    image: s.thumbnailUrl || SITE_BASE + '/og-image.png',
                    ...(s.date ? { datePublished: formatIsoDate(s.date) } : {}),
                    author: { '@id': SITE_BASE + '/#person' },
                });
            }
        });
    }

    // --- 7. Awards as schema.org Award/CreativeWork ---
    if (awards && awards.length > 0) {
        const categoryLabels = { sotd: '每日最佳', sotm: '每月最佳', other: '荣誉提名' };
        graph.push({
            '@type': 'ItemList',
            '@id': SITE_BASE + '/#awardslist',
            name: ` 获得的网页设计奖项`,
            numberOfItems: awards.length,
            itemListElement: awards.map((a, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'CreativeWork',
                    name: `${categoryLabels[a.category] || a.category} — ${a.seoTitle || a.title}`,
                    ...(a.date ? { dateCreated: formatIsoDate(a.date) } : {}),
                    url: a.url || undefined,
                    description: a.seoDescription || undefined,
                    award: categoryLabels[a.category] || a.category,
                    creator: { '@id': SITE_BASE + '/#person' },
                }
            }))
        });
    }

    // --- 8. Blog：本地 Markdown 文章（Blog + BlogPosting） ---
    buildBlogJsonLdNodes(posts).forEach((node) => graph.push(node));

    return {
        '@context': 'https://schema.org',
        '@graph': graph
    };
}

// Helper to generate the llms.txt content in clean Markdown
function buildLlmsTxt(globalInfo, projects, studio, awards, faqList, posts) {
    const siteTitle = globalInfo?.siteTitle || SITE_NAME;
    const siteDescription = globalInfo?.siteDescription || SITE_DESCRIPTION;
    const aboutMe = globalInfo?.aboutMe || '我是一名专注于 3D 网页体验的创意开发者。';

    let content = `# ${siteTitle}\n`;
    content += `> ${siteDescription}\n\n`;

    content += `## 个人简介 / 关于我\n`;
    content += `${aboutMe}\n\n`;

    content += `## 核心技术栈与技能\n`;
    content += `- React, Three.js, React Three Fiber (R3F), GSAP (GreenSock), JavaScript, TypeScript, Next.js, WebGL, 3D Graphics, Web Development.\n\n`;

    if (posts && posts.length > 0) {
        content += `## 博客文章\n`;
        posts.forEach(post => {
            const when = post.date ? `（${post.date}）` : '';
            content += `- [${post.title}](${SITE_BASE}${post.path})${when}：${post.summary || postExcerpt(post, 160)}\n`;
        });
        content += `\n`;
    }

    if (projects && projects.length > 0) {
        content += `## 精选作品集项目\n`;
        projects.forEach(p => {
            const tech = p.techStack ? `（技术栈：${p.techStack.map(t => TECH_STACK_NAMES[t] || t).join('、')}）` : '';
            content += `- [${p.seoTitle || p.title}](${p.url || SITE_BASE}): ${p.seoDescription || p.description || ''}${tech}\n`;
        });
        content += `\n`;
    }

    if (studio && studio.length > 0) {
        content += `## 工作室内容与发布\n`;
        studio.forEach(s => {
            content += `- [${s.seoTitle || s.title} (${s.platform})](${s.url || SITE_BASE}): ${s.seoDescription || s.description || ''}\n`;
        });
        content += `\n`;
    }

    if (awards && awards.length > 0) {
        content += `## 设计奖项与荣誉\n`;
        const categoryLabels = { sotd: '每日最佳', sotm: '每月最佳', other: '荣誉提名' };
        awards.forEach(a => {
            const category = categoryLabels[a.category] || a.category;
            content += `- **${category}** — [${a.seoTitle || a.title}](${a.url || SITE_BASE})：于 ${a.date || '未知'} 获奖。 ${a.seoDescription || ''}\n`;
        });
        content += `\n`;
    }

    if (faqList && faqList.length > 0) {
        content += `## 常见问题（FAQ）\n`;
        faqList.forEach(item => {
            content += `- **${item.question}**\n`;
            content += `  ${item.answer.replace(/\n/g, '\n  ')}\n`;
        });
    }

    return content;
}

export function generateSeoHtml() {
    let cachedLlmsContent = '';

    async function getLlmsContent() {
        if (!cachedLlmsContent) {
            try {
                const [globalInfo, projects, studio, awards, faqList] = await Promise.all([
                    sanityClient.fetch(`*[_id == "globalInfo"][0]`),
                    sanityClient.fetch(`*[_type == "galleryProject"]`),
                    sanityClient.fetch(`*[_type == "studioItem"]`),
                    sanityClient.fetch(`*[_type == "awardCertificate"]`),
                    sanityClient.fetch(`*[_type == "faq"]`)
                ]);
                cachedLlmsContent = buildLlmsTxt(globalInfo, projects, studio, awards, faqList, loadPosts());
            } catch (e) {
                console.error('SEO Plugin Error: Failed to fetch Sanity data for llms.txt', e);
                // 兜底也要带上本地文章（不依赖 Sanity）
                cachedLlmsContent = buildLlmsTxt(null, null, null, null, null, loadPosts());
            }
        }
        return cachedLlmsContent;
    }

    return {
        name: 'sanity-seo-plugin',

        // Serve llms.txt in local development mode
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/llms.txt') {
                    const content = await getLlmsContent();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end(content);
                } else {
                    next();
                }
            });
        },

        // This hook runs when Vite generates or serves index.html
        async transformIndexHtml(html) {
            // 本地 Markdown 文章：不依赖 Sanity，放在 try 外面也能用
            const posts = loadPosts();

            try {
                // Fetch all data in parallel
                const [globalInfo, projects, studio, awards, faqList] = await Promise.all([
                    sanityClient.fetch(`*[_id == "globalInfo"][0]`),
                    sanityClient.fetch(`*[_type == "galleryProject"]`),
                    sanityClient.fetch(`*[_type == "studioItem"] { ..., "thumbnailUrl": frontTexture.asset->url }`),
                    sanityClient.fetch(`*[_type == "awardCertificate"]`),
                    sanityClient.fetch(`*[_type == "faq"]`)
                ]);

                // Fallback values if globalInfo is not yet created in Sanity
                const siteTitle = globalInfo?.siteTitle || SITE_NAME;
                const siteDescription = globalInfo?.siteDescription || SITE_DESCRIPTION;
                const aboutMe = globalInfo?.aboutMe || '我是一名专注于 3D 网页体验的创意开发者。';

                // Cache llms.txt content for later bundle emission
                cachedLlmsContent = buildLlmsTxt(globalInfo, projects, studio, awards, faqList, loadPosts());

                // ====== PART 1: Build the semantic HTML string ======
                let seoHtml = `\n<div id="seo-content" class="sr-only-seo">\n`;
                
                seoHtml += `  <header>\n`;
                seoHtml += `    <h1>${siteTitle}</h1>\n`;
                seoHtml += `    <p>${siteDescription}</p>\n`;
                seoHtml += `  </header>\n`;

                seoHtml += `  <section id="about">\n`;
                seoHtml += `    <h2>关于我</h2>\n`;
                seoHtml += `    <p>${aboutMe}</p>\n`;
                if (globalInfo?.githubUrl) seoHtml += `    <a href="${globalInfo.githubUrl}">GitHub</a>\n`;
                if (globalInfo?.linkedinUrl) seoHtml += `    <a href="${globalInfo.linkedinUrl}">LinkedIn</a>\n`;
                seoHtml += `  </section>\n`;

                if (projects && projects.length > 0) {
                    seoHtml += `  <section id="projects">\n    <h2>项目作品</h2>\n    <ul>\n`;
                    projects.forEach(p => {
                        seoHtml += `      <li>\n        <h3>${p.seoTitle || p.title}</h3>\n        <p>${p.seoDescription || p.description || ''}</p>\n        ${p.url ? `<a href="${p.url}">访问 ${p.seoTitle || p.title}</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                if (studio && studio.length > 0) {
                    seoHtml += `  <section id="studio">\n    <h2>工作室（内容）</h2>\n    <ul>\n`;
                    studio.forEach(s => {
                        seoHtml += `      <li>\n        <h3>${s.seoTitle || s.title}（${PLATFORM_LABELS[s.platform] || s.platform}）</h3>\n        <p>${s.seoDescription || s.description || ''}</p>\n        ${s.url ? `<a href="${s.url}">查看内容</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                if (awards && awards.length > 0) {
                    seoHtml += `  <section id="awards">\n    <h2>奖项与证书</h2>\n    <ul>\n`;
                    awards.forEach(a => {
                        seoHtml += `      <li>\n        <h3>${a.seoTitle || a.title}</h3>\n        <p>${a.category} - ${a.date}</p>\n        <p>${a.seoDescription || ''}</p>\n        ${a.url ? `<a href="${a.url}">查看详情</a>\n` : ''}      </li>\n`;
                    });
                    seoHtml += `    </ul>\n  </section>\n`;
                }

                // FAQ Section (GEO/AI search optimizer fallback)
                if (faqList && faqList.length > 0) {
                    seoHtml += `  <section id="faq">\n`;
                    seoHtml += `    <h2>常见问题（FAQ）</h2>\n`;
                    faqList.forEach(item => {
                        seoHtml += `    <article>\n`;
                        seoHtml += `      <h3>${item.question}</h3>\n`;
                        seoHtml += `      <p>${item.answer}</p>\n`;
                        seoHtml += `    </article>\n`;
                    });
                    seoHtml += `  </section>\n`;
                }

                seoHtml += `</div>\n`;

                // ====== PART 2: Build dynamic JSON-LD ======
                const jsonLdSchemas = buildJsonLd(globalInfo, projects, studio, awards, faqList, posts);
                const jsonLdScript = `\n  <!-- Dynamic Structured Data (JSON-LD) — generated from Sanity at build time -->\n  <script type="application/ld+json">\n${JSON.stringify(jsonLdSchemas, null, 2)}\n  </script>\n`;

                // ====== PART 3: Transform HTML ======
                // Update the <title> tag
                let transformedHtml = html.replace(
                    /<title>(.*?)<\/title>/,
                    `<title>${siteTitle}</title>`
                );
                
                // Add or replace meta description
                if (transformedHtml.includes('<meta name="description"')) {
                    transformedHtml = transformedHtml.replace(
                        /<meta name="description" content="(.*?)"\s*\/?>/,
                        `<meta name="description" content="${siteDescription}" />`
                    );
                } else {
                    transformedHtml = transformedHtml.replace(
                        '</head>',
                        `  <meta name="description" content="${siteDescription}" />\n</head>`
                    );
                }

                // Update Open Graph dynamic metadata
                transformedHtml = transformedHtml
                    .replace(
                        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:title" content="${siteTitle}" />`
                    )
                    .replace(
                        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:description" content="${siteDescription}" />`
                    );

                // Update Twitter card dynamic metadata
                transformedHtml = transformedHtml
                    .replace(
                        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:title" content="${siteTitle}" />`
                    )
                    .replace(
                        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:description" content="${siteDescription}" />`
                    );

                // 绝对地址统一使用 SITE_BASE（换域名只改 src/config/site.js 或设环境变量 SITE_URL）
                const canonicalUrl = `${SITE_BASE}/`;
                const ogImageUrl = `${SITE_BASE}/og-image.png`;
                transformedHtml = transformedHtml
                    .replace(
                        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
                        `<link rel="canonical" href="${canonicalUrl}" />`
                    )
                    .replace(
                        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:url" content="${canonicalUrl}" />`
                    )
                    .replace(
                        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
                        `<meta property="og:image" content="${ogImageUrl}" />`
                    )
                    .replace(
                        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
                        `<meta name="twitter:image" content="${ogImageUrl}" />`
                    );

                // Inject dynamic JSON-LD right before </head> (next to the existing static one)
                transformedHtml = transformedHtml.replace('</head>', `${jsonLdScript}</head>`);

                // Replace the static placeholder with the dynamic one to prevent duplicate #seo-content and double h1s
                if (transformedHtml.includes('id="seo-content"')) {
                    transformedHtml = transformedHtml.replace(
                        /<div id="seo-content" class="sr-only-seo">[\s\S]*?<\/div>/,
                        seoHtml
                    );
                } else {
                    // Fallback injection if the template doesn't contain the static block
                    transformedHtml = transformedHtml.replace('</body>', `${seoHtml}</body>`);
                }

                // 博客列表补进 #seo-content（JSON-LD 已在上面一并生成）
                return injectBlogSeo(transformedHtml, posts, false);
            } catch (error) {
                console.error('SEO Plugin Error: Failed to fetch Sanity data', error);
                // Sanity 不可用时也返回原始 HTML，不让构建挂掉；
                // 但博客内容来自本地 Markdown，仍然要进 SEO（含自己的 JSON-LD）
                return injectBlogSeo(html, posts, true);
            }
        },

        // Emit llms.txt to the build output directory
        async generateBundle() {
            const content = await getLlmsContent();
            this.emitFile({
                type: 'asset',
                fileName: 'llms.txt',
                source: content
            });

            // 从房间注册表生成 sitemap.xml：新增房间会自动进入站点地图，无需手动同步
            try {
                const entries = [
                    { path: '/', priority: '1.0' },
                    ...ROOMS.map((room, index) => ({ path: room.path, priority: (0.9 - index * 0.1).toFixed(1) })),
                    // 博客列表与每篇文章（文章自带 lastmod = 发布日期）
                    { path: '/blog', priority: '0.8' },
                    ...loadPosts().map((post) => ({
                        path: post.path,
                        priority: '0.6',
                        lastmod: post.date,
                        changefreq: 'yearly'
                    }))
                ];
                const lastmod = new Date().toISOString().slice(0, 10);
                const sitemap = [
                    '<?xml version="1.0" encoding="UTF-8"?>',
                    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                    ...entries.map((entry) => [
                        '  <url>',
                        `    <loc>${SITE_BASE}${entry.path}</loc>`,
                        `    <lastmod>${entry.lastmod || lastmod}</lastmod>`,
                        `    <changefreq>${entry.changefreq || 'monthly'}</changefreq>`,
                        `    <priority>${entry.priority}</priority>`,
                        '  </url>'
                    ].join('\n')),
                    '</urlset>',
                    ''
                ].join('\n');

                this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
            } catch (error) {
                console.error('SEO Plugin Error: failed to generate sitemap.xml', error);
            }
        }
    };
}
