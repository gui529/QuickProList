import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface CursorAgentSuccess {
  type: 'result'
  subtype: 'success'
  is_error: false
  result: string
  session_id?: string
  duration_ms?: number
}

export interface RunCursorAgentOptions {
  prompt: string
  /** Passed to --workspace (use outreach dir, not the Next app root) */
  workspace: string
  timeoutMs?: number
  /** ask = read-only; default agent can use web search tools */
  mode?: 'ask' | 'plan'
  sandbox?: 'enabled' | 'disabled'
}

function resolveAgentCommand(): string {
  const override = process.env.OUTREACH_CURSOR_AGENT?.trim()
  if (override) return override

  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA?.trim()
    if (local) {
      const cmd = join(local, 'cursor-agent', 'agent.cmd')
      if (existsSync(cmd)) return cmd
    }
  }

  return 'agent'
}

function agentArgs(opts: RunCursorAgentOptions): string[] {
  const args = [
    '-p',
    '--trust',
    '--output-format',
    'json',
    '--workspace',
    opts.workspace,
  ]

  const model = process.env.OUTREACH_CURSOR_MODEL?.trim()
  if (model) args.push('--model', model)

  if (opts.mode === 'ask') args.push('--mode', 'ask')

  const sandbox =
    opts.sandbox ??
    (process.env.OUTREACH_CURSOR_SANDBOX === 'enabled' ? 'enabled' : 'disabled')
  args.push('--sandbox', sandbox)

  if (process.env.OUTREACH_CURSOR_APPROVE_MCPS === 'true') {
    args.push('--approve-mcps')
  }

  args.push(opts.prompt)
  return args
}

export async function runCursorAgentPrint(opts: RunCursorAgentOptions): Promise<CursorAgentSuccess> {
  const cmd = resolveAgentCommand()
  const args = agentArgs(opts)
  const timeoutMs = opts.timeoutMs ?? Number(process.env.OUTREACH_CURSOR_TIMEOUT_MS ?? '600000')

  return new Promise((resolve, reject) => {
    const spawnOpts = {
      env: { ...process.env },
      cwd: opts.workspace,
      stdio: ['ignore', 'pipe', 'pipe'] as const,
    }

    const child =
      process.platform === 'win32' && cmd.toLowerCase().endsWith('.cmd')
        ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', cmd, ...args], spawnOpts)
        : spawn(cmd, args, spawnOpts)

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Cursor agent timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(
        new Error(
          `Failed to start Cursor agent (${cmd}): ${err.message}. Install: https://cursor.com/docs/cli/headless — or set OUTREACH_CURSOR_AGENT to the full path to agent / agent.cmd`
        )
      )
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        const detail = stderr.trim() || stdout.trim() || `exit ${code}`
        reject(new Error(`Cursor agent failed: ${detail.slice(0, 800)}`))
        return
      }

      const envelope = parseAgentStdout(stdout)
      if (!envelope) {
        const detail = stderr.trim() || stdout.trim()
        reject(new Error(`Could not parse Cursor agent output: ${detail.slice(0, 400)}`))
        return
      }
      if (envelope.subtype !== 'success' || envelope.is_error) {
        reject(new Error(envelope.result?.slice(0, 500) || 'Cursor agent returned a non-success result'))
        return
      }
      resolve(envelope)
    })
  })
}

function parseAgentStdout(stdout: string): CursorAgentSuccess | null {
  const trimmed = stdout.trim()
  if (!trimmed) return null

  const tryEnvelope = (raw: string): CursorAgentSuccess | null => {
    try {
      const parsed = JSON.parse(raw) as CursorAgentSuccess & {
        is_error?: boolean
        subtype?: string
        type?: string
      }
      if (typeof parsed.result === 'string' && (parsed.type === 'result' || parsed.subtype === 'success')) {
        return parsed
      }
      if (typeof parsed.result === 'string') return parsed
    } catch {
      /* next */
    }
    return null
  }

  const whole = tryEnvelope(trimmed)
  if (whole) return whole

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = tryEnvelope(lines[i])
    if (line) return line
  }

  return null
}

function parseBalancedJsonObjects(text: string): unknown[] {
  const out: unknown[] = []
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue
    let depth = 0
    let inString = false
    let escape = false
    for (let j = i; j < text.length; j++) {
      const ch = text[j]
      if (inString) {
        if (escape) escape = false
        else if (ch === '\\') escape = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') {
        inString = true
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const slice = text.slice(i, j + 1)
          try {
            out.push(JSON.parse(slice))
          } catch {
            /* invalid slice */
          }
          break
        }
      }
    }
  }
  return out
}

function isErrorPayload(o: unknown): boolean {
  if (!o || typeof o !== 'object') return false
  const r = o as Record<string, unknown>
  return 'error' in r && !Array.isArray(r.businesses)
}

function pickBusinessesPayload(objects: unknown[]): unknown | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i]
    if (isErrorPayload(o)) continue
    if (o && typeof o === 'object' && Array.isArray((o as { businesses?: unknown }).businesses)) {
      return o
    }
  }
  return null
}

/** Pull a JSON object with `businesses` out of agent prose (fences, envelopes, or balanced `{…}`). */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Agent response was empty')
  }

  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1].trim())
  const segments = [trimmed, ...fenced]

  for (const segment of segments) {
    try {
      const direct = JSON.parse(segment) as { businesses?: unknown; error?: unknown }
      if ('error' in direct && !Array.isArray(direct.businesses)) {
        continue
      }
      if (Array.isArray(direct.businesses)) return direct
    } catch {
      /* try balanced */
    }

    const objects = parseBalancedJsonObjects(segment).filter((o) => !isErrorPayload(o))
    const picked = pickBusinessesPayload(objects)
    if (picked) return picked
  }

  const empty = parseBalancedJsonObjects(trimmed).find(
    (o) => o && typeof o === 'object' && Array.isArray((o as { businesses?: unknown }).businesses)
  )
  if (empty) return empty

  throw new Error(
    `Agent response did not contain a JSON object with "businesses". Preview: ${trimmed.slice(0, 280)}`
  )
}
