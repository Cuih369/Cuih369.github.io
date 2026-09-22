/**
 * 文章（Posts）数据层 —— 全站文章的唯一数据源
 *
 * 文章就是 src/content/posts/ 下的 .md 文件：
 *   写一个新文件 → 自动出现在 /blog 列表、文章页、sitemap.xml 与 #seo-content 里。
 * 不需要数据库、不需要 CMS，构建期由 Vite 以 `?raw` 打进产物。
 *
 * 解析与字段规则见 src/content/postRecord.js（构建期脚本共用同一套逻辑）。
 *
 * 约束：本文件只用 Vite 支持的 import.meta.glob，不 import React；
 * 构建期脚本（seo-plugin.js）改走 node:fs 读目录，因此不要把可复用逻辑写在这里。
 */

import { collectPosts } from './postRecord.js';

const RAW_POSTS = import.meta.glob('./posts/*.md', { query: '?raw', import: 'default', eager: true });

/** 全部文章（含草稿），按日期从新到旧 */
export const ALL_POSTS = collectPosts(RAW_POSTS);

/** 已发布文章（列表、SEO、站点地图用） */
export const POSTS = ALL_POSTS.filter((post) => !post.draft);

/** 按 slug 取文章（含草稿，方便本地直链预览草稿） */
export function getPostBySlug(slug) {
    if (!slug) return null;
    const key = String(slug).replace(/\/+$/, '');
    for (let i = 0; i < ALL_POSTS.length; i++) {
        if (ALL_POSTS[i].slug === key) return ALL_POSTS[i];
    }
    return null;
}

/** 相邻文章：newer 比当前新，older 比当前旧 */
export function getAdjacentPosts(slug) {
    const index = POSTS.findIndex((post) => post.slug === slug);
    if (index === -1) return { newer: null, older: null };
    return {
        newer: index > 0 ? POSTS[index - 1] : null,
        older: index + 1 < POSTS.length ? POSTS[index + 1] : null,
    };
}

/** 全部标签（去重，按出现次数排序） */
export function getAllTags() {
    const counts = {};
    POSTS.forEach((post) => {
        post.tags.forEach((tag) => {
            counts[tag] = (counts[tag] || 0) + 1;
        });
    });
    const tags = Object.keys(counts);
    tags.sort((a, b) => (counts[b] - counts[a]) || (a < b ? -1 : 1));
    return tags.map((tag) => ({ tag, count: counts[tag] }));
}

/** 按标签筛选 */
export function getPostsByTag(tag) {
    if (!tag) return POSTS;
    return POSTS.filter((post) => post.tags.indexOf(tag) !== -1);
}

/** 'YYYY-MM-DD' → '2026 年 2 月 1 日' */
export function formatPostDate(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
    if (!match) return String(date || '');
    return `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日`;
}
