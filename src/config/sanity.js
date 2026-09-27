import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

// 接入方式：把占位值换成你自己的 Sanity projectId（只允许 a-z、0-9 与短横线）。
// 保持占位值 / 留空 = 未接入 Sanity，运行时与构建期都直接用本地回退数据。
export const SANITY_PROJECT_ID = 'YOUR_PROJECT_ID';

/** 是否已接入真实的 Sanity 项目 */
export const isSanityConfigured = Boolean(SANITY_PROJECT_ID) && SANITY_PROJECT_ID !== 'YOUR_PROJECT_ID';

// 未接入时不创建 client：@sanity/client v7 会校验 projectId 格式，占位值会直接抛错
export const sanityClient = isSanityConfigured
    ? createClient({
        projectId: SANITY_PROJECT_ID,
        dataset: 'production',
        useCdn: true, // 开发环境设为 `false`，生产环境设为 `true` 以提升速度
        apiVersion: '2024-03-01', // 当前 API 日期
    })
    : null;

const builder = sanityClient ? createImageUrlBuilder(sanityClient) : null;

// 用于生成 Sanity 图片地址的辅助函数
export const urlFor = (source) => (builder ? builder.image(source) : null);

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
