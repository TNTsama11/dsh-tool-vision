# dsh-tool-vision

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin that gives a text-only agent "eyes": it registers a `vision` model tool that reads an image file and answers through the **DeepSeek-V4-Flash-Vision-Exp** vision model — no manual model switching.

## What it does

Registers one model tool:

- `vision(image_path, prompt?)` — reads a PNG/JPEG/WebP/GIF file, sends it to `deepseek-v4-flash-vision-exp` together with an optional prompt, and returns a plain-text description or answer.

Because the current chat model may not accept image input, calling `vision` lets the agent "see" on demand.

## Requirements

- A running DeepSeek Harness with:
  - `fs`, `attachments`, and `llm` host services (standard in DSH).
  - The `deepseek-official` provider with the `deepseek-v4-flash-vision-exp` model available (i.e. a configured `DEEPSEEK_API_KEY`).

## Install

The plugin is a single import-free file that a preset can load by relative path.

1. Copy `tool-vision.js` into your agent preset directory (e.g. `~/.dsh/.agent-presets/<your-preset>/`).
2. Add one row to that preset's `agent.cordis.yml`:

```yaml
- id: tool-vision
  name: ./tool-vision.js
```

3. Start a session on that preset. The agent now has the `vision` tool.

## Usage

The agent calls the tool itself when it needs to look at an image:

- `vision(image_path="screenshot.png", prompt="What error message is shown?")`
- `vision(image_path="photo.jpg")` (defaults to a full detailed description)

## How it works

`tool-vision` consumes host services only and publishes nothing, so the row needs no `isolate` realm:

1. `fs` reads the image bytes (PNG/JPEG/WebP/GIF).
2. `attachments.saveImage` commits a durable image reference.
3. `llm.stream` sends a user message (`text` + `image` block) to `deepseek-official` / `deepseek-v4-flash-vision-exp`.
4. The streamed text is returned to the agent.

## License

MIT
