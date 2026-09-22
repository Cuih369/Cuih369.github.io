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

// 将 Sanity 域名替换为 Cloudflare 代理的辅助函数
export const getProxyUrl = (imageBuilder) => {
    if (!imageBuilder) return null;
    const url = imageBuilder.url();
    if (url && typeof window !== 'undefined') {
        return url.replace('https://cdn.sanity.io', '/sanity-cdn');
    }
    return url;
};
