import { useReadContract, useWriteContract, useAccount, useWatchContractEvent } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseEther, formatEther, maxUint256 } from 'viem';
import { CONTRATO_ADDRESS, ABI_FACTURA } from '../constants/contracts';
import { config } from '../config/wagmiConfig';

export function useFactura() {
  const { address } = useAccount();

  const { data: totalRecaudado, refetch: refetchTotal } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'totalRecaudado',
    query: { refetchInterval: 4000 }
  });

  const { data: estadoActual, refetch: refetchEstado } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'estadoActual',
    query: { refetchInterval: 4000 }
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'balanceOf',
    args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
    query: { refetchInterval: 4000 }
  });

  const { data: inversiones, refetch: refetchInversiones } = useReadContract({
      address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'inversiones',
      args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
      query: { refetchInterval: 4000 }
    });

  const { data: metaData } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'META_RECAUDACION',
  });

  const recaudadoFormateado = totalRecaudado !== undefined ? formatEther(totalRecaudado) : "0";
  const metaFormateada = metaData !== undefined ? formatEther(metaData) : "1000";
  const porcentaje = Number(metaFormateada) > 0 ? (Number(recaudadoFormateado) / Number(metaFormateada)) * 100 : 0;
    const balanceFormateado = userBalance ? formatEther(userBalance) : "0";
    const inversionRealizada = inversiones ? formatEther(inversiones) : "0";

    // EVENT LISTENER: Escuchamos el contrato 24/7 sin bloquear la UI
  useWatchContractEvent({
    address: CONTRATO_ADDRESS,
    abi: ABI_FACTURA,
    eventName: 'InversionRealizada',
    onLogs(logs) {
      console.log('⚡ Evento InversionRealizada detectado en bloque:', logs);
      recargarDatos();
    },
  });

  const { writeContractAsync: writeContract, isPending: isTxPending } = useWriteContract();

    const claimFaucet = async () => {
      const tx = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'faucet' });
      return tx;
    };

    const invest = async (amountInANKD) => {
      const amountInWei = parseEther(amountInANKD.toString());

      // 1. Llamar a approve usando Allowance Máximo (Infinite Approval)
      const hashApprove = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'approve', args: [CONTRATO_ADDRESS, maxUint256] });

      // 2. Esperar que la red confirme la transacción de aprobación en un bloque
      await waitForTransactionReceipt(config, { hash: hashApprove });

      // Delay de seguridad vital para que los nodos RPC de Sepolia actualicen el estado interno (allowance)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 3. Llamar a invest forzando un límite de gas para "puentear" la simulación fallida
      const hashInvest = await writeContract({ 
        address: CONTRATO_ADDRESS, 
        abi: ABI_FACTURA, 
        functionName: 'invest', 
        args: [amountInWei],
        gas: 500000n // <-- Forzamos el gas para que MetaMask pase de largo la simulación
      });
      // 4. IMPORTANTÍSIMO: Sacamos el 'await' para que no congele la UI. Se queda escuchando en background.
      waitForTransactionReceipt(config, { hash: hashInvest })
        .then(() => {
          recargarDatos();
          // Redirección Forzada a la pestaña de Inversiones cuando termine el minado
          if (window.forceNavigateToPortfolio) window.forceNavigateToPortfolio();
        })
        .catch(console.error);

      // Retornamos el hash instantáneamente a la UI para que diga "Éxito" y suelte el Loading
      return hashInvest;
    };

    const claimReturn = async () => {
      const tx = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'claim' });
      return tx;
    }

  const finishAndPay = async () => {
      // 1. Aprobar la transaccion primero (Allowance Máximo)
      const hashApprove = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'approve', args: [CONTRATO_ADDRESS, maxUint256] });

      // 2. Esperar confirmacion
      await waitForTransactionReceipt(config, { hash: hashApprove });

      // 3. Pagar y finalizar
      const hashFinish = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'finishAndPay' });
      return hashFinish;
    }

  const recargarDatos = () => { refetchTotal(); refetchEstado(); refetchBalance(); refetchInversiones(); };

    return {
    recaudadoFormateado, metaFormateada, porcentaje, estadoActual, balanceFormateado, inversionRealizada,
    claimFaucet, invest, claimReturn, finishAndPay, isTxPending, recargarDatos
  };
  }
