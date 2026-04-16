import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://eth-sepolia.public.blastapi.io', {
      batch: true // Agrupa las lecturas para no ahogar al proveedor
    }), 
  },
})
