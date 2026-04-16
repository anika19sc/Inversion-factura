import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseEther, formatEther } from 'viem';
import { CONTRATO_ADDRESS, ABI_FACTURA } from '../constants/contracts';
import { config } from '../config/wagmiConfig';

export function useFactura() {
  const { address } = useAccount();

  const { data: totalRecaudado, refetch: refetchTotal } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'totalRecaudado',
  });

  const { data: estadoActual, refetch: refetchEstado } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'estadoActual',
  });

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'balanceOf',
    args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
  });

  const { data: inversiones, refetch: refetchInversiones } = useReadContract({
    address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'inversiones',
    args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
  });

  const recaudadoFormateado = totalRecaudado ? formatEther(totalRecaudado) : "0";
  const porcentaje = totalRecaudado ? (Number(recaudadoFormateado) / 1000) * 100 : 0;
  const balanceFormateado = userBalance ? formatEther(userBalance) : "0";
  const inversionRealizada = inversiones ? formatEther(inversiones) : "0";

  const { writeContractAsync: writeContract, isPending: isTxPending } = useWriteContract();

  const claimFaucet = async () => {
    const tx = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'faucet' });
    return tx;
  };

  const invest = async (amountInANKD) => {
    const amountInWei = parseEther(amountInANKD.toString());
    // 1. Llamar a approve y capturar el hash de la transaccion
    const hashApprove = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'approve', args: [CONTRATO_ADDRESS, amountInWei] });
    
    // 2. Esperar que la red confirme la transacción de aprobación
    await waitForTransactionReceipt(config, { hash: hashApprove });
    
    // 3. Llamar a invest
    const hashInvest = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'invest', args: [amountInWei] });
    return hashInvest;
  };

  const claimReturn = async () => {
    const tx = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'claim' });
    return tx;
  }

  const finishAndPay = async () => {
    // 1. Aprobar la transaccion primero
    const hashApprove = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'approve', args: [CONTRATO_ADDRESS, parseEther("1100")] });
    
    // 2. Esperar confirmacion
    await waitForTransactionReceipt(config, { hash: hashApprove });
    
    // 3. Pagar y finalizar
    const hashFinish = await writeContract({ address: CONTRATO_ADDRESS, abi: ABI_FACTURA, functionName: 'finishAndPay' });
    return hashFinish;
  }

  const recargarDatos = () => { refetchTotal(); refetchEstado(); refetchBalance(); refetchInversiones(); };

  return {
    recaudadoFormateado, porcentaje, estadoActual, balanceFormateado, inversionRealizada,
    claimFaucet, invest, claimReturn, finishAndPay, isTxPending, recargarDatos
  };
}
