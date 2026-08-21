// `tool-vision` — a preset-local plugin that registers a `vision` model tool.
//
// The tool reads a PNG/JPEG/WebP/GIF file from disk, commits it to the durable
// attachment store, and asks the DeepSeek vision model
// (deepseek-v4-flash-vision-exp) about it, returning a plain-text answer. This
// lets an agent running on a text-only model still "see" images on demand.
//
// Import-free on purpose: the preset loader resolves a relative plugin file
// through Node's ESM resolver from this preset's own directory, which cannot
// reach the harness's TypeScript sources. It only consumes host services
// (`tools`, `fs`, `attachments`, `llm`) and publishes nothing, so the row sits
// loose in the preset with no isolate realm.

export const name = 'tool-vision'
export const inject = ['tools']

const PROVIDER = 'deepseek-official'
const MODEL = 'deepseek-v4-flash-vision-exp'

const EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export function apply(ctx) {
  ctx.effect(() => ctx.tools.register({
    name: 'vision',
    description: 'Look at an image file with the DeepSeek vision model (deepseek-v4-flash-vision-exp) and return a written answer. Use this whenever you need to actually SEE an image (describe it, read text inside it, answer a question about it) because the current chat model cannot accept images directly. Provide the image file path and an optional prompt/question; the vision model returns a plain-text description or answer.',
    parameters: {
      type: 'object',
      properties: {
        image_path: {
          type: 'string',
          description: 'Path to a PNG/JPEG/WebP/GIF image file to analyze.',
        },
        prompt: {
          type: 'string',
          description: 'What to look for or ask about the image. Omit for a full detailed description.',
        },
      },
      required: ['image_path'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    async execute(args, exec) {
      const imagePath = args.image_path
      if (typeof imagePath !== 'string' || imagePath.trim().length === 0) {
        throw new Error('vision: image_path must be a non-empty string')
      }
      const trimmed = imagePath.trim()
      const prompt = (typeof args.prompt === 'string' && args.prompt.trim().length > 0)
        ? args.prompt.trim()
        : 'Describe this image in detail: what it shows, the key objects and people, any visible text, colors, layout, and other notable details.'

      const match = /\.([a-zA-Z0-9]+)$/.exec(trimmed)
      const mediaType = EXT[match ? '.' + match[1].toLowerCase() : '']
      if (mediaType === undefined) {
        throw new Error('vision: only PNG/JPEG/WebP/GIF images are supported (got "' + trimmed + '")')
      }

      const fs = ctx.get('fs')
      if (fs === undefined) throw new Error('vision: no filesystem service is mounted')
      const attachments = ctx.get('attachments')
      if (attachments === undefined) throw new Error('vision: no attachment service is mounted')
      const llm = ctx.get('llm')
      if (llm === undefined) throw new Error('vision: no llm service is mounted')

      let cwd
      try {
        cwd = exec.agent && exec.agent.session && exec.agent.session.header
          ? exec.agent.session.header.cwd
          : undefined
      } catch (e) {
        cwd = undefined
      }
      const resolveOpts = { signal: exec.signal }
      if (cwd !== undefined) resolveOpts.cwd = cwd

      const target = await fs.resolve(trimmed, resolveOpts)
      const info = await fs.stat(target, exec.signal)
      if (info === undefined) throw new Error('vision: image not found: "' + trimmed + '"')
      if (info.type !== 'file') throw new Error('vision: not a regular file: "' + trimmed + '"')

      const limits = attachments.imageLimits || {}
      const cap = Math.min(limits.maxImageBytes || 20971520, limits.maxMessageImageBytes || 20971520)
      const data = await fs.readBytes(target, exec.signal, cap)

      const ref = await attachments.saveImage({ data, mediaType })

      const message = {
        id: 'vision-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', attachment: ref },
        ],
        source: { kind: 'user' },
      }

      const stream = llm.stream({
        provider: PROVIDER,
        model: MODEL,
        messages: [message],
      })

      let text = ''
      let reasoning = ''
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta') text += chunk.text
        else if (chunk.type === 'reasoning-delta') reasoning += chunk.text
        else if (chunk.type === 'finish') {
          if (chunk.reason && chunk.reason.kind === 'error') {
            const failure = chunk.reason.failure
            throw new Error('vision: model call failed: ' + (failure && failure.message ? failure.message : 'unknown error'))
          }
        }
      }

      const answer = text.trim().length > 0 ? text.trim() : reasoning.trim()
      if (answer.length === 0) throw new Error('vision: model returned no text')
      return answer
    },
  }))
}
