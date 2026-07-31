import { fromBinary } from '@bufbuild/protobuf'
import { RootSchema, type Root } from '@subhajitdas298/test-data-protos'

export interface FetchResult {
  root: Root
  elapsedMs: number
  bytes: number
}

async function get(baseUrl: string, accept: string): Promise<Response> {
  const url = `${baseUrl}/api/data`
  const response = await fetch(url, { headers: { Accept: accept } })
  if (!response.ok) {
    throw new Error(`Request to ${url} failed: ${response.status} ${response.statusText}`)
  }
  return response
}

export async function fetchRootDataProto(baseUrl: string): Promise<FetchResult> {
  const start = performance.now()
  const response = await get(baseUrl, 'application/x-protobuf')
  const buffer = await response.arrayBuffer()
  const root = fromBinary(RootSchema, new Uint8Array(buffer))
  const elapsedMs = performance.now() - start
  return { root, elapsedMs, bytes: buffer.byteLength }
}

export async function fetchRootDataJson(baseUrl: string): Promise<FetchResult> {
  const start = performance.now()
  const response = await get(baseUrl, 'application/json')
  const text = await response.text()
  const root = JSON.parse(text) as Root
  const elapsedMs = performance.now() - start
  return { root, elapsedMs, bytes: new TextEncoder().encode(text).length }
}
