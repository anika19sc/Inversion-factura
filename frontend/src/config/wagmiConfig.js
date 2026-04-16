import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [sepolia],
  transports: {
    // Usamos Alchemy explícitamente para evitar nodos públicos oxidados o con datos cacheados
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/demo'), 
  },
})
