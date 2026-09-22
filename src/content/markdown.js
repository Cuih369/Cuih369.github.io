/**
 * 极简 Markdown → HTML 渲染器（纯函数、零依赖，浏览器与 Node 构建脚本共用）
 *
 * 为什么自己写：博客只需要一个可预测的子集，而不想为此引入 marked / markdown-it
 * 这类依赖（体积 + 供应链）。这里先转义 HTML，再插入自己生成的标签，因此天然防 XSS。
 *
 * 支持：
 *   # ~ ######   标题（`#` 映射为 <h2>，因为文章标题本身已是 <h1>）
 *   ```lang      围栏代码块（语言名 → class="language-x"）
 *   > 引用、- / * / + 无序列表、1. 有序列表
 *   --- 分隔线
 *   段落（软换行自动合并；中文之间不补空格，英文之间补空格）
 *   行内：`代码`、**粗体**、*斜体* / _斜体_、~~删除线~~、[链接](url)、![图片](src)、裸 http(s) 链接
 *
 * 不支持（按需再加）：表格、脚注、任务列表、嵌套列表、HTML 直写。
 * 关键约束：本文件不能依赖任何现代运行时 API（只用 indexOf / split / replace 等基础方法），
 * 这样它可以在 Node 构建脚本里跑，也方便用最简工具验证。
 */

var ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
        return ESCAPE_MAP[ch];
    });
}

// 中日韩字符（决定段落内换行要不要补空格）
function isCJK(ch) {
    if (!ch) return false;
    var code = ch.charCodeAt(0);
    return (code >= 0x2e80 && code <= 0x9fff) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe30 && code <= 0xfe4f) ||
        (code >= 0xff00 && code <= 0xffef);
}

// 只允许安全的链接协议，其它（javascript: / data: 等）直接丢弃
function safeUrl(url) {
    var v = String(url || '').trim();
    if (v === '') return '';
    if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
    if (v.charAt(0) === '/' || v.charAt(0) === '#') return v;
    if (v.slice(0, 2) === './' || v.slice(0, 3) === '../') return v;
    return '';
}

/**
 * 行内渲染：先整体转义，再用占位符保护已生成的标签。
 */
export function renderInline(text) {
    if (text == null || text === '') return '';
    var out = escapeHtml(text);
    var tokens = [];

    function stash(html) {
        tokens.push(html);
        return '\u0000' + (tokens.length - 1) + '\u0000';
    }

    // 行内代码（优先，避免内部再被解析）；用成对的反引号做定界符，
    // 因此 `` `code` `` 这种「用双反引号包住单反引号」的写法也能正确渲染
    out = out.replace(/(`+)([\s\S]*?)\1/g, function (m, ticks, code) {
        // CommonMark 规则：定界符内侧各有一个空格时去掉一个
        if (code.length > 2 && code.charAt(0) === ' ' && code.charAt(code.length - 1) === ' ') {
            code = code.slice(1, -1);
        }
        if (code === '') return m;
        return stash('<code>' + code + '</code>');
    });

    // 图片（URL 允许一层成对括号）
    out = out.replace(/!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, alt, src, title) {
        var url = safeUrl(src);
        if (!url) return alt;
        return stash('<img src="' + url + '" alt="' + alt + '"' +
            (title ? ' title="' + title + '"' : '') + ' loading="lazy" />');
    });

    // 链接
    out = out.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, label, href, title) {
        var url = safeUrl(href);
        if (!url) return label;
        var external = /^https?:/i.test(url);
        return stash('<a href="' + url + '"' +
            (title ? ' title="' + title + '"' : '') +
            (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
            '>' + label + '</a>');
    });

    // 粗体 / 斜体 / 删除线
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, function (m, pre, body) {
        return pre + '<em>' + body + '</em>';
    });
    out = out.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, function (m, pre, body) {
        return pre + '<em>' + body + '</em>';
    });
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 裸链接自动识别
    out = out.replace(/(^|[\s(（])(https?:\/\/[^\s<)）]+)/g, function (m, pre, url) {
        return pre + stash('<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>');
    });

    // 还原占位符
    return out.replace(/\u0000(\d+)\u0000/g, function (m, index) {
        return tokens[Number(index)];
    });
}

// 段落内的软换行合并：中文之间不补空格，其它情况补一个空格
function joinLines(parts) {
    var result = '';
    for (var i = 0; i < parts.length; i++) {
        if (i > 0) {
            var prev = result.charAt(result.length - 1);
            var next = parts[i].charAt(0);
            result += (isCJK(prev) || isCJK(next)) ? '' : ' ';
        }
        result += parts[i].trim();
    }
    return result;
}

var RE_FENCE = /^\s*(```+|~~~+)\s*([A-Za-z0-9+#._-]*)\s*$/;
var RE_HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;
var RE_HR = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
var RE_QUOTE = /^\s*>\s?(.*)$/;
var RE_UL = /^\s*[-*+]\s+(.*)$/;
var RE_OL = /^\s*\d+[.)]\s+(.*)$/;
var RE_START = /^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~)/;

/**
 * 渲染整篇 Markdown。
 * @param {string} markdown 正文
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(markdown) {
    var text = String(markdown == null ? '' : markdown)
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '    ');
    var lines = text.split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
        var line = lines[i];

        // 空行
        if (line.trim() === '') {
            i++;
            continue;
        }

        // 围栏代码块
        var fence = RE_FENCE.exec(line);
        if (fence) {
            var marker = fence[1].charAt(0);
            var lang = fence[2];
            var buffer = [];
            i++;
            while (i < lines.length) {
                var closing = RE_FENCE.exec(lines[i]);
                if (closing && closing[1].charAt(0) === marker) {
                    i++;
                    break;
                }
                buffer.push(lines[i]);
                i++;
            }
            out.push('<pre class="md-code"' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : '') +
                '><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>' +
                escapeHtml(buffer.join('\n')) + '</code></pre>');
            continue;
        }

        // 标题（# → h2，避免与文章标题的 h1 冲突）
        var heading = RE_HEADING.exec(line);
        if (heading) {
            var level = Math.min(6, heading[1].length + 1);
            out.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>');
            i++;
            continue;
        }

        // 分隔线
        if (RE_HR.test(line)) {
            out.push('<hr />');
            i++;
            continue;
        }

        // 引用
        var quote = RE_QUOTE.exec(line);
        if (quote) {
            var quoteParts = [];
            while (i < lines.length) {
                var qm = RE_QUOTE.exec(lines[i]);
                if (!qm) break;
                quoteParts.push(qm[1]);
                i++;
            }
            out.push('<blockquote><p>' + renderInline(joinLines(quoteParts)) + '</p></blockquote>');
            continue;
        }

        // 无序列表
        if (RE_UL.test(line)) {
            var ulItems = [];
            while (i < lines.length && RE_UL.test(lines[i])) {
                ulItems.push(RE_UL.exec(lines[i])[1]);
                i++;
            }
            out.push(renderList('ul', ulItems));
            continue;
        }

        // 有序列表
        if (RE_OL.test(line)) {
            var olItems = [];
            while (i < lines.length && RE_OL.test(lines[i])) {
                olItems.push(RE_OL.exec(lines[i])[1]);
                i++;
            }
            out.push(renderList('ol', olItems));
            continue;
        }

        // 段落：连续非空、且不是其它块起始的行
        var paraParts = [];
        while (i < lines.length && lines[i].trim() !== '' && !RE_START.test(lines[i])) {
            paraParts.push(lines[i]);
            i++;
        }
        if (paraParts.length > 0) {
            out.push('<p>' + renderInline(joinLines(paraParts)) + '</p>');
        } else {
            i++; // 兜底，避免死循环
        }
    }

    return out.join('\n');
}

function renderList(tag, items) {
    var html = '<' + tag + '>';
    for (var i = 0; i < items.length; i++) {
        html += '<li>' + renderInline(items[i]) + '</li>';
    }
    return html + '</' + tag + '>';
}

/**
 * 粗略估算阅读时长（分钟）：中文按 350 字/分钟，英文按 200 词/分钟。
 */
export function estimateReadingMinutes(markdown) {
    var text = String(markdown == null ? '' : markdown);
    var cjkCount = 0;
    for (var i = 0; i < text.length; i++) {
        if (isCJK(text.charAt(i))) cjkCount++;
    }
    var words = text.replace(/[\u2e80-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/g, ' ')
        .split(/\s+/).filter(function (w) { return w.length > 1; }).length;
    var minutes = cjkCount / 350 + words / 200;
    return Math.max(1, Math.round(minutes));
}

/**
 * Markdown → 纯文本（构建期给爬虫用的 #seo-content 与 llms.txt 使用）
 *
 * 去掉围栏代码、标题/引用/列表标记与行内标记，只保留可读文字；
 * 段落之间用空行分隔（列表项各自成段），爬虫与 AI 引擎读到的就是干净正文。
 */
export function markdownToPlainText(markdown) {
    var text = String(markdown == null ? '' : markdown).replace(/\r\n/g, '\n');
    var lines = text.split('\n');
    var blocks = [];
    var current = [];
    var inFence = false;

    function flush() {
        if (current.length === 0) return;
        var paragraph = stripInline(joinLines(current));
        if (paragraph) blocks.push(paragraph);
        current = [];
    }

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (RE_FENCE.test(line)) {
            inFence = !inFence;
            flush();
            continue;
        }
        if (inFence) continue;

        if (line.trim() === '' || RE_HR.test(line)) {
            flush();
            continue;
        }

        var heading = RE_HEADING.exec(line);
        if (heading) {
            flush();
            blocks.push(stripInline(heading[2]));
            continue;
        }

        var listItem = RE_QUOTE.exec(line) || RE_UL.exec(line) || RE_OL.exec(line);
        if (listItem) {
            flush();
            blocks.push(stripInline(listItem[1]));
            continue;
        }

        current.push(line);
    }
    flush();

    var result = [];
    for (var j = 0; j < blocks.length; j++) {
        if (blocks[j]) result.push(blocks[j]);
    }
    return result.join('\n\n');
}

/** 去掉一行文字里的行内标记（链接、代码、强调等） */
function stripInline(text) {
    return String(text)
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`{2,}/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/\*([^*\n]+)\*/g, '$1')
        .replace(/^#{1,6}\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export default renderMarkdown;
