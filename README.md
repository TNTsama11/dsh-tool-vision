# dsh-tool-vision

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件，解决 DSH 使用视觉模型的一大痛点：通常需要手动切换模型。它注册一个 `vision` 工具，让纯文本 Agent 按需调用 **DeepSeek-V4-Flash-Vision-Exp** 看图——无需手动切换。

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin that solves a common DSH pain point: using the vision model normally means manually switching models per session. It registers a `vision` tool so a text-only agent can call **DeepSeek-V4-Flash-Vision-Exp** to see images on demand — no manual switching.

- [中文](#中文)
- [English](#english)

---

## 中文

### 功能

注册一个模型工具：

- `vision(image_path, prompt?)` — 读取 PNG/JPEG/WebP/GIF 文件，把它连同可选的提示词一起发给 `deepseek-v4-flash-vision-exp`，返回纯文本描述或回答。

因为当前对话模型可能不接受图像输入，调用 `vision` 就能让 Agent 按需「看图」。

### 前置条件

- 一个运行中的 DeepSeek Harness，需具备：
  - `fs`、`attachments`、`llm` 宿主服务（DSH 标配）。
  - `deepseek-official` 提供者下可用 `deepseek-v4-flash-vision-exp` 模型（即已配置 `DEEPSEEK_API_KEY`）。

### 安装

插件是一个无需 import 的单文件，preset 可用相对路径加载它。

1. 把 `tool-vision.js` 复制到你的 agent preset 目录（例如 `~/.dsh/.agent-presets/<你的-preset>/`）。
2. 在该 preset 的 `agent.cordis.yml` 里加一行：

```yaml
- id: tool-vision
  name: ./tool-vision.js
```

3. 在该 preset 上开启会话，Agent 即拥有 `vision` 工具。

### 用法

Agent 需要看图时会自行调用：

- `vision(image_path="screenshot.png", prompt="报错信息是什么？")`
- `vision(image_path="photo.jpg")`（默认做完整详细描述）

### 原理

`tool-vision` 只消费宿主服务、不发布任何服务，因此该行无需 `isolate` realm：

1. `fs` 读取图片字节（PNG/JPEG/WebP/GIF）。
2. `attachments.saveImage` 提交一个持久化图片引用。
3. `llm.stream` 把用户消息（`text` + `image` 块）发给 `deepseek-official` / `deepseek-v4-flash-vision-exp`。
4. 流式返回的文本交给 Agent。

### 示例

![test image](test.jpg)

```text
vision(image_path="test.jpg", prompt="用两三句话描述这张图。")
```

返回：

> 这是一幅赛博朋克风格的夜景插画，密集的摩天大楼闪烁着五颜六色的霓虹灯光，未来感十足。风雪交加的天桥上，两个渺小的身影并肩站着，静静眺望着远方这座冰冷而迷人的城市。暖黄色的街灯与冷色调的雨雪相互映衬，营造出既孤独又唯美的氛围。

---

## English

### What it does

Registers one model tool:

- `vision(image_path, prompt?)` — reads a PNG/JPEG/WebP/GIF file, sends it to `deepseek-v4-flash-vision-exp` together with an optional prompt, and returns a plain-text description or answer.

Because the current chat model may not accept image input, calling `vision` lets the agent "see" on demand.

### Requirements

- A running DeepSeek Harness with:
  - `fs`, `attachments`, and `llm` host services (standard in DSH).
  - The `deepseek-official` provider with the `deepseek-v4-flash-vision-exp` model available (i.e. a configured `DEEPSEEK_API_KEY`).

### Install

The plugin is a single import-free file that a preset can load by relative path.

1. Copy `tool-vision.js` into your agent preset directory (e.g. `~/.dsh/.agent-presets/<your-preset>/`).
2. Add one row to that preset's `agent.cordis.yml`:

```yaml
- id: tool-vision
  name: ./tool-vision.js
```

3. Start a session on that preset. The agent now has the `vision` tool.

### Usage

The agent calls the tool itself when it needs to look at an image:

- `vision(image_path="screenshot.png", prompt="What error message is shown?")`
- `vision(image_path="photo.jpg")` (defaults to a full detailed description)

### How it works

`tool-vision` consumes host services only and publishes nothing, so the row needs no `isolate` realm:

1. `fs` reads the image bytes (PNG/JPEG/WebP/GIF).
2. `attachments.saveImage` commits a durable image reference.
3. `llm.stream` sends a user message (`text` + `image` block) to `deepseek-official` / `deepseek-v4-flash-vision-exp`.
4. The streamed text is returned to the agent.

### Example

![test image](test.jpg)

```text
vision(image_path="test.jpg", prompt="Describe this image in 2-3 sentences.")
```

Returns:

> A rainy, neon-lit cityscape at night, dominated by towering skyscrapers glowing with vibrant pink, green, and blue lights. In the foreground, two silhouetted figures stand on a bridge, gazing out at the sprawling metropolis. The scene has a moody, atmospheric quality, enhanced by the falling rain and reflections on the wet surfaces.

---

## License / 许可证

MIT
