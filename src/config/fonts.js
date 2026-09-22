/**
 * 3D 文字字体配置（唯一数据源）
 *
 * 背景：drei 的 <Text> 底层是 troika，一段文字只能用一个字体文件渲染。
 * 手写体 Cabin Sketch / Rubik Scribble 没有中文字形，中文会渲染成空白，
 * 所以凡是含中文的 <Text> 都必须换成本地中文字体。
 * 该规则由 src/components/canvas/text/Text.jsx 自动套用，调用点不用自己判断。
 *
 * 字体文件放在 public/fonts/ 下（构建时原样拷贝，页面用绝对路径 /fonts/... 引用）。
 */

/** 手写涂鸦体：标题大字 */
export const SKETCH_FONT_URL = '/fonts/RubikScribble-Regular.ttf';
/** 手写草图体：正文 */
export const HAND_FONT_URL = '/fonts/CabinSketch-Regular.ttf';
/** 手写草图体：加粗标题 */
export const HAND_BOLD_FONT_URL = '/fonts/CabinSketch-Bold.ttf';
/**
 * 中文字体：霞鹜文楷 Lite（LXGW WenKai Lite，SIL OFL 1.1）
 * 覆盖常用汉字、中文标点、箭头与几何符号（▶ ▼ ○ ★ ✓ ← → 等）。
 */
export const CJK_FONT_URL = '/fonts/LXGWWenKaiLite-Regular.ttf';

// 需要走中文字体的字符范围：中日韩符号与标点、假名、汉字、兼容汉字、全角符号
const CJK_PATTERN = /[\u2e80-\u2eff\u3000-\u303f\u3040-\u30ff\u31c0-\u31ef\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/;

/** 把 React 子节点（可能是数组/数字）拼成纯文本，供字体判断使用 */
const toPlainText = (value) => {
    if (Array.isArray(value)) return value.map(toPlainText).join('');
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return '';
};

/** 内容是否含中文（决定用哪个字体） */
export const hasCJK = (value) => CJK_PATTERN.test(toPlainText(value));