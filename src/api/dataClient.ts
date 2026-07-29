import { fromBinary } from '@bufbuild/protobuf'
import { RootSchema, type Root } from '@subhajitdas298/test-data-protos'

async function get(baseUrl: string, accept: string): Promise<Response> {
  const url = `${baseUrl}/api/data`
  const response = await fetch(url, { headers: { Accept: accept } })
  if (!response.ok) {
    throw new Error(`Request to ${url} failed: ${response.status} ${response.statusText}`)
  }
  return response
}

export async function fetchRootDataProto(baseUrl: string): Promise<Root> {
  const response = await get(baseUrl, 'application/x-protobuf')
  const buffer = await response.arrayBuffer()
  return fromBinary(RootSchema, new Uint8Array(buffer))
}

export async function fetchRootDataJson(baseUrl: string): Promise<Root> {
  const response = await get(baseUrl, 'application/json')
  return (await response.json()) as Root
}
