import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlogRoute, useBlogDocumentMeta } from '../../../hooks/useBlogRoute';
import {
    POSTS,
    getPostBySlug,
    getAdjacentPosts,
    getAllTags,
    getPostsByTag,
    formatPostDate,
} from '../../../content/posts';
import { renderMarkdown } from '../../../content/markdown';
import { SITE_NAME, AUTHOR_NAME } from '../../../config/site';
import '../../../styles/BlogPage.scss';

/**
 * BlogPage —— 2D 博客页（入口遮罩 + 文章列表 + 文章正文）
 *
 * 与 3D 场景的关系：
 *   - 路由由 useBlogRoute 管理（/blog 与 /blog/<slug>），3D 场景在遮罩后面继续存在
 *   - 关闭走左侧返回按钮（App 传给 NavigationUI 的 onBackOverride）或页面里的返回链接
 *   - 文章数据全部来自 src/content/posts.js（即 src/content/posts/*.md）
 */

const BlogPage = () => {
    const { open, slug, openBlogIndex, openPost, closeBlog } = useBlogRoute();
    useBlogDocumentMeta(open, slug);

    // 进场/退场动画：open 变 false 时先把 visible 关掉，动画结束再卸载
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(open);
    // 退场动画期间 slug 已经变成 null，这里缓存一份，避免内容闪回列表
    const [shownSlug, setShownSlug] = useState(slug);
    const containerRef = useRef(null);

    useEffect(() => {
        if (open) {
            setMounted(true);
            setShownSlug(slug);
            const frame = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(frame);
        }
        setVisible(false);
        const timer = setTimeout(() => setMounted(false), 320);
        return () => clearTimeout(timer);
    }, [open, slug]);

    // 打开时把焦点移进遮罩，键盘用户可以直接滚动/切换
    useEffect(() => {
        if (open && containerRef.current) {
            containerRef.current.focus({ preventScroll: true });
        }
    }, [open]);

    // Esc 关闭（与左侧返回按钮等价）
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') closeBlog();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, closeBlog]);

    const [activeTag, setActiveTag] = useState(null);

    const tags = useMemo(() => getAllTags(), []);
    const posts = useMemo(() => getPostsByTag(activeTag), [activeTag]);

    const post = shownSlug ? getPostBySlug(shownSlug) : null;
    const { newer, older } = post ? getAdjacentPosts(post.slug) : { newer: null, older: null };
    const html = useMemo(() => (post ? renderMarkdown(post.body) : ''), [post]);

    if (!mounted) return null;

    return (
        <div
            className={`blog-page ${visible ? 'is-visible' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="博客"
        >
            <div className="blog-backdrop" aria-hidden="true" />

            <div className="blog-scroll" ref={containerRef} tabIndex={-1}>
                <div className="blog-shell">
                    <header className="blog-masthead">
                        <a
                            className="blog-brand"
                            href="/blog"
                            onClick={(event) => {
                                event.preventDefault();
                                openBlogIndex();
                            }}
                        >
                            {SITE_NAME}
                        </a>
                        <span className="blog-brand-note">写于 {AUTHOR_NAME} 的可滚动纸页</span>
                    </header>

                    {post ? (
                        <PostView
                            post={post}
                            html={html}
                            newer={newer}
                            older={older}
                            openPost={openPost}
                            openBlogIndex={openBlogIndex}
                            closeBlog={closeBlog}
                        />
                    ) : (
                        <IndexView
                            posts={posts}
                            allCount={POSTS.length}
                            tags={tags}
                            activeTag={activeTag}
                            setActiveTag={setActiveTag}
                            missingSlug={shownSlug}
                            openPost={openPost}
                            closeBlog={closeBlog}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

/** 文章列表 */
const IndexView = ({ posts, allCount, tags, activeTag, setActiveTag, missingSlug, openPost, closeBlog }) => (
    <>
        <div className="blog-hero">
            <h1>文章</h1>
            <p>
                共 {allCount} 篇。这里记录我做过的东西、踩过的坑，以及关于 3D 网页的一些想法。
            </p>
        </div>

        {missingSlug && (
            <div className="blog-notice">
                找不到名为 <code>{missingSlug}</code> 的文章。
            </div>
        )}

        {tags.length > 0 && (
            <nav className="blog-tags" aria-label="按标签筛选">
                <button
                    type="button"
                    className={`blog-tag ${activeTag === null ? 'is-active' : ''}`}
                    aria-pressed={activeTag === null}
                    onClick={() => setActiveTag(null)}
                >
                    全部
                </button>
                {tags.map((entry) => (
                    <button
                        key={entry.tag}
                        type="button"
                        className={`blog-tag ${activeTag === entry.tag ? 'is-active' : ''}`}
                        aria-pressed={activeTag === entry.tag}
                        onClick={() => setActiveTag(entry.tag)}
                    >
                        {entry.tag}
                        <span className="blog-tag-count">{entry.count}</span>
                    </button>
                ))}
            </nav>
        )}

        {posts.length === 0 ? (
            activeTag ? (
                <p className="blog-empty">
                    标签「{activeTag}」下还没有文章。
                    <button type="button" className="blog-link-btn blog-empty-reset" onClick={() => setActiveTag(null)}>
                        查看全部
                    </button>
                </p>
            ) : (
                <p className="blog-empty">
                    还没有文章。在 <code>src/content/posts/</code> 里新建一个 <code>.md</code> 文件即可。
                </p>
            )
        ) : (
            <ul className="blog-list">
                {posts.map((item) => (
                    <li key={item.slug}>
                        <a
                            className="blog-card"
                            href={item.path}
                            onClick={(event) => {
                                event.preventDefault();
                                openPost(item.slug);
                            }}
                        >
                            {item.cover && (
                                <img className="blog-card-cover" src={item.cover} alt="" loading="lazy" decoding="async" />
                            )}
                            <div className="blog-card-body">
                                <h2>{item.title}</h2>
                                <p className="blog-card-meta">
                                    <time dateTime={item.date}>{formatPostDate(item.date)}</time>
                                    <span className="blog-dot" aria-hidden="true" />
                                    <span>约 {item.minutes} 分钟</span>
                                </p>
                                {item.summary && <p className="blog-card-summary">{item.summary}</p>}
                                {item.tags.length > 0 && (
                                    <p className="blog-card-tags">
                                        {item.tags.map((tag) => (
                                            <span key={tag} className="blog-chip">{tag}</span>
                                        ))}
                                    </p>
                                )}
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        )}

        <footer className="blog-footnote">
            <button type="button" className="blog-link-btn" onClick={() => closeBlog()}>
                ← 回到 3D 场景
            </button>
        </footer>
    </>
);

/** 单篇文章 */
const PostView = ({ post, html, newer, older, openPost, openBlogIndex, closeBlog }) => (
    <>
        <nav className="blog-crumbs" aria-label="面包屑">
            <button type="button" className="blog-link-btn" onClick={() => openBlogIndex()}>
                ← 全部文章
            </button>
        </nav>

        <article className="blog-post">
            <header className="blog-post-head">
                <h1>{post.title}</h1>
                <p className="blog-card-meta">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                    <span className="blog-dot" aria-hidden="true" />
                    <span>约 {post.minutes} 分钟</span>
                    {post.draft && <span className="blog-chip blog-chip-draft">草稿</span>}
                </p>
                {post.tags.length > 0 && (
                    <p className="blog-card-tags">
                        {post.tags.map((tag) => (
                            <span key={tag} className="blog-chip">{tag}</span>
                        ))}
                    </p>
                )}
            </header>

            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />
        </article>

        <nav className="blog-adjacent" aria-label="相邻文章">
            {older ? (
                <a
                    href={older.path}
                    className="blog-adjacent-link"
                    onClick={(event) => {
                        event.preventDefault();
                        openPost(older.slug);
                    }}
                >
                    <span className="blog-adjacent-label">上一篇</span>
                    <span className="blog-adjacent-title">{older.title}</span>
                </a>
            ) : (
                <span />
            )}
            {newer ? (
                <a
                    href={newer.path}
                    className="blog-adjacent-link is-next"
                    onClick={(event) => {
                        event.preventDefault();
                        openPost(newer.slug);
                    }}
                >
                    <span className="blog-adjacent-label">下一篇</span>
                    <span className="blog-adjacent-title">{newer.title}</span>
                </a>
            ) : (
                <span />
            )}
        </nav>

        <footer className="blog-footnote">
            <button type="button" className="blog-link-btn" onClick={() => closeBlog()}>
                ← 回到 3D 场景
            </button>
        </footer>
    </>
);

export default BlogPage;
