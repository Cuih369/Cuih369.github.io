/**
 * front matter 解析（纯函数、零依赖，浏览器与 Node 构建脚本共用）
 *
 * 支持的最小 YAML 子集（够写博客用，刻意不引入 js-yaml）：
 *
 *   ---
 *   title: 文章标题
 *   date: 2026-01-02
 *   summary: 一句话摘要
 *   tags: [随记, 前端]
 *   tags:
 *     - 随记
 *     - 前端
 *   cover: /images/cover.webp
 *   draft: false
 *   ---
 *
 * 支持：字符串（可加引号）、数字、布尔、行内数组 [a, b]、块状数组（- 开头）。
 * 不支持：对象、多行字符串、锚点等——需要时再扩展。
 */

// 去掉包裹的引号
function unquote(value) {
    var v = value;
    if (v.length >= 2) {
        var first = v.charAt(0);
        var last = v.charAt(v.length - 1);
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
            v = v.slice(1, -1);
        }
    }
    return v;
}

// 标量 → JS 值
function parseScalar(raw) {
    var v = raw.trim();
    if (v === '') return '';
    var lower = v.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null' || lower === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return unquote(v);
}

// [a, b, c] → 数组
function parseInlineArray(raw) {
    var inner = raw.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map(function (item) {
        return parseScalar(item);
    });
}

/**
 * 解析 Markdown 文件的 front matter。
 * @param {string} raw 文件原文
 * @returns {{data: Object, body: string}} data 为元信息，body 为正文（不含 front matter）
 */
export function parseFrontMatter(raw) {
    var text = String(raw == null ? '' : raw).replace(/\r\n/g, '\n');
    var data = {};
    var body = text;

    // 必须以 --- 开头才算 front matter
    if (text.slice(0, 3) === '---') {
        var lines = text.split('\n');
        var endIndex = -1;
        for (var i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                endIndex = i;
                break;
            }
        }
        if (endIndex > 0) {
            var currentKey = null;
            for (var j = 1; j < endIndex; j++) {
                var line = lines[j];
                if (line.trim() === '' || line.trim().slice(0, 1) === '#') continue;

                // 块状数组项：  - value
                var itemMatch = /^\s+-\s+(.*)$/.exec(line);
                if (itemMatch && currentKey) {
                    if (!Array.isArray(data[currentKey])) data[currentKey] = [];
                    data[currentKey].push(parseScalar(itemMatch[1]));
                    continue;
                }

                var kvMatch = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
                if (!kvMatch) continue;
                var key = kvMatch[1];
                var value = kvMatch[2];
                currentKey = key;
                if (value.trim() === '') {
                    data[key] = ''; // 可能是块状数组的开头，下面按需改成数组
                } else if (value.trim().charAt(0) === '[' && value.trim().slice(-1) === ']') {
                    data[key] = parseInlineArray(value.trim());
                } else {
                    data[key] = parseScalar(value);
                }
            }
            body = lines.slice(endIndex + 1).join('\n');
        }
    }

    // 去掉正文开头多余的换行
    body = body.replace(/^\n+/, '');
    return { data: data, body: body };
}

export default parseFrontMatter;
