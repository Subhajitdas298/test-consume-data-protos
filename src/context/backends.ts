export const BACKENDS = {
  mvc: {
    label: 'Spring MVC',
    baseUrl: 'https://data-protos.gentlepond-37bc0af9.eastus.azurecontainerapps.io',
  },
  webflux: {
    label: 'WebFlux',
    baseUrl: 'https://data-protos-webflux.gentlepond-37bc0af9.eastus.azurecontainerapps.io',
  },
} as const

export type Backend = keyof typeof BACKENDS
