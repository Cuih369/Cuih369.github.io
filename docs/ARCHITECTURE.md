# 架构说明（ARCHITECTURE）

> 面向长期维护：本文记录仓库的**真实结构**、关键数据契约与已知坑点，改动前请先读 §6 与 §10。
> 上游项目：<https://github.com/ITomPoland/portfolio-itom>（MIT，作者 Tomasz Szmajda）
> 最后更新：2026-09-22

---

## 1. 项目定位

交互式 3D 单页站点：从大门进入 → 穿过无限延伸的手绘走廊 → 两侧的门通往四个「房间」（栏目）。
全部 3D 内容由 React Three Fiber 以代码描述，**没有任何外部 3D 模型文件**（无 glTF/FBX），只有贴图与音效。

相对上游的改造目标：

1. 界面 / SEO / 无障碍文案中文化；
2. 房间数据注册表化（`src/config/rooms.js`），把原先散落在 8 个文件里的硬编码收敛为单一数据源；
3. 面向个人博客继续演进（内容接入、路由、品牌替换）。

---

## 2. 技术栈与运行时

| 类别 | 选型 |
| --- | --- |
| UI | React 19.2（`react` / `react-dom`） |
| 3D | `three` 0.182 + `@react-three/fiber` 9.4 + `@react-three/drei` 10.7（`Text` / `useTexture` / `Html` / `PositionalAudio`） |
| 动画 | GSAP 3.14（含 `@gsap/react`） |
| 构建 | Vite 7.2 + `vite-plugin-compression` + 自研 Vite 插件 `seo-plugin.js` |
| 样式 | SCSS（`sass`），按组件拆分 + `_variables` / `_mixins` / `_base` |
| 内容源 | Sanity：`@sanity/client` 7.23 + `@sanity/image-url`；Studio 独立在 `portfolio-itom/` |
| 其他 | `posthog-js`（埋点）、`jimp` / `sharp`（构建期图片处理）、`r3f-perf`（性能面板）、`vara`（预备阶段手绘动画） |

命令：`npm run dev`（默认 <http://localhost:5173>）、`npm run build`、`npm run preview`、`npm run lint`；需要 Node 20+。

> ⚠️ `react-router-dom` 出现在 `dependencies` 中，但 `src/` 内 **0 处引用**。本项目用的是 History API 自实现的虚拟路由（见 §9）。

---

## 3. 目录结构

```
src/
├── main.jsx / App.jsx            # 入口：SceneProvider + <canvas> + 2D HUD 挂载
├── components/
│   ├── canvas/
│   │   ├── corridor/             # 走廊：CorridorSegment / DoorSection / RoomInterior / InfiniteCorridorManager
│   │   │                         #      TeleportRoom / RoomWarmup / CorridorWalls / LoopDoors / SegmentDoors / Doodles
│   │   ├── entrance/             # 进门体验：EntranceDoors / SignSystem / EmptyCorridor
│   │   ├── rooms/
│   │   │   ├── About/            # 云层飞行 + 奖项 + 里程碑（InfiniteSkyManager / StoryMilestone / SkyChunk / PaperAirplane）
│   │   │   ├── Contact/          # 码头 + 木桶社交链接 + 信纸表单（MessagePaper / SocialBarrel / TornPaperGeometry）
│   │   │   ├── Gallery/          # 晾衣绳项目卡（PaperMaterial / usePaintMaterial / GalleryClouds）
│   │   │   ├── Studio/           # 悬浮显示器塔（contentData.js 为回退内容）
│   │   │   └── roomRegistry.jsx  # ★ roomId → 房间组件映射（必须静态导入，见 §8.3）
│   │   ├── shaders/              # RevealMaterial / PaintRevealMaterial / RevealBasicMaterial
│   │   └── text/Text.jsx         # ★ 3D 文字统一入口：含中文自动切中文字体（见 §6.5）
│   ├── dom/                      # Preloader / PaperTransition（纸张转场）
│   │   └── Blog/BlogPage.jsx     # ★ 2D 博客页：列表 + 正文（/blog、/blog/<slug>，见 §7.1）
│   └── ui/                       # NavigationUI(地图/返回/博客入口) / ScreenReaderOverlay / GlobalOverlay / 成就面板 / 音频控件
├── config/
│   ├── rooms.js                  # ★ 房间注册表（唯一数据源，纯数据无 JSX）
│   ├── site.js                   # ★ 站点配置：域名 / 站名 / 作者 / 社交链接（见 §6.5）
│   ├── fonts.js                  # ★ 字体路径 + 「内容是否含中文」判断（见 §6.5）
│   ├── sanity.js                 # Sanity 客户端 + 图片 URL 构造
│   └── texturePreloadList.js     # 全部纹理的预加载清单（按场景分组导出）
├── content/                      # ★ 博客文章（唯一数据源就是 posts/ 下的 .md）
│   ├── posts/*.md                #   一篇文章 = 一个 Markdown 文件（front matter + 正文）
│   ├── posts.js                  #   浏览器端取数：import.meta.glob(?raw) → ALL_POSTS / POSTS / 查询函数
│   ├── postRecord.js             #   纯函数：原文 → 文章记录（构建期 seo-plugin.js 复用同一套）
│   ├── frontmatter.js            #   零依赖 front matter 解析
│   └── markdown.js               #   零依赖 Markdown 渲染 + 纯文本抽取 + 阅读时长
├── context/                      # SceneContext / AudioManager / AchievementsContext / PerformanceContext
├── hooks/                        # useInfiniteCamera / useSanityData / useDocumentMeta / useBlogRoute
├── styles/                       # SCSS（BlogPage.scss 为博客页样式）
└── utils/                        # audioManager / deviceDetect
```

```
public/          # ~430 文件 / 110 MB（textures 393 / 86.3 MB + 中文字体 13.2 MB）+ fonts + sounds + images
                 # _headers + _redirects（sitemap.xml 与 robots.txt 改为构建期生成，见 §9.2）
functions/       # Cloudflare Pages Functions：sanity-cdn/[[catchall]].js（代理 cdn.sanity.io）
portfolio-itom/  # 独立 Sanity Studio（自带 package.json，需单独 npm install；schemaTypes: galleryProject / studioItem / awardCertificate / globalInfo / faq）
scripts/         # 构建期/维护脚本
seo-plugin.js    # 构建期 Vite 插件：抓 Sanity 内容 + 读本地 Markdown 文章，生成 SEO DOM + JSON-LD + llms.txt + sitemap.xml
vite.config.js   # react() + viteCompression() + generateSeoHtml()，dev 期 /sanity-cdn 代理
```

---

## 4. 交互流程与状态机

### 4.1 体验流程

1. `entrance/` 进门口动画（`EntranceDoors`）→ `enterExperience()` 置 `hasEntered = true`
2. `Preloader` 期间 `RoomWarmup` 在屏幕外预热全部房间（§8.3）
3. 走廊阶段由 `useInfiniteCamera` 接管相机：滚动前进 + 鼠标视差 + 经过门口自动瞥视
4. 点门 → `DoorSection` 开门动画 → `RoomInterior` 挂载房间组件 → 房间自行控制相机
5. 房间内请求退出 → 相机退回走廊 → 关门

### 4.2 SceneContext（`src/context/SceneContext.jsx`，174 行）

| 状态 | 含义 |
| --- | --- |
| `currentRoom` | `null` = 走廊；否则为房间 id（`gallery` / `studio` / `about` / `contact`） |
| `hasEntered` | 是否已通过入口门 |
| `exitRequested` / `requestExit()` | 请求离开房间 |
| `overlayContent` | 覆盖层内容（如 Studio 点击显示器后的详情） |
| `teleportTarget` / `teleportTo(roomId)` | 地图/无障碍层触发的传送目标 |
| `isTeleporting` / `teleportPhase` | 传送阶段：`'closing'` → `'teleporting'` → `'opening'` → `null` |
| `pendingDoorClick` | 传送落位后需要自动「点击」的门 |
| `isFastTeleport` | 快速传送（跳过纸张展开动画，纸张保持闭合） |

`isInRoom` 为派生值（`currentRoom !== null`）。

---

## 5. 走廊与相机数学

全部为 Three.js 世界单位，Y 轴向上。

- 走廊分段：`SEGMENT_LENGTH = 80`；第 i 段起点 `zOffset = 10 - 80 * i`（segment 0：Z 从 +10 到 -70）
- 锯齿墙：`WALL_X_OUTER = 3.5`、`WALL_X_INNER = 1.7`、`DOOR_Z_SPAN = 4`，墙倾角 `atan2(1.8, 4) ≈ 24°`；走廊高 `3.5`
- 门（段内相对 Z）：`gallery -18` / `studio -32` / `about -48` / `contact -62`；左右交替 left/right/left/right
- 门的全局 Z：`10 + relativeZ + 2` → segment 0 落在 `-6 / -20 / -36 / -50`（即注册表里的 `doorZ`，`TeleportRoom` 用它把相机瞬移到门前 8 单位处）
- 相机起始 `Z = 28`（`useInfiniteCamera` 的 `targetZ` / `currentZ` 初值），逐帧平滑逼近
- 开门时的相机对齐参数在 `DoorSection`：`DOOR_ALIGN_X = 1.2`、`DOOR_LOOK_ANGLE = Math.PI * 0.334`
- `about` 房间需要更深的进入距离：`enterDistance = 25`

---

## 6. 房间注册表（核心契约）

`src/config/rooms.js` 是**全站房间数据的唯一来源**。约束：必须是**纯数据**，不得 import React / JSX —— 因为构建期 Node 脚本（`seo-plugin.js` 一类）也要能安全读取。

### 6.1 `ROOMS` 每项字段

| 字段 | 说明 |
| --- | --- |
| `id` | 房间 id（同时也用作路由与遥测标识） |
| `label` | **内部标识符**（如 `'THE GALLERY'`），用于匹配门牌与房间内容；展示文案一律走 `sr.name` / `title` |
| `corridor.relativeZ` | 段内相对 Z |
| `corridor.side` | `'left'` / `'right'`（决定门的位置、镜像规则与地图展开方向） |
| `corridor.icon` / `color` | 门上小图标与配色 |
| `corridor.doorTexture` / `doorPaintedTexture` | 门板线稿贴图 / 上色贴图（悬停笔刷揭示） |
| `corridor.doorRatio` | 门板贴图宽高比（历史遗留值，别随手改） |
| `corridor.mirrorDoorOnRight` | 门贴在右墙时是否镜像（贴图本身若已镜像则填 `false`） |
| `corridor.sign` | 门牌文字：`{ layout: 'stacked', lines, fontSize, lineOffsets }` 或 `{ layout: 'single', text, fontSize }` |
| `corridor.enterDistance` | 可选，相机深入房间的距离 |
| `doorZ` | segment 0 中该门的全局 Z（= `10 + relativeZ + 2`） |
| `title` / `subtitle` | 通用房间内景的兜底标题/副标题 |
| `map` | 地图数据：`x`/`y`（引脚百分比）、`zone`（悬停热区内联几何）、`label`（常驻标签位置）、`paintedLayer` + `clipExpanded`/`clipCollapsed`（彩色叠加层的展开/收起裁剪路径） |
| `path` / `meta` | 虚拟路由路径与 SEO title/description |
| `sr` | 屏幕阅读器用 `name` / `hint` |
| `warmupPosition` | `RoomWarmup` 屏幕外预热挂载坐标 |

### 6.2 从 `ROOMS` 派生的导出

`ROOM_IDS`、`getRoomById`、`getRoomByLabel`、`DOOR_TEXTURES`、`DOOR_PAINTED_TEXTURES`、`DOOR_POSITIONS_Z`、`CORRIDOR_DOOR_POSITIONS`、`ROOM_TITLES`、`ROOM_SUBTITLES`、`PATH_TO_ROOM`、`ROOM_META`、`MAP_PIN_ROOMS`。

### 6.3 已接入注册表的组件（11 处接入点）

| 文件 | 用途 |
| --- | --- |
| `components/canvas/corridor/CorridorSegment.jsx` | 段内门定义（位置/左右/图标/颜色/进房距离） |
| `components/canvas/corridor/DoorSection.jsx` | 门板贴图、`doorId` 反查、`doorRatio`、镜像规则、门牌文字渲染器 |
| `components/canvas/corridor/RoomInterior.jsx` | 房间组件分发 + 标题/副标题 + 通用房间兜底信号 |
| `components/canvas/corridor/RoomWarmup.jsx` | 预热挂载列表（组件顺序 = `ROOMS` 声明顺序） |
| `components/canvas/corridor/TeleportRoom.jsx` | 传送落位 `DOOR_POSITIONS_Z` |
| `hooks/useInfiniteCamera.js` | 经过门口的自动瞥视位置 |
| `components/ui/NavigationUI.jsx` | 地图热区、彩色叠加层、常驻标签、引脚 |
| `components/ui/ScreenReaderOverlay.jsx` | 无障碍导航列表、当前房间名称、快速导航 |
| `hooks/useDocumentMeta.js` | 虚拟路由与页面元信息（含 `og:url` / `canonical`） |
| `components/canvas/rooms/roomRegistry.jsx` | roomId → 房间组件（新增） |

### 6.4 新增一个房间的步骤

1. 在 `ROOMS` 里加一项（走廊位置、门牌文字、标题、地图数据、`path`/`meta`、`sr`、`warmupPosition`）；数组顺序同时决定走廊门的生成顺序与预热顺序。
2. 实现房间组件，并在 `roomRegistry.jsx` 注册。
3. **可选**：`index.html` 里的 `#seo-content` 静态导航（dev 期与禁用 JS 时的兜底；构建期由 `seo-plugin.js` 按注册表整段重写）。`sitemap.xml` 已改为构建期生成，**无需手动同步**。

其余全部自动跟上。

### 6.5 站点配置与 3D 文字字体

两处「改一个地方、全站生效」的配置，都在 `src/config/`。

**`site.js` —— 站点级唯一数据源**

| 导出 | 用途 | 主要读取方 |
| --- | --- | --- |
| `SITE_URL` | canonical / og:url / og:image / JSON-LD / sitemap 的绝对地址 | `seo-plugin.js`、`useDocumentMeta.js`、`MessagePaper.jsx` |
| `SITE_NAME`、`SITE_LOCALE`、`SITE_DESCRIPTION` | 站名、语言、站点描述 | 同上 |
| `AUTHOR_NAME`、`AUTHOR_HANDLE`、`AUTHOR_GITHUB_URL` | 作者署名（JSON-LD、无障碍层） | `seo-plugin.js`、`ScreenReaderOverlay.jsx` |
| `SOCIAL_URLS`、`socialUrl(id)` | 「联系方式」房间水面木桶的链接；**留空的平台不渲染** | `ContactRoom.jsx` |
| `siteBase()`、`titleWithSite(page)` | 去尾斜杠的根地址；`页面 — 站名` 标题 | 全站 |

- 构建期可用环境变量 `SITE_URL` 或 `CF_PAGES_URL` 覆盖域名，无需改代码；浏览器端 canonical/og:url 用 `window.location.origin`，本地与预览域名都不会写错。
- **换域名 / 换站名**：只改 `src/config/site.js`（或设环境变量 `SITE_URL` / `CF_PAGES_URL`）→ 完成。`index.html` 的静态占位、`seo-plugin.js` 的 JSON-LD、`sitemap.xml` 与 `robots.txt` 的 Sitemap 行都从这里派生，没有第二处要手改的域名。

**`fonts.js` + `text/Text.jsx` —— 中文能不能显示的关键**

drei 的 `<Text>` 底层是 troika，一段文字只能用**一个**字体文件渲染，而手写体 Cabin Sketch / Rubik Scribble **不含中文字形**（直接用会把中文渲染成空白）。所以：

- 所有 3D 文字都从 `src/components/canvas/text/Text.jsx` 引入 `Text`（不要再直接从 `@react-three/drei` 引入）。包装组件用 `hasCJK()` 判断内容：含中文 → 切到本地中文字体 `CJK_FONT_URL`；否则原样沿用调用点传入的 `font`。
- 字体放在 `public/fonts/`：`LXGWWenKaiLite-Regular.ttf`（霞鹜文楷 Lite，SIL OFL 1.1，13.2 MB；覆盖常用汉字、中文标点与 `▶ ▼ ○ ★ ✓ ← →` 等符号，许可证见 `public/fonts/OFL-LXGWWenKaiLite.txt`）。
- 未覆盖的字符：emoji（📝 🎵 📷 ⭐）与 `◈ ✉ ✨ ❌` 等少数符号，字形可用性取决于在线回退服务（见 §10.2）；把门牌/图标换成中文字体里有的符号即可完全本地化。
- 新增 3D 文字：从 `text/Text.jsx` 引入即可，不用自己判断中文。
- 另外，`index.html` 还从 Google Fonts 加载 2D 界面字体（Caveat / Gloria Hallelujah / Inter）。2D 文本取不到字体时浏览器会**优雅回退**到系统字体（不像 troika 那样渲染空白），故暂未自托管；若要完全离线可用，可把这三个字体也放进 `public/fonts/` 并改用 `@font-face`。

---

## 7. 内容数据模型

三层结构，任何一个房间都不依赖外部 CMS 也能跑：

1. **Sanity（可选）**：`portfolio-itom/schemaTypes/` 定义 `galleryProject` / `studioItem` / `awardCertificate` / `globalInfo` / `faq`。
2. **取数 hooks**：`src/hooks/useSanityData.js`（`useGalleryProjects` / `useStudioContent` / `useAwards` / `isSanityDataLoaded` 等），带缓存与失败兜底。
3. **组件内回退数据**：例如 `rooms/Studio/contentData.js`、`rooms/About/InfiniteSkyManager.jsx` 里的奖项数组——Sanity 不可用时直接使用。

**实践含义**：要做博客内容，最省事的入口是替换第 3 层回退数据或接入自己的接口，而不必先搭 Sanity。

### 7.1 博客文章（Markdown）——本项目的主内容源

房间里的内容是「作品集」，文章则是博客的主体。文章**不经过 Sanity**，直接是仓库里的文件：

```
src/content/posts/hello-world.md   →   /blog/hello-world
```

**新增一篇文章 = 新建一个 .md 文件**，不需要改任何代码。它随后会自动出现在：`/blog` 列表、`/blog/<slug>` 正文页、构建期的 `sitemap.xml`、JSON-LD（`Blog` + `BlogPosting`）、`#seo-content` 隐藏列表与 `llms.txt`。

| front matter | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题（缺省回退成文件名） |
| `date` | ✅ | `YYYY-MM-DD`，同时决定排序（越新越靠前）与 `lastmod` |
| `summary` | | 列表页摘要 + SEO description |
| `tags` | | `[a, b]` 或 `a, b`，也可写成多行 `- a` |
| `cover` | | 封面图路径（可选） |
| `draft` | | `true` 时不出现在列表 / sitemap，仍可用直链预览 |
| `slug` | | 自定义网址（默认用文件名） |

**数据流（两侧共用同一套解析，不会出现分歧）**

```
src/content/posts/*.md
  ├── 浏览器：posts.js（import.meta.glob '?raw'）──┐
  └── 构建期：seo-plugin.js（node:fs 读目录）──────┤
                                                 └→ postRecord.js（解析 / slug / 日期 / 标签 / 排序）
                                                      ├→ BlogPage.jsx 渲染
                                                      └→ sitemap.xml · JSON-LD · #seo-content · llms.txt
```

- `frontmatter.js` / `markdown.js` / `postRecord.js` 都是**零依赖纯函数**（不使用 `import.meta`、不 import React、只用基础 API），所以能在 Vite、Node 构建脚本里同时跑。
- 渲染器刻意只支持一个 Markdown 子集：标题（`#` 映射为 `h2`，文章标题已是 `h1`）、围栏代码、行内代码、引用、有序/无序列表、分隔线、`**粗体**`/`*斜体*`/`~~删除线~~`、链接/图片/裸链接。**不支持**表格、脚注、任务列表、嵌套列表与直写 HTML（会原样显示，顺带避免注入脚本）。先转义再插标签，`javascript:` 之类的链接会被丢弃。

**路由**（`src/hooks/useBlogRoute.js`）

- 模块级 store + `useSyncExternalStore`，不需要 Provider；App、`useDocumentMeta` 与页面都能读。
- 与 3D 路由共用 History API，靠 `history.state` 区分：房间是 `{ room }`，博客是 `{ page: 'blog', slug }`。
- `useDocumentMeta` 在博客打开时**直接 return**（并跳过 `popstate` 处理），否则房间逻辑会把 URL / 标题改回去；博客自己的 meta 由 `useBlogDocumentMeta` 负责。
- 打开博客时记下「落脚点」（当前 path + room），关闭时 `pushState` 回该地址——好处是浏览器后退键仍能回到刚读的文章。

**与 3D 场景的关系**：博客是盖在 canvas 之上的固定遮罩（`z-index: 200`），3D 场景在背后继续存在。打开时 App 给 `NavigationUI` 传 `onBackOverride`：返回按钮改为「关闭遮罩」，其余面板（地图/音频/成就）隐藏，并由 `.navigation-ui.over-blog` 把整个 UI 提到 `z-index: 300`，让返回按钮浮在遮罩之上。

---

## 8. 资源与性能管线

### 8.1 体积现状

`public/` 共约 430 文件 / **110 MB**：`public/textures/` 393 文件 / **86.3 MB**（绝大头）+ 中文字体 `LXGWWenKaiLite-Regular.ttf` **13.2 MB**。

> 中文字体是「中文能不能显示」的前提（见 §6.5）。它只在 3D 文字首次出现时加载（troika 按需拉取），但 13.2 MB 仍是本仓库最重的单个文件；想瘦身可用 `fonttools` 按本站用到的字符集做子集化（本机无 Node/Python 环境，暂未做）。

### 8.2 纹理命名约定

- 每张可交互贴图多为**成对**存在：`x.webp`（线稿，默认显示）与 `x_painted.webp`（上色版，悬停时用笔刷 shader 揭示）。
- 门板贴图位于 `public/textures/corridor/doors/`（**不是** `public/textures/doors/`，`.agent/PROJECT.md` 里这条已过时）。

### 8.3 预热与预加载

- `RoomWarmup` 在预加载阶段把**全部房间**挂在 `[0, -500, 0]` 的屏幕外，等 `isSanityDataLoaded()` 后调用 `gl.compileAsync(scene, camera, scene)` 预编译着色器并上传纹理，然后卸载。
- 因此 `roomRegistry.jsx` **必须静态导入**：改成 `lazy()` / 动态 import 会把预热推迟到首次进房的那一刻，第一帧必卡。
- 低端设备（`PerformanceContext` 分级）直接跳过预热，避免 WebGL Context Lost。
- `config/texturePreloadList.js` 是预加载清单；`Preloader` 的进度按并发请求数回写 DOM。

### 8.4 设备分级

`utils/deviceDetect.js` + `PerformanceContext` 依据 `deviceMemory` / 硬件并发数 / 视口尺寸调整 `dpr`、抗锯齿与纹理加载严格度；`isTouchDevice()` 还会让触摸设备跳过部分上色贴图（用 1px 占位图替代）。

---

## 9. 虚拟路由、构建期 SEO 与部署

### 9.1 虚拟路由

`useDocumentMeta` 用 History API 把房间映射成真实 URL（`/gallery`、`/studio`、`/about`、`/contact`）并同步 `document.title`、`meta[name=description]`、`og:*`、`link[rel=canonical]`，同时处理浏览器前进/后退（`popstate`）。`getInitialRoomFromUrl()` 支持深链直达。

博客页（`/blog`、`/blog/<slug>`）走另一套更轻的路由 `src/hooks/useBlogRoute.js`（见 §7.1）；两套路由共用 History API，靠 `history.state` 区分，互不干扰。

### 9.2 构建期 SEO

`seo-plugin.js` 是一个 Vite 插件，在构建时：

- 抓取 Sanity 内容，生成 `#seo-content` 语义 DOM（爬虫可见，整段替换 `index.html` 的静态占位）；
- **读取 `src/content/posts/*.md`**（`node:fs`，复用 `postRecord.js`），把文章标题/日期/摘要追加进 `#seo-content`；
- 注入 JSON-LD 结构化数据（作者、房间列表、项目条目，以及 `Blog` + 每篇一个 `BlogPosting`）；
- 生成 `llms.txt`（含「博客文章」清单）；
- **从 `ROOMS` 与文章生成 `sitemap.xml`**（新增房间 / 新增文章都自动进站点地图，无需手动维护；文章 `lastmod` = 发布日期）；
- **生成 `robots.txt`**（爬虫白名单见 `ROBOTS_ALLOWED_AGENTS`，Sitemap 地址取自 `SITE_BASE`——换域名不会出现 robots 指向旧域名的不一致；dev 期由插件中间件提供同一份内容）；
- 覆写 `index.html` 的 `<title>` / `<meta name="description">` / `canonical` / `og:url` / `og:image` / `twitter:image`。

> 博客这部分**不依赖 Sanity**：即使 Sanity 抓取失败（`catch` 分支），文章仍会带着自己的 JSON-LD 注入 SEO 输出。

站点域名来自 `src/config/site.js`（`SITE_URL`），构建期可用环境变量 `SITE_URL` 或 `CF_PAGES_URL` 覆盖。

> 注意：`index.html` 里的静态 SEO 文案是**开发期与兜底**用的，生产构建会被插件覆盖。改文案要两边都改。

### 9.3 部署形态

站点当前发布在 **GitHub Pages（用户站点）**：<https://cuih369.github.io/>

| 项 | 值 |
| --- | --- |
| 仓库 | `Cuih369/Cuih369.github.io`（**仓库名必须是 `<用户名>.github.io`**，理由见下） |
| 工作流 | `.github/workflows/deploy-pages.yml`（push `main` 自动部署，也可手动 `workflow_dispatch`） |
| 发布源 | 仓库 Settings → Pages → Source = **GitHub Actions** |
| 站点地址 | `src/config/site.js` 的 `SITE_URL`（唯一来源，canonical / og / sitemap / robots 全跟着走） |

工作流四步：`npm ci`（Node 22）→ `npm run build` → 冒烟检查 `dist/{index.html,404.html,sitemap.xml,robots.txt,llms.txt}` → `upload-pages-artifact` + `deploy-pages`。产物约 110 MB，大头是 `public/textures`（约 86 MB）与中文字体（13 MB）。

⚠️ **为什么必须是「用户站点」仓库名**：GitHub 只把 `<用户名>.github.io` 这个仓库发布在域名根路径。若换成普通仓库名（例如 `blog`），站点会落在 `https://<用户名>.github.io/blog/` 子路径，而站内约 450 处根绝对路径（`/textures/...`、`/fonts/...`，散落在 JSX 字符串与模板字面量里，Vite 的 `base` 不会改写它们）都会 404，前端路由 `/blog` 还会与部署前缀撞名。真要走子路径，需要同时做三件事：`vite.config.js` 加 `base`、把运行时资源路径统一走 `import.meta.env.BASE_URL`（three 的加载器可统一挂 `THREE.DefaultLoadingManager.resolveURL`）、路由加 base 前缀。**不推荐**，所以本项目选择用户站点。

纯静态托管的两个已知差异：

- `functions/sanity-cdn/[[catchall]].js`（Cloudflare Pages Function）**不生效**。因此 `src/config/sanity.js` 的反代改为按需开启：dev 默认走 `vite.config.js` 的 `/sanity-cdn` 代理，生产默认直连 `cdn.sanity.io`（要改回代理就设 `VITE_SANITY_CDN_PROXY`）。
- `public/_headers`、`public/_redirects` 只有 Cloudflare Pages 认，GitHub Pages 直接忽略（不报错）。SPA 深链回退改由 `seo-plugin.js` 的 `closeBundle()` 把 `dist/index.html` 复制成 `dist/404.html` 实现：访问 `/blog`、`/blog/<slug>`、`/gallery` 时返回 HTTP 404 + 这份 HTML，浏览器地址不变，前端路由接管（Cloudflare 那边仍由 `_redirects` 兜底，两者不冲突）。

换/加部署平台的注意点：`_headers`、`_redirects`、`functions/` 都还在仓库里，Cloudflare Pages 形态没有被破坏。

`portfolio-itom/` 是独立的 Sanity Studio，单独安装依赖与部署（自带 `.gitignore`，不影响主站构建）。

---

## 10. 已知坑点与待办

### 10.1 站点域名：已收敛到 `src/config/site.js`（✅ 已解决）

换域名只改 `SITE_URL` 一处；构建期还可用环境变量 `SITE_URL` / `CF_PAGES_URL` 覆盖。派生位置：

| 文件 | 说明 |
| --- | --- |
| `index.html` | 静态占位（title/description/canonical/og:/twitter:），构建期由 `seo-plugin.js` 重写 |
| `seo-plugin.js` | JSON-LD `@id`、canonical、`og:url`、`og:image`、Sitemap 行、`sitemap.xml` |
| `src/hooks/useDocumentMeta.js` | 运行时 canonical / `og:url`（用 `window.location.origin`） |
| `seo-plugin.js` 的 `buildRobotsTxt()` | `robots.txt` 全文（构建期写入 dist，dev 期由中间件提供） |

当前值：`SITE_URL = 'https://cuih369.github.io'`（GitHub Pages 用户站点根路径，见 §9.3）；部署工作流里**不写死域名**，所以换域名（含以后绑定自定义域名）依然只改这一处。

⚠️ 迁移自上游的 `itomdev.com` 域名已全部替换。`public/_headers` 里的预览域名防收录只在 Cloudflare Pages 生效（GitHub Pages 不认 `_headers`）。

### 10.2 3D 文字字体（✅ 中文已本地化，剩少数符号）

已建立 `src/config/fonts.js` + `src/components/canvas/text/Text.jsx`：含中文的 `<Text>` 自动使用本地中文字体，不再依赖在线字体 CDN。仍受在线回退服务影响的是**中文字体里没有的符号**：emoji（📝 🎵 📷 ⭐）与 `◈ ✉ ✨ ❌`、`⏱ ⚙ ⛵` 等。这些字符目前靠 troika 的在线 unicode 回退（国内网络可能取不到 → 显示空白）。要彻底本地化，把 `rooms.js` 的 `corridor.icon` 与各处图标换成字体覆盖的符号（`◆ ▶ ★ ✓` 等）即可。

### 10.3 尚未替换的示例内容（做博客必须自己写）

文案/品牌已中文化并换成占位站点信息，但**示例数据仍是上游作者的作品**，需要你自己替换：

- `rooms/Gallery/GalleryRoom.jsx` 的回退项目数组：上游作品 `YOUNG MULTI` 及其外链（`young-multi-strona.netlify.app`）。
- `rooms/About/InfiniteSkyManager.jsx` 的奖项/里程碑数据：上游作者的真实奖项条目与外链（`awwwards`、`thefwa`、GSAP SOTD 的 LinkedIn 帖等）。
- `rooms/Studio/contentData.js`：38 条示例条目（标题/播放量是编造的，`url` 已改为平台首页占位）。
- `public/og-image.png`（1200×630）已换成纯文字占位图（不含上游美术素材）；换成自己的分享图后记得同步 `index.html` 与 `seo-plugin.js` 里的 `og:image`。
- `public/textures/**` 是上游手绘素材（`README` 与 `LICENSE` 已注明版权不可复用，长期公开发布建议替换）。
- ⚠️ **Sanity 数据集仍是上游项目**（`src/config/sanity.js` 与 `seo-plugin.js` 里的 `projectId: 'kv5wjjmj'`）：作品/奖项/工作室条目以及站点标题、描述都在运行时与构建期从上游数据集实时拉取，所以线上首页的 `<title>` / `og:title` / `og:description` 目前仍是上游作者的信息（2026-09-23 实测为 `ITom – Award-Winning Creative Developer | Interactive Websites`），与 `src/config/site.js` 里的站名不一致。要么换成自己的 Sanity 项目（并同步 `projectId`），要么按 §7 改走本地数据。

### 10.4 死代码 / 可清理项

- ✅ 已删：`src/hooks/useScrollCamera.js`、`useParallax.js`、`useMouseParallax.js`（0 引用）、`CorridorSegment.jsx` 里的调试 `#segmentIndex` 文字、`App.jsx` 未使用的 `Text` 导入、`public/sitemap.xml`（改为构建期生成）。
- ⏳ 待清理（需要 `npm install` 重新生成 `package-lock.json`，离线环境做不了，故本轮保留）：`react-router-dom`、`r3f-perf`、`vara`、`@gsap/react`、`@react-three/postprocessing` —— 源码 0 引用。清理步骤：删 `package.json` 对应依赖 → `npm install` → 提交新的 lock。
- `.agent/PROJECT.md` 部分内容仍偏上游视角（纹理目录、房间清单），阅读时以本文与 `package.json` 为准。

### 10.5 新增房间时仍需手动处理的事

- `index.html` 的 `#seo-content`：仅 dev 与无 JS 兜底用，构建期会被重写，可选维护。
- 若新房间用了新的中文字符集之外的符号，注意 §10.2 的字体覆盖问题。

---

## 11. 改造记录

**2026-09-22 · 中文本地化（24 文件）**
界面文案、门牌、房间标题、SEO/JSON-LD、`llms.txt`、无障碍层、成就与奖项文案；日期改用 `zh-CN` 格式化。保留英文的是品牌与技术名（React / Three.js / GSAP / YouTube / TikTok / GitHub / LinkedIn / Codrops）、项目名与人名。

**2026-09-22 · 房间注册表重构（路线 B，纯结构改动、不动美术）**
新增 `src/config/rooms.js`（纯数据）与 `src/components/canvas/rooms/roomRegistry.jsx`；把走廊门、门牌文字、房间标题、传送坐标、相机瞥视、地图热区/叠加层/标签/引脚、虚拟路由与 SEO 元信息、无障碍导航共 11 处接入点统一到注册表。顺带清场：删除 `localhost_5173-*.html` 页面快照、`tmp/scan_npot.js`、`rooms/About/*.cjs` 调试脚本；`TODO.md`（上游波兰语待办）归档为 `docs/UPSTREAM-TODO.md`；重写 `README.md`。

**2026-09-22 · 品牌占位化 + 中文显示修复（字体/域名/死代码）**
- 新增 `src/config/site.js`（域名/站名/作者/社交链接）与 `src/config/fonts.js`；`seo-plugin.js`、`useDocumentMeta.js`、`rooms.js`、`ScreenReaderOverlay.jsx`、`MessagePaper.jsx`（表单来源白名单）全部改为从站点配置派生，域名可在构建期用 `SITE_URL` / `CF_PAGES_URL` 覆盖；`sitemap.xml` 改为构建期从 `ROOMS` 生成，删除手写的 `public/sitemap.xml`。
- 3D 文字：新增 `src/components/canvas/text/Text.jsx`（含中文自动切本地字体）并把 16 个文件的 `<Text>` 导入切到该模块；新增中文字体 `public/fonts/LXGWWenKaiLite-Regular.ttf`（霞鹜文楷 Lite，OFL）+ 许可证；`Door.jsx` 的门牌与箭头改用本地字体，不再依赖在线字体 CDN。
- 分享图：`public/og-image.webp`（上游作品截图）换成纯文字占位图 `public/og-image.png`，同步 `index.html` 与 `seo-plugin.js` 的 `og:image`。
- 品牌文案：走廊大字 `ITOM` → `CUiH`、关于页署名、无障碍层标题、`localStorage` 成就键等；「联系方式」房间的社交木桶改为 `SOCIAL_URLS` 驱动（未填链接的平台不渲染）；工作室回退数据里的 28 条外链换成平台首页占位；`Google Search Console` 验证标签、`public/_headers`/`_redirects` 的域名硬编码、Sanity Studio 标题与包名一并清理。
- 死代码：删调试用的 `#segmentIndex` 文字、`App.jsx` 未使用的 `Text` 导入；未使用的 npm 依赖保留待 `npm install` 时一并清理（见 §10.4）。

**2026-09-22 · 博客内容接入（Markdown 文章 → 阅读页 → 构建期 SEO）**
- 内容层：新增 `src/content/`——`posts/*.md`（文章）、`frontmatter.js`（零依赖 front matter 解析）、`markdown.js`（零依赖 Markdown 渲染 + `markdownToPlainText` + 阅读时长）、`postRecord.js`（原文 → 文章记录，浏览器与构建期共用）、`posts.js`（`import.meta.glob` 的 `?raw` 取数）。新增两篇示例文章（写作说明 + 设计取舍），可直接删除。
- 路由：新增 `src/hooks/useBlogRoute.js`（模块级 store + `useSyncExternalStore`），`/blog` 与 `/blog/<slug>` 与房间路由共用 History API 并通过 `history.state` 区分；关闭博客时 `pushState` 回打开前的落脚点（后退键仍能回到文章）。`useDocumentMeta` 在博客打开时跳过 URL/meta 写入，避免两边打架。
- UI：新增 `src/components/dom/Blog/BlogPage.jsx`（入口遮罩 + 列表 + 正文 + 标签筛选 + 上一篇/下一篇；进场/退场动画、焦点转移、Esc 关闭）与 `src/styles/BlogPage.scss`（沿用纸质手绘风格，中文正文用本地霞鹜文楷）；`App.jsx` 挂载遮罩；`NavigationUI` 新增 `onBackOverride`（打开博客时返回按钮变「关闭遮罩」、隐藏其它面板、加 `.over-blog` 提到 `z-index: 300`）与「阅读博客」按钮；`ScreenReaderOverlay` 增加 `/blog` 链接。
- 构建期 SEO：`seo-plugin.js` 用 `node:fs` 读 `src/content/posts/*.md`（复用 `postRecord.js`），把文章写进 `sitemap.xml`（含每篇的 `lastmod` 与 `changefreq`）、JSON-LD（`Blog` + `BlogPosting`）、`llms.txt` 与 `#seo-content`；这部分放在 Sanity 的 `try/catch` 之外，Sanity 不可用时文章照样进 SEO。`index.html` 静态兜底同步补上 `/blog`。
- 顺带修复：`markdown.js` 的行内代码规则改为成对反引号定界（用双反引号包住单个反引号的写法之前会漏出多余反引号）；`markdownToPlainText` 的标题曾错误输出 `#`。

**2026-09-23 · robots.txt 改为构建期生成**
- 删除 `public/robots.txt`，改由 `seo-plugin.js` 的 `buildRobotsTxt()` 在构建期生成（爬虫白名单见 `ROBOTS_ALLOWED_AGENTS`，Sitemap 地址取自 `SITE_BASE`）。这样换域名只需改 `src/config/site.js`，或设 `SITE_URL` / `CF_PAGES_URL` 环境变量，不会再出现「robots.txt 指向旧域名、sitemap.xml 在新域名」的不一致。
- dev 期由 `configureServer` 中间件在 `/robots.txt` 提供同一份内容（与既有的 `/llms.txt` 一致），所以删掉 public 里的文件后本地仍能查看。

**2026-09-23 · 接入 GitHub Pages 部署**
- 仓库改名为 `Cuih369.github.io`（用户站点 → 域名根路径），Pages 发布源设为 **GitHub Actions**；线上地址 <https://cuih369.github.io/>。改名理由与子路径部署的代价见 §9.3。
- 新增 `.github/workflows/deploy-pages.yml`：`npm ci`（Node 22）+ `npm run build` + 产物冒烟检查（index/404/sitemap/robots/llms）+ `upload-pages-artifact` / `deploy-pages`，并在部署前 `touch dist/.nojekyll`。并发组 `github-pages`，不打断进行中的发布。
- `seo-plugin.js`：新增 `configResolved` 记录 `command` / `build.outDir`；新增 `closeBundle()`，构建期把 `dist/index.html` 复制成 `dist/404.html`（纯静态托管的 SPA 深链回退）。
- `src/config/sanity.js`：Sanity CDN 反代改为按需开启（`VITE_SANITY_CDN_PROXY`；dev 默认开、生产默认关），否则 GitHub Pages 上 Sanity 图片会全部 404。
- `SITE_URL` 改为 `https://cuih369.github.io`，`index.html` 里 4 处静态占位（canonical / og:url / og:image / twitter:image）同步替换，仓库内不再有 `example.com` 残留。
- 线上验收（curl，经代理）：`/` 200；`/blog`、`/blog/<slug>`、`/gallery` 返回 404 + 与 `index.html` 完全相同的 404.html（SPA 回退生效）；`/textures/paper-texture.webp`、`/fonts/LXGWWenKaiLite-Regular.ttf`、`/images/map.webp`、`/favico.png`、`/og-image.png`、`/llms.txt` 全部 200；`sitemap.xml` / `robots.txt` 域名正确且含两篇示例文章；生产包内 `/sanity-cdn` 出现 0 次、`cdn.sanity.io` 正常。
- 遗留：Sanity 仍是上游数据集，线上标题/文案为上游作者信息（见 §10.3）。
