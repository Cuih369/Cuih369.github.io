# 字体清单

3D 文字（drei `<Text>` → troika）与 2D 界面用到的字体文件。**一段 3D 文字只能用一个字体文件**，
含中文的内容必须使用中文字体，相关约定见 `src/config/fonts.js` 与
`src/components/canvas/text/Text.jsx`。

| 文件 | 字体 | 用途 | 许可 |
|------|------|------|------|
| `RubikScribble-Regular.ttf` | Rubik Scribble | 走廊大字（作者名首字母） | SIL OFL 1.1 |
| `CabinSketch-Regular.ttf` | Cabin Sketch | 手写正文 | SIL OFL 1.1 |
| `CabinSketch-Bold.ttf` | Cabin Sketch Bold | 手写标题、门牌 | SIL OFL 1.1 |
| `FrederickatheGreat-Regular.ttf` | Fredericka the Great | 装饰标题 | SIL OFL 1.1 |
| `LXGWWenKaiLite-Regular.ttf` | 霞鹜文楷 Lite（LXGW WenKai Lite） | **中文**：汉字、中文标点、箭头与几何符号 | SIL OFL 1.1，见 `OFL-LXGWWenKaiLite.txt` |
| `SatisfySL.json` | — | 非字体文件（字形数据） | — |

## 中文字体来源

- 名称：LXGW WenKai Lite（霞鹜文楷 Lite），版本 v1.522
- 仓库：https://github.com/lxgw/LxgwWenKai-Lite
- 下载：https://github.com/lxgw/LxgwWenKai-Lite/releases/latest/download/LXGWWenKaiLite-Regular.ttf
- 覆盖范围：常用汉字（GB 子集）+ 中文标点 + `▶ ▼ ○ ★ ✓ ← → ═` 等符号；**不含** emoji（📝 🎵 ⭐）与 `◈ ✉ ✨ ❌ ⏱ ⚙ ⛵`。
- 体积约 13 MB：这是中文可用的代价。若要瘦身，可用 `fonttools` 按本站实际用到的字符集做子集化：
  ```bash
  pip install fonttools brotli
  pyftsubset LXGWWenKaiLite-Regular.ttf \
    --text-file=<(cat src/**/*.jsx src/**/*.js | grep -o . | sort -u | tr -d '\n') \
    --flavor=woff2 --output-file=LXGWWenKaiLite-subset.woff2
  ```
  （troika 支持 woff2，但要求轮廓为 TrueType/glyf——本字体符合。）