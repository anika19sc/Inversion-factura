import React, { useState, useEffect } from 'react';
import { useFactura } from '../hooks/useFactura';
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export default function InvestmentPanel() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const {
    recaudadoFormateado,
    porcentaje,
    estadoActual,
    balanceFormateado,
    claimFaucet,
    invest,
    claimReturn,
    isTxPending,
    recargarDatos
  } = useFactura();

  const [montInversion, setMontoInversion] = useState('');
  const [logs, setLogs] = useState([]);

  // Inicializar log en cliente
  useEffect(() => {
    setLogs([`[${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}] Sistema inicializado en Sepolia 🌐`]);
  }, []);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}] ${msg}`, ...prev].slice(0, 5));
  };

  // estadoActual es un uint8 desde solidity. Convertimos el valor en la condición
  // Si no está cargado retorna null, y manejamos los comparadores con seguridad.
  const estadoNum = parseInt(estadoActual);
  const esRecaudando = estadoNum === 0;
  const esPagado = estadoNum === 2;

  const getEstadoLabel = () => {
    if (estadoNum === 0) return "🟢 Estado: Recaudando";
    if (estadoNum === 1) return "🟡 Estado: Completado";
    if (estadoNum === 2) return "✅ Estado: Pagado";
    return "Cargando...";
  };

  const handleConnect = () => {
    connect({ connector: injected() });
    addLog('Conectando billetera...');
  };

  const handleFaucet = async () => {
    addLog('Iniciando transacción de Faucet...');
    try {
      await claimFaucet();
      addLog('Tokens ANKD recibidos desde el Faucet 🎁');
      recargarDatos();
    } catch (err) {
      addLog('❌ Error pidiendo Faucet');
    }
  }

  const handleInvest = async () => {
    if (!montInversion || isNaN(montInversion)) return;
    addLog(`Procesando inversión de ${montInversion} ANKD... (Aprueba tu wallet)`);
    try {
      await invest(montInversion);
      addLog(`✅ Inversión exitosa de ${montInversion} ANKD 🎉`);
      setMontoInversion('');
      recargarDatos();
    } catch (err) {
      addLog(`❌ La inversión ha fallado o fue rechazada.`);
    }
  }

  const handleClaim = async () => {
    addLog(`Solicitando retiro de ganancias...`);
    try {
      await claimReturn();
      addLog(`✅ ¡Retiro de capital + ganancias completado! 💸`);
      recargarDatos();
    } catch (err) {
      addLog(`❌ Error al retirar beneficios.`);
    }
  }

  const formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-5)}` : '';

  return (
    <>
      {/* Glow ambiental (Gradient Core) */}
      <div className="absolute top-[-20%] left-1/2 transform -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2e004f] via-[#2e004f]/20 to-transparent opacity-80 pointer-events-none blur-[80px] z-0"></div>

      {/* 1. Header (Navegación) */}
      <header className="relative z-10 w-full border-b border-[#9D00FF]/30 bg-[#000000]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-extrabold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#6A00FF] to-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#9D00FF] shadow-[0_0_10px_#9D00FF] flex items-center justify-center relative overflow-hidden">
              {/* Simulación del Logo circular neón de ANKDOL */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#9D00FF] to-transparent opacity-40"></div>
              <span className="text-[10px] text-white">ANK</span>
            </div>
            ANKDOL
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-semibold text-[#9D00FF] bg-[#9D00FF]/10 px-3 py-1.5 rounded-[10px] border border-[#9D00FF]/25">
              Red: Sepolia
            </span>
            {!isConnected ? (
              <button onClick={handleConnect} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md hover:bg-white/10 transition-colors text-sm font-medium">
                Conectar Wallet
              </button>
            ) : (
              <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md text-sm font-medium flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#9D00FF] shadow-[0_0_10px_#9D00FF]"></div>
                {formatAddress(address)}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-4xl mx-auto flex-1 px-4 py-8 flex flex-col gap-12">

        {/* 2. Sección Hero */}
        <section className="flex flex-col items-center text-center space-y-6 mt-6">
          <div className="p-8 pb-10 rounded-[32px] w-full max-w-lg bg-gradient-to-b from-[#2e004f]/40 to-transparent border border-white/5 shadow-[0_20px_50px_rgba(46,0,79,0.3)] relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none mix-blend-overlay"></div>
            <h3 className="text-slate-400 text-sm font-medium mb-2 tracking-wider uppercase">Tu Balance en Demo</h3>
            <div className="text-6xl font-black text-white flex items-center justify-center gap-2 mb-8 drop-shadow-lg">
              {isConnected ? Number(balanceFormateado).toFixed(2) : "0.00"} <span className="text-xl text-[#9D00FF] font-black self-end mb-2 drop-shadow-[0_0_10px_#9D00FF]">ANKD</span>
            </div>

            <button
              onClick={handleFaucet}
              disabled={!isConnected || isTxPending}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6A00FF] to-[#B800FF] hover:from-[#5800d4] hover:to-[#a400e6] font-bold tracking-wide transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:grayscale shadow-[0_0_20px_rgba(157,0,255,0.4)] hover:shadow-[0_0_30px_rgba(157,0,255,0.6)]"
            >
              {isTxPending ? "Procesando..." : "🎁 Reclamar Tokens Demo"}
            </button>
          </div>
        </section>

        {/* 3. Vista de Inversión & 4. Panel de Acción */}
        <section className="w-full max-w-xl mx-auto space-y-6 mb-16">
          <div className="bg-[#050505] rounded-3xl p-[2px] relative overflow-hidden group">
            {/* Borde Gradiente animado falso */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6A00FF] via-[#050505] to-[#B800FF] opacity-80 group-hover:opacity-100 transition-opacity duration-700"></div>

            {/* Tarjeta Interior */}
            <div className="relative bg-[#0a0a0a] rounded-[22px] p-6 sm:p-8 flex flex-col gap-8 h-full">

              {/* Header Tarjeta */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Campaña de Tokenización</h2>
                  <p className="text-[#A0A0A0] text-sm">Rendimiento garantizado: +10% de interes</p>
                </div>
                <div className="px-3 py-1.5 bg-[#111] rounded-lg border border-[#9D00FF]/40 shadow-[0_0_10px_rgba(157,0,255,0.2)]">
                  <span className="text-[11px] font-bold tracking-widest text-[#B800FF] uppercase">{getEstadoLabel()}</span>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="space-y-3">
                <div className="flex justify-between text-[13px] font-semibold text-slate-300">
                  <span className="text-[#A0A0A0]">Capital Recaudado</span>
                  <span className="text-white">{recaudadoFormateado} / 1000 ANKD</span>
                </div>
                <div className="w-full h-[14px] bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5 relative">
                  <div
                    className="h-full bg-gradient-to-r from-[#6A00FF] to-[#FF00AA] transition-all duration-1000 ease-out relative"
                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                  >
                    {/* Rayo de luz interior brillando de izq a dcha */}
                    <div className="absolute top-0 bottom-0 left-[-20%] w-[30%] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer skew-x-[-20deg]"></div>
                  </div>
                </div>
                <p className="text-right text-xs text-[#FF00AA] font-bold">{porcentaje}% Alcanzado</p>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#9D00FF]/30 to-transparent my-1"></div>

              {/* Acciones */}
              <div className="flex flex-col gap-5">
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Monto a invertir"
                    value={montInversion}
                    onChange={e => setMontoInversion(e.target.value)}
                    disabled={!esRecaudando || isTxPending}
                    className="flex-1 bg-[#111] border border-[#9D00FF] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-1 focus:ring-[#9D00FF] focus:border-[#B800FF] transition-all placeholder-[#A0A0A0] disabled:opacity-50 disabled:border-white/10"
                  />
                  <button
                    onClick={handleInvest}
                    disabled={!esRecaudando || !isConnected || isTxPending}
                    className="px-7 py-3.5 bg-black rounded-xl border border-transparent shadow-[0_0_15px_rgba(157,0,255,0.6)] hover:shadow-[0_0_25px_rgba(157,0,255,0.8)] hover:border-[#9D00FF]/50 text-white font-bold transition-all disabled:opacity-30 disabled:shadow-none disabled:border-transparent disabled:bg-[#111]"
                  >
                    Invertir
                  </button>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={!esPagado || !isConnected || isTxPending}
                  className={`w-full py-4 rounded-xl font-bold border transition-all focus:outline-none flex justify-center items-center gap-2
                                     ${esPagado
                      ? "bg-[#111] text-[#9D00FF] border-[#9D00FF]/50 hover:bg-[#151515] hover:border-[#B800FF] hover:shadow-[0_0_20px_rgba(157,0,255,0.3)]"
                      : "bg-[#0a0a0a] text-slate-600 border-white/5 cursor-not-allowed opacity-70"}`}
                >
                  {esPagado ? "💸 Retirar Capital y Ganancias de la Factura" : "Retiro bloqueado hasta Estado: Pagado"}
                </button>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* 5. Pie de Página (Logs) */}
      <footer className="relative z-10 w-full mt-auto border-t border-[#9D00FF]/25 bg-gradient-to-t from-black to-[#0a0a0a] pt-4 pb-8">
        <div className="max-w-4xl mx-auto px-6">
          <h4 className="text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-3 font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] animate-pulse"></span>
            Terminal de Logs en Vivo
          </h4>
          <div className="flex flex-col gap-1.5 font-mono text-[11px] sm:text-xs bg-[#050505] p-4 rounded-xl border border-white/5 shadow-inner">
            {logs.length === 0 && <span className="text-slate-600">Esperando conexión...</span>}
            {logs.map((log, i) => (
              <div key={i} className={`flex items-start transition-opacity ${i === 0 ? 'text-[#B800FF] font-medium' : 'text-[#A0A0A0]'}`}>
                <span className="tracking-tight">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
