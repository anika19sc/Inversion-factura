import { http, createConfig, fallback } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com', { batch: false }), // Open node principal
      http('https://rpc.sepolia.org', { batch: false }), // Open node secundario
      http() // Fallback default nativo
    ]), 
  },
})
