/**
 * 房间注册表（Room Registry）—— 全站「版块 / 房间」的唯一数据源
 *
 * 走廊上的门、门牌文字、房间标题、传送坐标、相机自动瞥视位置、地图引脚、
 * 路由与 SEO 元信息，全部从这里派生。
 *
 * 新增一个版块 = 在 ROOMS 里加一项 + 在
 * src/components/canvas/rooms/roomRegistry.jsx 里登记对应的 Room 组件。
 *
 * 约束：本文件必须保持「纯数据」——不要 import React / JSX 组件，
 * 因为构建期的脚本（Node 环境）也需要能安全地读取它。
 */

import { titleWithSite } from './site.js';

export const ROOMS = [
    // ⚠️ 数组顺序 = 走廊门从起点向后的生成顺序（按 corridor.relativeZ 排列），
    //    也是 RoomWarmup 的预热挂载顺序。调整顺序会改变门的生成次序，请谨慎。
    {
        id: 'gallery',
        label: 'THE GALLERY', // 内部标识符：DoorSection / RoomInterior 用它匹配门牌与房间内容

        // ── 走廊门（CorridorSegment 生成位置，DoorSection 渲染门板/门牌）──
        corridor: {
            relativeZ: -18,
            side: 'left',
            icon: '◈',
            color: '#f5efe6',
            doorTexture: '/textures/corridor/doors/drzwiprojekty.webp',
            doorPaintedTexture: '/textures/corridor/doors/drzwiprojekty_painted.webp',
            doorRatio: 0.376,        // 门板贴图宽高比（历史遗留值，勿随意改）
            mirrorDoorOnRight: true, // 门在走廊右侧时是否镜像门板
            sign: {
                layout: 'stacked',   // stacked = 两行门牌 / single = 单行门牌
                lines: ['作品', '集厅'],
                fontSize: 0.25,
                lineOffsets: [-0.02, 0.02],
            },
        },

        // ── 传送与相机 ──
        doorZ: -6,      // segment 0 中该门的全局 Z：10 + relativeZ + 2（TeleportRoom 用）
        warmupPosition: [-20, 0, 0],  // RoomWarmup 屏幕外预热挂载位置（scene 坐标）

        // ── 房间内容（通用房间的兜底标题/副标题）──
        title: '作品集',
        subtitle: '探索我的创意项目',

        // ── 地图引脚（NavigationUI）──
        map: {
            x: 43, y: 72,                       // 地图引脚位置（百分比，见 NavigationUI）
            zone: { left: '10%', top: '57%', width: '30%', height: '35%' },   // 悬停热区（原先散落在 NavigationUI.scss 的 .zone-gallery）
            label: { left: '26%', top: '94%' }, // 常驻标签位置（原先散落在 .map-room-label.gallery）
            paintedLayer: '/images/map_gallery_painted.webp',
            clipExpanded: 'polygon(10% 57%, 40% 57%, 40% 92%, 10% 92%)',
            clipCollapsed: 'polygon(10% 57%, 10% 57%, 10% 92%, 10% 92%)',
        },

        // ── 路由与 SEO（useDocumentMeta）──
        path: '/gallery',

        meta: {
            title: titleWithSite('作品集与项目'),
            description: '浏览我的 3D 项目作品集：每个项目都以手绘卡片呈现，可翻转探索。',
        },

                sr: { name: '作品集', hint: '我的项目和作品' },
    },
    {
        id: 'studio',
        label: 'THE STUDIO',

        corridor: {
            relativeZ: -32,
            side: 'right',
            icon: '▶',
            color: '#e6f5ef',
            doorTexture: '/textures/corridor/doors/drzwisocial.webp',
            doorPaintedTexture: '/textures/corridor/doors/drzwisocial_painted.webp',
            doorRatio: 0.388,
            mirrorDoorOnRight: false, // 该门贴图为非镜像绘制，右侧门不翻转
            sign: {
                layout: 'stacked',
                lines: ['我的', '工作室'],
                fontSize: 0.25,
                lineOffsets: [-0.02, 0.03],
            },
        },

        doorZ: -20,
        warmupPosition: [20, 0, 0],  // RoomWarmup 屏幕外预热挂载位置（scene 坐标）

        title: '工作室',
        subtitle: '观看幕后花絮',

        map: {
            x: 57, y: 55,
            zone: { left: '60%', top: '41%', width: '25%', height: '40%' },
            label: { left: '72%', top: '75%' },
            paintedLayer: '/images/map_studio_painted.webp',
            clipExpanded: 'polygon(60% 41%, 85% 41%, 85% 81%, 60% 81%)',
            clipCollapsed: 'polygon(85% 41%, 85% 41%, 85% 81%, 85% 81%)',
        },

        path: '/studio',

        meta: {
            title: titleWithSite('工作室'),
            description: '在沉浸式 3D 空间中通过悬浮显示器浏览我的内容：视频、文章与短视频。',
        },

                sr: { name: '工作室', hint: '技术和经验' },
    },
    {
        id: 'about',
        label: 'THE ABOUT',

        corridor: {
            relativeZ: -48,
            side: 'left',
            icon: '★',
            color: '#efe6f5',
            doorTexture: '/textures/corridor/doors/drzwiabout.webp',
            doorPaintedTexture: '/textures/corridor/doors/drzwiabout_painted.webp',
            doorRatio: 0.376,
            mirrorDoorOnRight: true,
            sign: {
                layout: 'single',
                text: '关于',
                fontSize: 0.30,
            },
            enterDistance: 25, // 相机深入房间的距离（云层在很远处）
        },

        doorZ: -36,
        warmupPosition: [-20, 0, -50],  // RoomWarmup 屏幕外预热挂载位置（scene 坐标）

        title: '关于',
        subtitle: '',   // 该房间当前没有副标题（沿用原行为）

        map: {
            x: 43, y: 38,
            zone: { left: '10%', top: '20%', width: '30%', height: '35%' },
            label: { left: '26%', top: '28%' },
            paintedLayer: '/images/map_about_painted.webp',
            clipExpanded: 'polygon(10% 20%, 40% 20%, 40% 55%, 10% 55%)',
            clipCollapsed: 'polygon(10% 20%, 10% 20%, 10% 55%, 10% 55%)',
        },

        path: '/about',

        meta: {
            title: titleWithSite('关于我'),
            description: '我的故事、里程碑与技能，以交互式 3D 云层场景呈现。',
        },

                sr: { name: '关于', hint: '我的故事、技能和经历' },
    },
    {
        id: 'contact',
        label: "LET'S CONNECT",

        corridor: {
            relativeZ: -62,
            side: 'right',
            icon: '✉',
            color: '#f5e6e6',
            doorTexture: '/textures/corridor/doors/drzwikontakt.webp',
            doorPaintedTexture: '/textures/corridor/doors/drzwikontakt_painted.webp',
            doorRatio: 0.376,
            mirrorDoorOnRight: true,
            sign: {
                layout: 'single',
                text: '联系',
                fontSize: 0.25,
            },
        },

        doorZ: -50,
        warmupPosition: [20, 0, -50],  // RoomWarmup 屏幕外预热挂载位置（scene 坐标）

        title: '联系我',
        subtitle: '与我取得联系',

        map: {
            x: 57, y: 25,
            zone: { left: '60%', top: '10%', width: '35%', height: '25%' },
            label: { left: '76%', top: '14%' },
            paintedLayer: '/images/map_contact_painted.webp',
            clipExpanded: 'polygon(60% 10%, 95% 10%, 95% 35%, 60% 35%)',
            clipCollapsed: 'polygon(95% 10%, 95% 10%, 95% 35%, 95% 35%)',
        },

        path: '/contact',

        meta: {
            title: titleWithSite('联系方式'),
            description: '在这个交互式 3D 联系房间里找到我的社交媒体链接与联系表单。',
        },

                sr: { name: '联系', hint: '与我取得联系' },
    },
];

// ═══════════════════════════════════════════════════════════════════
// 以下均为从 ROOMS 派生的只读视图，供各组件按需引用
// ═══════════════════════════════════════════════════════════════════

export const ROOM_IDS = ROOMS.map((room) => room.id);

export const getRoomById = (id) => ROOMS.find((room) => room.id === id) || null;

export const getRoomByLabel = (label) => ROOMS.find((room) => room.label === label) || null;

/** DoorSection：label → 门板贴图（含兜底）*/
export const DOOR_TEXTURES = Object.fromEntries(
    ROOMS.map((room) => [room.label, room.corridor.doorTexture])
);

export const DOOR_PAINTED_TEXTURES = Object.fromEntries(
    ROOMS.map((room) => [room.label, room.corridor.doorPaintedTexture])
);

/** TeleportRoom：roomId → 该门在 segment 0 的全局 Z */
export const DOOR_POSITIONS_Z = Object.fromEntries(
    ROOMS.map((room) => [room.id, room.doorZ])
);

/** useInfiniteCamera：相机路过门口时的自动瞥视位置 */
export const CORRIDOR_DOOR_POSITIONS = ROOMS.map((room) => ({
    z: room.corridor.relativeZ,
    side: room.corridor.side,
}));

/** RoomInterior：通用房间的兜底标题 / 副标题（按 label 索引）*/
export const ROOM_TITLES = Object.fromEntries(ROOMS.map((room) => [room.label, room.title]));
export const ROOM_SUBTITLES = Object.fromEntries(ROOMS.map((room) => [room.label, room.subtitle]));

/** useDocumentMeta：虚拟路由与页面元信息 */
export const PATH_TO_ROOM = Object.fromEntries(ROOMS.map((room) => [room.path, room.id]));
export const ROOM_META = Object.fromEntries(
    ROOMS.map((room) => [room.id, { path: room.path, ...room.meta }])
);

/** NavigationUI：地图引脚坐标 */
export const MAP_PIN_ROOMS = ROOMS.map((room) => ({
    id: room.id,
    label: room.sr.name,
    x: room.map.x,
    y: room.map.y,
}));
