import { fromBinary } from '@bufbuild/protobuf'
import { RootSchema, type Root } from '@subhajitdas298/test-data-protos'

const DATA_URL = '/api/data'

export async function fetchRootData(): Promise<Root> {
  const response = await fetch(DATA_URL)
  if (!response.ok) {
    throw new Error(`Request to ${DATA_URL} failed: ${response.status} ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  return fromBinary(RootSchema, new Uint8Array(buffer))
}
