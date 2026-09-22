# 个人博客 · 交互式 3D WebGL 前端

> 从 [ITomPoland/portfolio-itom](https://github.com/ITomPoland/portfolio-itom) 派生改造而成的个人博客项目。
> 改造方向：整站中文本地化 + 房间注册表化（数据驱动）+ 博客内容接入。
> 架构说明见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

一个沉浸式 3D 网站：用户从门口进入，穿过一条无限延伸的手绘走廊，走廊两侧的门分别通往不同「房间」（栏目）。
整体视觉为手绘黑白速写风格。

## 房间（栏目）

| 房间 | 路由 | 内容形态 |
|------|------|----------|
| 作品集 The Gallery | `/gallery` | 晾衣绳上挂着手绘项目卡片，点击可翻转查看 |
| 工作室 The Studio | `/studio` | 无限堆叠的悬浮显示器（YouTube / 博客 / TikTok 等内容） |
| 关于 The About | `/about` | 在云层中飞行，途中经过奖项、里程碑与技术气球 |
| 联系 Let's Connect | `/contact` | 码头场景，漂浮木桶承载社交链接，另有一张可填写的信纸表单 |

## 技术栈

- **React 19** + **React Three Fiber 9**（Three.js 0.182）负责 3D 渲染
- **@react-three/drei** 提供 `useTexture` / `Html` 等辅助组件；3D 文字统一走 `src/components/canvas/text/Text.jsx`（含中文时自动切换本地中文字体）
- **GSAP** 负责相机与界面动画
- **Vite 7** 构建，**SCSS** 样式，**vite-plugin-compression** 产出压缩资源
- **Sanity** 作为内容源（Headless CMS），构建期通过 `seo-plugin.js` 拉取内容生成 SEO DOM 与 JSON-LD
- **PostHog** 埋点，**Web3Forms** 承载联系表单提交

## 本地开发

需要 Node.js 20+。

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:5173
npm run build      # 生产构建
npm run preview    # 预览构建产物（性能测试请用这个，不要用 dev）
npm run lint       # ESLint
```

> 项目包含数百张高分辨率纹理（`public/textures` 约 86 MB）与一个 13 MB 的中文字体（`public/fonts/LXGWWenKaiLite-Regular.ttf`），dev 环境首次加载会偏慢属正常现象。

## 目录结构

```
src/
├── components/
│   ├── canvas/            # 全部 3D 内容
│   │   ├── corridor/      # 走廊：分段、门、房间内景、传送
│   │   ├── entrance/      # 进门体验
│   │   ├── rooms/         # 四个房间内部 + roomRegistry.jsx（房间组件映射）
│   │   └── shaders/       # 自定义着色器材质
│   ├── dom/               # 2D 覆盖层（Preloader、纸张转场）
│   └── ui/                # 导航、地图、成就、音频控件、无障碍层
├── config/
│   ├── rooms.js           # ★ 房间注册表：走廊门 / 门牌 / 标题 / 传送坐标 / 地图 / 路由与 SEO 的唯一数据源
│   ├── site.js            # ★ 站点配置：域名 / 站名 / 作者 / 社交链接（换域名、换站名只改这里）
│   ├── fonts.js           # ★ 3D 文字字体路径 + 中文字符判断
│   ├── sanity.js          # Sanity 客户端配置
│   └── texturePreloadList.js
├── context/               # SceneContext（全局状态机）、音频、成就、性能分级
├── hooks/                 # 相机、Sanity 数据、文档元信息
└── styles/                # SCSS（按组件拆分 + 基础变量/混入）
public/                    # 纹理、字体、音效、地图、robots.txt、_headers、_redirects
                           # （sitemap.xml 由构建期生成，不在仓库里）
functions/                 # Cloudflare Pages Functions（Sanity CDN 代理）
portfolio-itom/            # 独立的 Sanity Studio（在它自己的目录里 npm install / npm run dev）
```

## 新增一个房间

1. 在 `src/config/rooms.js` 的 `ROOMS` 数组里加一项（走廊位置、门牌文字、标题、地图引脚、路由与 SEO 元信息）。
2. 在 `src/components/canvas/rooms/roomRegistry.jsx` 里注册对应的房间组件。
3. 从 `ROOMS` 派生的门、门牌、标题、传送坐标、相机瞥视、地图热区/引脚、虚拟路由、屏幕阅读器导航、`sitemap.xml`、构建期 SEO 片段都会自动跟上。

> 唯一需要留意的静态文件是 `index.html` 里的 `#seo-content`（仅 dev 与禁用 JS 时使用，构建期会被插件整段重写）。

## 换成你自己的博客（必改清单）

| 事项 | 位置 | 说明 |
|------|------|------|
| 域名 / 站名 / 作者 / 社交链接 | `src/config/site.js` | `SITE_URL`、`SITE_NAME`、`AUTHOR_*`、`SOCIAL_URLS`。社交链接留空则「联系方式」房间不渲染对应木桶 |
| 站点地图地址 | `public/robots.txt` | 换域名后同步 Sitemap 行 |
| 预览域名防收录 | `public/_headers` | 按注释取消 `X-Robots-Tag: noindex` 并填项目名 |
| 联系表单 | 环境变量 `VITE_WEB3FORMS_KEY` | 到 [Web3Forms](https://web3forms.com) 申领自己的 key；预览域名可用 `VITE_EXTRA_ALLOWED_ORIGINS` 放行（本地 localhost 始终放行） |
| 内容源 | `src/config/sanity.js`、`portfolio-itom/` | 默认仍是上游的 Sanity 项目（`kv5wjjmj`），建议换成自己的项目 |
| 示例内容 | `rooms/Gallery/GalleryRoom.jsx`、`rooms/About/InfiniteSkyManager.jsx`、`rooms/Studio/contentData.js` | 目前是上游作者的示例作品/奖项，**必须替换成你自己的**（见 `docs/ARCHITECTURE.md` §10.3） |
| 分享图 | `public/og-image.png` | 1200×630 占位图（纯文字，无美术素材）；换成自己的图后同步 `index.html` 与 `seo-plugin.js` 里的 `og:image` |
| 素材版权 | `public/textures/**` | 上游手绘素材版权归原作者，长期公开发布请替换 |

## 与上游的关系

- 代码以 **MIT 许可**发布，原始版权归 **Tomasz Szmajda**（见 [`LICENSE`](LICENSE)）。
- ⚠️ 上游明确声明：**个人素材、3D 纹理、图片与文案版权归 Tomasz Szmajda 所有，未经授权不得复用**。若本项目要长期公开发布，请替换这些素材。
- 上游仓库地址：https://github.com/ITomPoland/portfolio-itom
- 已清理：站点域名（`https://itomdev.com`）、Search Console 验证标签、社交与内容外链等品牌痕迹已全部移除或改为占位（域名统一收敛到 `src/config/site.js`）。
- 字体：`public/fonts/LXGWWenKaiLite-Regular.ttf`（霞鹜文楷 Lite）以 **SIL OFL 1.1** 分发，许可证见 `public/fonts/OFL-LXGWWenKaiLite.txt`。