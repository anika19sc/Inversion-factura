import { useState, useCallback } from 'react';
import { useReadContract, useWriteContract, useAccount, useWatchContractEvent } from 'wagmi';
import { readContract, waitForTransactionReceipt } from '@wagmi/core';
import { parseEther, formatEther, maxUint256 } from 'viem';
import { CONTRATO_ADDRESS, ABI_FACTURA } from '../constants/contracts';
import { config } from '../config/wagmiConfig';

export function useFactura(customContractAddress) {
  const { address } = useAccount();
  const activeContract = customContractAddress || CONTRATO_ADDRESS;

  // ESTADOS REACTIVOS SIMPLES PARA EL COMPONENTE PADRE
  const [invoices, setInvoices] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  const { writeContractAsync: writeContract, isPending: isTxPending } = useWriteContract();

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: activeContract, abi: ABI_FACTURA, functionName: 'balanceOf',
    args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
    query: { refetchInterval: 10000 }
  });

  const balanceFormateado = userBalance ? formatEther(userBalance) : "0";

  // CHECK ADMIN ROLE
  const { data: managerRoleHash } = useReadContract({
    address: activeContract, abi: ABI_FACTURA, functionName: 'MANAGER_ROLE',
  });

  const { data: hasAdminRole, refetch: refetchAdmin } = useReadContract({
    address: activeContract, abi: ABI_FACTURA, functionName: 'hasRole',
    args: (managerRoleHash && address) ? [managerRoleHash, address] : ["0x0000000000000000000000000000000000000000000000000000000000000000", '0x0000000000000000000000000000000000000000'],
  });

  // Event Listeners globales (Solo repintan el catálogo al detectar transacciones)
  useWatchContractEvent({
    address: activeContract, abi: ABI_FACTURA, eventName: 'NuevaFactura',
    onLogs() { loadCatalog(); }
  });
  useWatchContractEvent({
    address: activeContract, abi: ABI_FACTURA, eventName: 'InversionRealizada',
    onLogs() { loadCatalog(); refetchBalance(); }
  });

  // ===================================
  // LÓGICA DE DAPP MULTI-FACTURA (LECTURA MANUAL)
  // ===================================
  const loadCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      if (hasAdminRole !== undefined) setIsAdmin(hasAdminRole);

      const contador = await readContract(config, {
        address: activeContract,
        abi: ABI_FACTURA,
        functionName: 'contadorFacturas',
      });

      const total = Number(contador);
      const facturasCargadas = [];

      for (let i = 1; i <= total; i++) {
        const fac = await readContract(config, {
          address: activeContract,
          abi: ABI_FACTURA,
          functionName: 'facturas',
          args: [i]
        });

        // fac retorna: [id, empresa, sector, descripcion, metaRecaudacion, rendimientoAnual, diasDuracion, totalRecaudado, pagoTotal, estado]
        // Mapeamos a un objeto manejable
        const metaStr = formatEther(fac[4] || 0n);
        const recaudadoStr = formatEther(fac[7] || 0n);
        const invUser = address ? await readContract(config, {
            address: activeContract, abi: ABI_FACTURA, functionName: 'inversiones', args: [i, address]
        }) : 0n;

        facturasCargadas.push({
          id: Number(fac[0]),
          company: fac[1],
          sector: fac[2],
          description: fac[3],
          goal: Number(metaStr),
          yield: Number(fac[5]),
          days: Number(fac[6]),
          raised: Number(recaudadoStr),
          metaOriginal: fac[4],
          pagoTotalStr: formatEther(fac[8] || 0n),
          estadoActual: fac[9], // 0: Recaudando, 1: Completado, 2: Pagado
          miInversionFormateada: formatEther(invUser)
        });
      }
      setInvoices(facturasCargadas.reverse()); // Más recientes primero
    } catch (e) {
      console.warn("Fallo leyendo contrato", e);
    }
    setIsLoadingCatalog(false);
  }, [activeContract, address, hasAdminRole]);

  // ===================================
  // LÓGICA ESCRITURA WEB3
  // ===================================

  const claimFaucet = async () => {
    const tx = await writeContract({ address: activeContract, abi: ABI_FACTURA, functionName: 'faucet' });
    await waitForTransactionReceipt(config, { hash: tx });
  };

  const crearFactura = async (empresa, sector, descripcion, meta, rendimiento, duracion) => {
    const tx = await writeContract({ 
      address: activeContract, 
      abi: ABI_FACTURA, 
      functionName: 'crearFactura',
      args: [empresa, sector, descripcion, BigInt(meta), BigInt(rendimiento), BigInt(duracion)]
    });
    await waitForTransactionReceipt(config, { hash: tx });
  };

  const invest = async (facturaId, amountInANKD) => {
    if (!address) throw new Error("Wallet no conectada");
    const amountInWei = parseEther(amountInANKD.toString());

    // Nota: Eliminamos chequeo de Allowance porque el rediseño usando _transfer interno 
    // en FacturaTokenizada.sol omite la necesidad web3 de hacer approvals dobles!

    // 2. Invest
    const hashInvest = await writeContract({ 
      address: activeContract, abi: ABI_FACTURA, functionName: 'invest', 
      args: [BigInt(facturaId), amountInWei], gas: 500000n
    });
    await waitForTransactionReceipt(config, { hash: hashInvest });
  };

  const claimReturn = async (facturaId) => {
    const hashRetiro = await writeContract({ 
      address: activeContract, abi: ABI_FACTURA, functionName: 'claim', 
      args: [BigInt(facturaId)] 
    });
    await waitForTransactionReceipt(config, { hash: hashRetiro });
  }

  const finishAndPay = async (facturaId, montoEnWei) => {
    if (!address) throw new Error("Wallet no conectada");
    
    // Nota: Eliminamos chequeo de Allowance para Admin también.
    
    // 2. Pay
    const hashPay = await writeContract({ 
      address: activeContract, abi: ABI_FACTURA, functionName: 'finishAndPay', 
      args: [BigInt(facturaId), montoEnWei] 
    });
    await waitForTransactionReceipt(config, { hash: hashPay });
  }

  return {
    invoices, isAdmin, isLoadingCatalog, loadCatalog, balanceFormateado,
    claimFaucet, crearFactura, invest, claimReturn, finishAndPay, isTxPending
  };
}
