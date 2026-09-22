---
title: 从这里开始写第一篇
date: 2026-09-22
summary: 博客怎么用——文章放在哪、front matter 有哪些字段、支持哪些 Markdown 写法，以及它会自动出现在哪些地方。
tags: [使用说明, 写作]
---

这是一篇**示例文章**，它同时也是一份写作说明。看完可以直接把它删掉，换成你自己的内容。

# 一篇文章就是一个 Markdown 文件

在 `src/content/posts/` 目录下新建一个 `.md` 文件即可，文件名就是网址：

```
src/content/posts/hello-world.md   →   /blog/hello-world
```

文件开头是 front matter（`---` 包起来的一段），用来放元信息：

```yaml
---
title: 文章标题            # 必填
date: 2026-09-22          # 必填，决定排序
summary: 列表页与搜索引擎看到的摘要
tags: [随记, 前端]         # 也可以写成多行（- 随记）
cover: /images/cover.webp # 可选封面
draft: false              # 改成 true 就只允许直链预览，不进列表
slug: custom-url          # 可选，自定义网址
---
```

`date` 越新越靠前；`draft: true` 的文章不会出现在列表和 `sitemap.xml` 里，方便先写一半。

# 支持哪些 Markdown 写法

为了不引入额外依赖，本站用一个精简的渲染器（`src/content/markdown.js`），支持常用语法：

- 标题：`#` 到 `######`（`#` 会渲染成 `h2`，因为文章标题已经是 `h1`）
- 强调：`**粗体**`、`*斜体*`、`~~删除线~~`
- 列表：`-` 无序、`1.` 有序（不支持嵌套）
- 引用：`>` 开头
- 代码：行内 `` `code` `` 与三反引号围栏（可标注语言）
- 链接与图片：`[文字](地址)`、`![说明](/images/x.webp)`
- 分隔线：`---`

> 段落内的软换行会自动合并：中文之间不补空格，英文之间补一个空格，所以你可以放心地按屏幕宽度折行。

不支持的语法（表格、脚注、任务列表、直接写 HTML）会原样显示为文本——这样也顺带避免了在 Markdown 里注入脚本。

# 写完会发生什么

保存文件之后，下面这些地方会自动跟上，不需要手动同步：

1. `/blog` 文章列表与文章页 `/blog/<slug>`
2. 构建期生成的 `sitemap.xml` 与结构化数据（JSON-LD）
3. 爬虫可见的隐藏列表（首页 `#seo-content`）

想调整列表页/文章页的样式，看 `src/components/dom/Blog/BlogPage.jsx` 与 `src/styles/BlogPage.scss`。
