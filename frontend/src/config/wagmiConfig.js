import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(), // Usa el RPC publico por defecto de viem
  },
})
