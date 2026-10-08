import { fromBinary } from '@bufbuild/protobuf'
import { RootSchema, type Root } from '@subhajitdas298/test-data-protos'

export interface FetchResult {
  root: Root
  elapsedMs: number
  bytes: number
}

async function get(baseUrl: string, accept: string, size?: number): Promise<Response> {
  const url = `${baseUrl}/api/data${size ? `?size=${size}` : ''}`
  const response = await fetch(url, { headers: { Accept: accept } })
  if (!response.ok) {
    throw new Error(`Request to ${url} failed: ${response.status} ${response.statusText}`)
  }
  return response
}

export interface Progress {
  received: number
  /** Uncompressed body size, or null if the server didn't say. */
  total: number | null
}

export type ProgressHandler = (progress: Progress) => void

// Reads the body chunk by chunk so download progress can be reported. The backends
// send the uncompressed size in X-Data-Length (Content-Length would be the gzipped
// size for JSON, which doesn't match the bytes the stream yields).
async function readBody(response: Response, onProgress?: ProgressHandler): Promise<Uint8Array> {
  const header = response.headers.get('X-Data-Length')
  const total = header && Number.isFinite(Number(header)) ? Number(header) : null
  onProgress?.({ received: 0, total })
  if (!response.body) return new Uint8Array(await response.arrayBuffer())

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress?.({ received, total })
  }
  const out = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

/** `size` asks the backend for a sample: the first N values (default: everything). */
export async function fetchRootDataProto(
  baseUrl: string,
  onProgress?: ProgressHandler,
  size?: number,
): Promise<FetchResult> {
  const start = performance.now()
  const response = await get(baseUrl, 'application/x-protobuf', size)
  const bytes = await readBody(response, onProgress)
  const root = fromBinary(RootSchema, bytes)
  const elapsedMs = performance.now() - start
  return { root, elapsedMs, bytes: bytes.length }
}

export async function fetchRootDataJson(
  baseUrl: string,
  onProgress?: ProgressHandler,
  size?: number,
): Promise<FetchResult> {
  const start = performance.now()
  const response = await get(baseUrl, 'application/json', size)
  const bytes = await readBody(response, onProgress)
  const root = JSON.parse(new TextDecoder().decode(bytes)) as Root
  const elapsedMs = performance.now() - start
  return { root, elapsedMs, bytes: bytes.length }
}
