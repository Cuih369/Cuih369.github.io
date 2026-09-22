/**
 * Studio Content Data
 *
 * 「工作室」显示器塔的回退数据（Sanity 没有返回内容时使用）。
 * 每个条目对应塔上的一台显示器。
 *
 * ⚠️ 下面是示例（占位）内容：标题、日期、播放量都是编造的。
 *    正式发布前请替换为你自己的作品，或改由 Sanity 提供内容。
 *    所有 url 只指向平台首页 / 本站首页，避免误指向他人账号。
 *
 * Platforms: 'youtube', 'blog', 'tiktok'
 */

import { siteBase } from '../../../../config/site';

// 占位链接：填成你自己的频道 / 帖子地址即可
const SAMPLE_URLS = {
    youtube: 'https://www.youtube.com/',
    blog: `${siteBase()}/`,
    tiktok: 'https://www.tiktok.com/',
};

export const PLATFORM_CONFIG = {
    youtube: {
        color: '#FF0000',
        accentColor: '#cc0000',
        icon: '▶',
        label: 'YouTube',
        shape: 'tv', // Wide CRT style
    },
    blog: {
        color: '#4A90D9',
        accentColor: '#2d6cb5',
        icon: '📝',
        label: '博客',
        shape: 'monitor', // Thin desktop monitor
    },
    tiktok: {
        color: '#00F2EA',
        accentColor: '#FF0050',
        icon: '🎵',
        label: 'TikTok',
        shape: 'phone', // Vertical phone
    },
    instagram: {
        color: '#E1306C',
        accentColor: '#C13584',
        icon: '📷',
        label: 'Instagram',
        shape: 'phone',
    },
    x: {
        color: '#000000',
        accentColor: '#14171A',
        icon: '𝕏',
        label: 'X (Twitter)',
        shape: 'monitor',
    },
    linkedin: {
        color: '#0077B5',
        accentColor: '#005E93',
        icon: 'in',
        label: 'LinkedIn',
        shape: 'monitor',
    },
    codrops: {
        color: '#0099FF',
        accentColor: '#0077CC',
        icon: '💧',
        label: 'Codrops',
        shape: 'monitor',
    },
};

// Sample content data - replace with real content later
const RAW_CONTENT_DATA = [
    // ============ YouTube Videos ============
    {
        id: 'yt-001',
        platform: 'youtube',
        title: '我花 $__,___ 为 Young Multi 做了个网站',
        description: '2025 年末，人们都在飞向太空，而 Young Multi……居然还没有自己的网站。于是我决定亲自出手。',
        frontTexture: '/textures/studio/tvfront_filmikprojektdlamultiego.webp',
        paintedFrontTexture: '/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2026-01-10',
        views: '1.2K',
        duration: '15:32',
    },
    {
        id: 'yt-002',
        platform: 'youtube',
        title: '把普通自拍变成专业 AI 摄影！Google Nano Banana 如何改造了我的照片！（免费）',
        description: '📸 看我如何使用 Google 的免费 AI 工具，把一张普通自拍变成专业摄影作品！在这个逐步教程中，我会分享打造完美提示词的秘诀，即便你是新手也能轻松上手。',
        frontTexture: '/textures/studio/tvfront_filmikedytowaniezdjec.webp',
        paintedFrontTexture: '/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-10-11',
        views: '121',
        duration: '7:45',
    },
    {
        id: 'yt-003',
        platform: 'youtube',
        title: 'React Three Fiber 速成教程',
        description: '你需要了解的 React 3D 开发入门知识。',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-12-28',
        views: '2.4K',
        duration: '22:10',
    },
    {
        id: 'yt-004',
        platform: 'youtube',
        title: '着色器入门教程',
        description: 'WebGL 和 Three.js 中 GLSL 着色器入门。',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-12-15',
        views: '1.8K',
        duration: '18:33',
    },
    {
        id: 'yt-005',
        platform: 'youtube',
        title: 'GSAP + Three.js 集成',
        description: '如何使用 GSAP ScrollTrigger 制作 3D 物体动画。',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-12-01',
        views: '3.1K',
        duration: '20:15',
    },
    {
        id: 'yt-006',
        platform: 'youtube',
        title: '构建交互式 3D 场景',
        description: 'Three.js 中的射线投射、悬停效果和点击交互。',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-11-20',
        views: '2.8K',
        duration: '25:00',
    },
    {
        id: 'yt-007',
        platform: 'youtube',
        title: 'WebGL 性能深度解析',
        description: '优化绘制调用、几何体实例化等内容。',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-11-10',
        views: '1.5K',
        duration: '30:22',
    },
    {
        id: 'yt-008',
        platform: 'youtube',
        title: '程序化纹理教程',
        description: '使用噪声和数学函数创建纹理。',
        thumbnail: null,
        url: SAMPLE_URLS.youtube,
        date: '2025-10-28',
        views: '1.9K',
        duration: '18:45',
    },

    // ============ Blog Posts ============
    {
        id: 'blog-001',
        platform: 'blog',
        title: '双料每日精选网站确认！🏆🏆',
        description: '你可能注意到我最近在动态里分享了一堆 SOTD 证书。没错，这是真的——YOUNG MULTI 项目正式拿下"双料"奖项，并在国际舞台上获得认可……',
        frontTexture: '/textures/studio/monitorfront_postnafbdoublewinner.webp',
        paintedFrontTexture: '/textures/studio/monitorfront_postnafbdoublewinner_painted.webp',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2026-01-08',
        readTime: '5 分钟',
    },
    {
        id: 'blog-002',
        platform: 'blog',
        title: '手绘美学',
        description: '我如何使用着色器实现类素描的视觉风格。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-12-20',
        readTime: '8 分钟',
    },
    {
        id: 'blog-003',
        platform: 'blog',
        title: 'Web 端 3D 性能优化',
        description: '实现流畅 60fps 3D 体验的性能优化技巧。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-12-10',
        readTime: '6 分钟',
    },
    {
        id: 'blog-004',
        platform: 'blog',
        title: '创意编程之旅',
        description: '我从传统开发走向创意开发的历程。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-11-25',
        readTime: '10 分钟',
    },
    {
        id: 'blog-005',
        platform: 'blog',
        title: '网页体验的未来',
        description: '我认为交互式网页的发展方向。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-11-15',
        readTime: '7 分钟',
    },
    {
        id: 'blog-006',
        platform: 'blog',
        title: '3D 设计系统',
        description: '构建一致的 3D 组件库。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-11-01',
        readTime: '12 分钟',
    },
    {
        id: 'blog-007',
        platform: 'blog',
        title: '3D 网页的可访问性',
        description: '让沉浸式体验对每个人都可访问。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-10-20',
        readTime: '9 分钟',
    },
    {
        id: 'blog-008',
        platform: 'blog',
        title: '网页体验中的音频',
        description: '加入空间音频增强沉浸感。',
        thumbnail: null,
        url: SAMPLE_URLS.blog,
        date: '2025-10-10',
        readTime: '6 分钟',
    },

    // ============ TikToks ============
    {
        id: 'tt-001',
        platform: 'tiktok',
        title: '在 TikTok 上关注我！✨',
        description: '我在那里分享设计、编程等方面的小技巧。',
        frontTexture: '/textures/studio/phonefront_followmeontiktok.webp',
        paintedFrontTexture: '/textures/studio/phonefront_followmeontiktok_painted.webp',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2026-01-09',
        views: '15.2K',
        likes: '1.2K',
    },
    {
        id: 'tt-002',
        platform: 'tiktok',
        title: '编写门动画 🚪',
        description: 'POV：你在 Three.js 里打开一扇门',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2026-01-03',
        views: '8.5K',
        likes: '756',
    },
    {
        id: 'tt-003',
        platform: 'tiktok',
        title: '当着色器终于跑通时 🎉',
        description: '调试着色器的成就感',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-12-25',
        views: '22.1K',
        likes: '3.4K',
    },
    {
        id: 'tt-004',
        platform: 'tiktok',
        title: '我的一天：WebGL 开发者',
        description: '作为创意开发者的日常',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-12-18',
        views: '12.3K',
        likes: '1.1K',
    },
    {
        id: 'tt-005',
        platform: 'tiktok',
        title: 'React vs Three.js 视角 😅',
        description: '挣扎是真实的',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-12-12',
        views: '45.2K',
        likes: '5.8K',
    },
    {
        id: 'tt-006',
        platform: 'tiktok',
        title: '制作一个 3D 按钮 🔘',
        description: '30 秒的纯粹满足',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-12-05',
        views: '18.7K',
        likes: '2.1K',
    },
    {
        id: 'tt-007',
        platform: 'tiktok',
        title: '这个着色器写了 3 小时 💀',
        description: '值得吗？绝对值得。',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-11-28',
        views: '33.4K',
        likes: '4.2K',
    },
    {
        id: 'tt-008',
        platform: 'tiktok',
        title: '悬停效果合集 ✨',
        description: '我最喜欢的微交互',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-11-20',
        views: '28.9K',
        likes: '3.6K',
    },
    {
        id: 'tt-009',
        platform: 'tiktok',
        title: '加载画面创意 🔄',
        description: '创意预加载器概念',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-11-15',
        views: '19.3K',
        likes: '2.4K',
    },
    {
        id: 'tt-010',
        platform: 'tiktok',
        title: '光标疯狂滚动 🖱️',
        description: '自定义光标的狂欢',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-11-08',
        views: '41.2K',
        likes: '5.1K',
    },
    {
        id: 'tt-011',
        platform: 'tiktok',
        title: '视差滚动魔法 🪄',
        description: '简单却有效',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-11-01',
        views: '25.6K',
        likes: '3.0K',
    },
    {
        id: 'tt-012',
        platform: 'tiktok',
        title: '文字动画灵感 📝',
        description: '会动的字体',
        thumbnail: null,
        url: SAMPLE_URLS.tiktok,
        date: '2025-10-25',
        views: '31.8K',
        likes: '4.0K',
    },
];

const ytTextures = ['/textures/studio/tvfront_filmikprojektdlamultiego.webp', '/textures/studio/tvfront_filmikedytowaniezdjec.webp'];
const ytPaintedTextures = ['/textures/studio/tvfront_filmikprojektdlamultiego_painted.webp', '/textures/studio/tvfront_filmikedytowaniezdjec_painted.webp'];
const blogTextures = ['/textures/studio/monitorfront_postnafbdoublewinner.webp'];
const blogPaintedTextures = ['/textures/studio/monitorfront_postnafbdoublewinner_painted.webp'];
const ttTextures = ['/textures/studio/phonefront_followmeontiktok.webp'];
const ttPaintedTextures = ['/textures/studio/phonefront_followmeontiktok_painted.webp'];

let ytIdx = 0, blogIdx = 0, ttIdx = 0;
let ytPIdx = 0, blogPIdx = 0, ttPIdx = 0;

export const CONTENT_DATA = RAW_CONTENT_DATA.map((item) => {
    return {
        ...item,
        frontTexture: item.frontTexture || (
            item.platform === 'youtube' ? ytTextures[ytIdx++ % ytTextures.length] :
                item.platform === 'blog' ? blogTextures[blogIdx++ % blogTextures.length] :
                    ttTextures[ttIdx++ % ttTextures.length]
        ),
        paintedFrontTexture: item.paintedFrontTexture || (
            item.platform === 'youtube' ? ytPaintedTextures[ytPIdx++ % ytPaintedTextures.length] :
                item.platform === 'blog' ? blogPaintedTextures[blogPIdx++ % blogPaintedTextures.length] :
                    ttPaintedTextures[ttPIdx++ % ttPaintedTextures.length]
        )
    };
});

// Helper to get content by platform
export const getContentByPlatform = (platform) => {
    if (platform === 'all') return CONTENT_DATA;
    return CONTENT_DATA.filter(item => item.platform === platform);
};

// Get latest content (for "On Air" indicator)
export const getLatestContent = () => {
    return [...CONTENT_DATA].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
};
