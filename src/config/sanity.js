import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

export const sanityClient = createClient({
    projectId: 'kv5wjjmj', // 在 Sanity 中创建项目后会补全
    dataset: 'production',
    useCdn: true, // 开发环境设为 `false`，生产环境设为 `true` 以提升速度
    apiVersion: '2024-03-01', // 当前 API 日期
});

const builder = createImageUrlBuilder(sanityClient);

// 用于生成 Sanity 图片地址的辅助函数
export const urlFor = (source) => builder.image(source);

// 将 Sanity 域名替换为代理路径的辅助函数
//
// 背景：Cloudflare Pages 用 functions/sanity-cdn/[[catchall]].js 反代 cdn.sanity.io；
// 纯静态托管（GitHub Pages 等）没有这个 Function，硬编码 /sanity-cdn 会让图片全部 404。
// 所以改成按需开启：
//   - 本地开发：默认走 vite.config.js 里的 /sanity-cdn 代理（行为与以前一致）
//   - 生产：只有在构建时显式设置 VITE_SANITY_CDN_PROXY 才走代理，否则用 CDN 原始地址
const SANITY_CDN_PROXY = import.meta.env.VITE_SANITY_CDN_PROXY
    ?? (import.meta.env.DEV ? '/sanity-cdn' : '');

export const getProxyUrl = (imageBuilder) => {
    if (!imageBuilder) return null;
    const url = imageBuilder.url();
    if (url && SANITY_CDN_PROXY && typeof window !== 'undefined') {
        return url.replace('https://cdn.sanity.io', SANITY_CDN_PROXY.replace(/\/+$/, ''));
    }
    return url;
};
