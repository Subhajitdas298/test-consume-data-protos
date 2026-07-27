import { fromBinary } from '@bufbuild/protobuf'
import { RootSchema, type Root } from '@subhajitdas298/test-data-protos'

const DATA_URL = '/api/data'

async function get(accept: string): Promise<Response> {
  const response = await fetch(DATA_URL, { headers: { Accept: accept } })
  if (!response.ok) {
    throw new Error(`Request to ${DATA_URL} failed: ${response.status} ${response.statusText}`)
  }
  return response
}

export async function fetchRootDataProto(): Promise<Root> {
  const response = await get('application/x-protobuf')
  const buffer = await response.arrayBuffer()
  return fromBinary(RootSchema, new Uint8Array(buffer))
}

export async function fetchRootDataJson(): Promise<Root> {
  const response = await get('application/json')
  return (await response.json()) as Root
}
