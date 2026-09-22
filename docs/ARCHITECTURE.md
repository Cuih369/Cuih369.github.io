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
│   │   └── shaders/              # RevealMaterial / PaintRevealMaterial / RevealBasicMaterial
│   ├── dom/                      # Preloader / PaperTransition（纸张转场）
│   └── ui/                       # NavigationUI(地图) / ScreenReaderOverlay / GlobalOverlay / 成就面板 / 音频控件
├── config/
│   ├── rooms.js                  # ★ 房间注册表（唯一数据源，纯数据无 JSX）
│   ├── sanity.js                 # Sanity 客户端 + 图片 URL 构造
│   └── texturePreloadList.js     # 全部纹理的预加载清单（按场景分组导出）
├── context/                      # SceneContext / AudioManager / AchievementsContext / PerformanceContext
├── hooks/                        # useInfiniteCamera / useSanityData / useDocumentMeta
├── styles/                       # SCSS
└── utils/                        # audioManager / deviceDetect
```

```
public/          # 426 文件 / 97.3 MB（其中 textures 393 文件 / 86.3 MB）+ fonts + sounds + images + robots.txt + sitemap.xml + _headers + _redirects
functions/       # Cloudflare Pages Functions：sanity-cdn/[[catchall]].js（代理 cdn.sanity.io）
portfolio-itom/  # 独立 Sanity Studio（自带 package.json，需单独 npm install；schemaTypes: galleryProject / studioItem / awardCertificate / globalInfo / faq）
scripts/         # 构建期/维护脚本
seo-plugin.js    # 构建期 Vite 插件：抓 Sanity 内容生成 SEO DOM + JSON-LD + llms.txt
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
3. **手动同步静态文件**：`public/sitemap.xml`（新增 `<url>`）、`index.html` 里的 `#seo-content` 静态导航（构建期会被 `seo-plugin.js` 覆盖，但 dev 与兜底场景仍在用）。

其余全部自动跟上。

---

## 7. 内容数据模型

三层结构，任何一个房间都不依赖外部 CMS 也能跑：

1. **Sanity（可选）**：`portfolio-itom/schemaTypes/` 定义 `galleryProject` / `studioItem` / `awardCertificate` / `globalInfo` / `faq`。
2. **取数 hooks**：`src/hooks/useSanityData.js`（`useGalleryProjects` / `useStudioContent` / `useAwards` / `isSanityDataLoaded` 等），带缓存与失败兜底。
3. **组件内回退数据**：例如 `rooms/Studio/contentData.js`、`rooms/About/InfiniteSkyManager.jsx` 里的奖项数组——Sanity 不可用时直接使用。

**实践含义**：要做博客内容，最省事的入口是替换第 3 层回退数据或接入自己的接口，而不必先搭 Sanity。

---

## 8. 资源与性能管线

### 8.1 体积现状

`public/` 共 426 文件 / **97.3 MB**，其中 `public/textures/` 393 文件 / **86.3 MB**。

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

### 9.2 构建期 SEO

`seo-plugin.js` 是一个 Vite 插件，在构建时：

- 抓取 Sanity 内容，生成 `#seo-content` 语义 DOM（爬虫可见）；
- 注入 JSON-LD 结构化数据；
- 生成 `llms.txt`；
- 覆写 `index.html` 的 `<title>` / `<meta name="description">`。

> 注意：`index.html` 里的静态 SEO 文案是**开发期与兜底**用的，生产构建会被插件覆盖。改文案要两边都改。

### 9.3 部署形态

从仓库现有配置看，部署目标是 **Cloudflare Pages**：

- `functions/sanity-cdn/[[catchall]].js`：边缘代理 `cdn.sanity.io`（dev 期由 `vite.config.js` 的 `/sanity-cdn` 代理提供同等行为）；
- `public/_headers`：响应头；
- `public/_redirects`：SPA 回退。

`portfolio-itom/` 是独立的 Sanity Studio，单独安装依赖与部署（自带 `.gitignore`，不影响主站构建）。

---

## 10. 已知坑点与待办

### 10.1 站点域名硬编码（换域名必改）

`https://itomdev.com` 散布在 4 处，共 10+ 行：

| 文件 | 位置 |
| --- | --- |
| `index.html` | `canonical`、`og:url`、`og:image`、`twitter:image` |
| `public/sitemap.xml` | 5 个 `<loc>` |
| `src/hooks/useDocumentMeta.js` | `og:url`、`canonical` |
| `seo-plugin.js` | JSON-LD 的 `@id`（`#person`、`#studio-item-*` 等） |

### 10.2 3D 文字字体

`<Text>` 共 46 处，其中只有 32 处显式指定了 `font`；未指定时 troika 会去 CDN 取默认字体，国内网络下可能失败（表现为字体回退/文字错位）。涉及文件：`CorridorDecorations.jsx`、`CorridorSegment.jsx`、`Door.jsx`、`HeroText.jsx`、`RoomInterior.jsx`、`rooms/Contact/MessagePaper.jsx`。建议逐步补上 `font="/fonts/..."`。

### 10.3 尚未本地化的品牌文案

`index.html` 的 `#seo-content`、`seo-plugin.js` 生成的 SEO 段落、`useDocumentMeta` 的标题、`rooms.js` 的 `meta` 中仍有 `ITom Dev` / `Tomasz Szmajda` 字样，以及 `public/og-image.webp` 等素材。做个人博客时需要整体替换。

### 10.4 死代码 / 可清理项

- `src/hooks/useScrollCamera.js`、`useParallax.js`、`useMouseParallax.js`：**0 引用**，可删。
- `react-router-dom`：依赖列表里有，源码 0 引用。
- `.agent/PROJECT.md` 部分内容已过时（写着 React 18、纹理在 `public/textures/doors/`），阅读时以本文与 `package.json` 为准。

### 10.5 静态文件需手动同步

`public/sitemap.xml` 与 `index.html` 的静态导航列表不会随注册表自动更新（`sitemap.xml` 目前还缺 `/studio` 之外的任何新增房间）。

---

## 11. 改造记录

**2026-09-22 · 中文本地化（24 文件）**
界面文案、门牌、房间标题、SEO/JSON-LD、`llms.txt`、无障碍层、成就与奖项文案；日期改用 `zh-CN` 格式化。保留英文的是品牌与技术名（React / Three.js / GSAP / YouTube / TikTok / GitHub / LinkedIn / Codrops）、项目名与人名。

**2026-09-22 · 房间注册表重构（路线 B，纯结构改动、不动美术）**
新增 `src/config/rooms.js`（纯数据）与 `src/components/canvas/rooms/roomRegistry.jsx`；把走廊门、门牌文字、房间标题、传送坐标、相机瞥视、地图热区/叠加层/标签/引脚、虚拟路由与 SEO 元信息、无障碍导航共 11 处接入点统一到注册表。顺带清场：删除 `localhost_5173-*.html` 页面快照、`tmp/scan_npot.js`、`rooms/About/*.cjs` 调试脚本；`TODO.md`（上游波兰语待办）归档为 `docs/UPSTREAM-TODO.md`；重写 `README.md`。