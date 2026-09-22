/**
 * useBlogRoute —— 博客页面的「迷你路由」
 *
 * 全站只有两类页面：
 *   1. 3D 场景（走廊 + 房间），路由由 useDocumentMeta 管理
 *   2. 2D 博客页（/blog、/blog/<slug>），路由由本文件管理
 *
 * 两者共用 History API，通过 history.state.page 区分：
 *   房间/走廊 → { room: <roomId|null> }
 *   博客页    → { page: 'blog', slug: <slug|null> }
 *
 * 状态放在模块级（不需要 Provider）：App、useDocumentMeta 与页面组件都要读它。
 */

import { useEffect, useSyncExternalStore } from 'react';
import { getPostBySlug } from '../content/posts.js';
import { PATH_TO_ROOM } from '../config/rooms.js';
import { SITE_NAME, SITE_DESCRIPTION } from '../config/site.js';

const BLOG_PATH = '/blog';

/** 去掉末尾斜杠的路径 */
function normalizePath(path) {
    return String(path || '/').replace(/\/+$/, '') || '/';
}

function isBlogPath(path) {
    const p = normalizePath(path);
    return p === BLOG_PATH || p.indexOf(BLOG_PATH + '/') === 0;
}

function roomIdFromPath(path) {
    const key = normalizePath(path);
    return PATH_TO_ROOM[key] !== undefined ? PATH_TO_ROOM[key] : null;
}

function readLocationState() {
    const path = normalizePath(window.location.pathname);
    if (path === BLOG_PATH) return { open: true, slug: null };
    if (path.indexOf(BLOG_PATH + '/') === 0) {
        let slug = path.slice(BLOG_PATH.length + 1);
        try {
            slug = decodeURIComponent(slug);
        } catch {
            /* 非法编码时保持原样 */
        }
        return { open: true, slug: slug || null };
    }
    return { open: false, slug: null };
}

let state = readLocationState();

/**
 * 进入博客前的落脚点：关闭博客时回到这里。
 * 打开博客的瞬间从当前 URL / history.state 抓取，避免关闭时再去猜。
 */
let returnTarget = { path: '/', room: null };

function captureReturnTarget() {
    const path = normalizePath(window.location.pathname);
    if (isBlogPath(path)) return; // 已经在博客页里跳转，不要把返回目标改成博客
    const historyState = window.history.state;
    const room = historyState && 'room' in historyState ? historyState.room : roomIdFromPath(path);
    returnTarget = { path, room };
}

const listeners = new Set();

function setState(next) {
    state = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

const getSnapshot = () => state;

/** 供其它模块判断（不触发重渲染），例如 useDocumentMeta */
export const isBlogOpen = () => state.open;

/** 打开文章列表 */
export function openBlogIndex() {
    if (state.open && !state.slug) return; // 已在列表页，不重复压栈
    captureReturnTarget();
    window.history.pushState({ page: 'blog', slug: null }, '', BLOG_PATH + '/');
    setState({ open: true, slug: null });
}

/** 打开某篇文章 */
export function openPost(slug) {
    if (state.open && state.slug === slug) return;
    captureReturnTarget();
    window.history.pushState({ page: 'blog', slug }, '', BLOG_PATH + '/' + slug);
    setState({ open: true, slug });
}

/**
 * 关闭博客，回到 3D 场景。
 * @param {{path?: string, room?: string|null}} [target] 目标页面，默认回到打开博客前的位置
 */
export function closeBlog(target) {
    const dest = target || returnTarget;
    const path = normalizePath((dest && dest.path) || '/');
    const room = dest && 'room' in dest ? dest.room : null;
    // 用 pushState：浏览器后退键仍然可以回到刚才读的文章
    window.history.pushState({ room }, '', path);
    setState({ open: false, slug: null });
}

// 浏览器前进/后退：博客与房间互相切换
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', (event) => {
        const eventState = event.state || {};
        if (eventState.page === 'blog') {
            setState({ open: true, slug: eventState.slug || null });
            return;
        }
        // 没有 state（例如直接粘贴网址）时看当前路径
        setState(readLocationState());
    });
}

/** 订阅博客路由状态 */
export function useBlogRoute() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return {
        open: snapshot.open,
        slug: snapshot.slug,
        openBlogIndex,
        openPost,
        closeBlog,
    };
}

/** 只要「是否在博客页」的布尔值（useDocumentMeta 用） */
export function useIsBlogOpen() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).open;
}

/**
 * 博客页的 document meta：标题、描述、canonical、og:url。
 * 房间那边的 meta 由 useDocumentMeta 负责，二者互斥（见 useDocumentMeta 的 isBlogOpen 判断）。
 */
export function useBlogDocumentMeta(open, slug) {
    useEffect(() => {
        if (!open) return;
        const post = slug ? getPostBySlug(slug) : null;
        const title = post ? post.title + ' — ' + SITE_NAME : '文章 — ' + SITE_NAME;
        const description = post && post.summary ? post.summary : SITE_DESCRIPTION;
        const path = normalizePath(window.location.pathname);
        const origin = window.location.origin;

        document.title = title;
        const setMeta = (selector, attr, value) => {
            const el = document.querySelector(selector);
            if (el) el.setAttribute(attr, value);
        };
        setMeta('meta[name="description"]', 'content', description);
        setMeta('meta[property="og:title"]', 'content', title);
        setMeta('meta[property="og:description"]', 'content', description);
        setMeta('meta[property="og:url"]', 'content', origin + path);
        setMeta('link[rel="canonical"]', 'href', origin + path);
    }, [open, slug]);
}

export { BLOG_PATH };
