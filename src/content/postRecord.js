/**
 * 文章记录构建（纯函数，浏览器与 Node 构建脚本共用）
 *
 * 这里只做「一段 Markdown 原文 → 一条文章记录」的纯计算，
 * 不 import React、不碰 import.meta、不碰 fs：
 *   - 浏览器端：src/content/posts.js 用 import.meta.glob 拿到原文后调用它
 *   - 构建期：  seo-plugin.js 用 node:fs 读 src/content/posts/*.md 后调用它
 * 两边共用同一套解析，slug / 日期 / 标签 / 排序不会出现分歧。
 *
 * front matter 字段（解析细节见 src/content/frontmatter.js）：
 *   title    文章标题（必填，缺省回退成 slug）
 *   date     发布日期 YYYY-MM-DD（必填，决定排序）
 *   summary  摘要（列表页与 SEO description 用）
 *   tags     标签，数组或逗号分隔字符串
 *   cover    封面图路径（可选，列表页展示）
 *   draft    true 则不进入列表 / 站点地图（仍可用直链预览）
 *   slug     自定义 URL（默认用文件名）
 */

import { parseFrontMatter } from './frontmatter.js';
import { estimateReadingMinutes } from './markdown.js';

const POSTS_DIR = /^\.\/posts\//;

/** './posts/hello-world.md' → 'hello-world' */
export function slugFromPath(filePath) {
    return String(filePath).replace(POSTS_DIR, '').replace(/\.md$/, '');
}

/** 统一成 YYYY-MM-DD 字符串（方便比较、排序与显示） */
export function toDateString(value) {
    if (!value) return '';
    const text = String(value).trim();
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if (match) {
        const pad = (n) => String(n).padStart(2, '0');
        return match[1] + '-' + pad(match[2]) + '-' + pad(match[3]);
    }
    return text;
}

/** 标签既支持 [a, b] 也支持 'a, b' */
export function normalizeTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
    if (typeof value === 'string' && value.trim() !== '') {
        return value.split(',').map((tag) => tag.trim()).filter(Boolean);
    }
    return [];
}

/**
 * 由「文件路径 + Markdown 原文」构建一条文章记录。
 * @param {string} filePath 形如 './posts/hello-world.md'（相对 src/content）
 * @param {string} raw Markdown 原文
 */
export function buildPost(filePath, raw) {
    const { data, body } = parseFrontMatter(raw);
    const slug = data.slug ? String(data.slug) : slugFromPath(filePath);
    const date = toDateString(data.date);

    return {
        slug,
        title: String(data.title || slug),
        date,
        // 排序用：无日期时排到最后
        sortKey: date || '0000-00-00',
        summary: String(data.summary || ''),
        tags: normalizeTags(data.tags),
        cover: data.cover ? String(data.cover) : '',
        draft: data.draft === true,
        minutes: estimateReadingMinutes(body),
        body,
        path: '/blog/' + slug,
    };
}

/** 按日期从新到旧排序（同日期按 slug 倒序，保证顺序稳定） */
export function sortPosts(posts) {
    return posts.slice().sort((a, b) => {
        if (a.sortKey === b.sortKey) return a.slug < b.slug ? 1 : -1;
        return a.sortKey < b.sortKey ? 1 : -1;
    });
}

/**
 * 批量构建并排序。
 * @param {Record<string, string>} fileMap 形如 { './posts/hello-world.md': '原文' }
 */
export function collectPosts(fileMap) {
    return sortPosts(Object.keys(fileMap).map((filePath) => buildPost(filePath, fileMap[filePath])));
}
