import React, { useState, useEffect } from "react";
import { WagmiProvider, useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmiConfig';
import { useFactura } from './hooks/useFactura';

const queryClient = new QueryClient();

const COLORS = {
  bg: "#0A0C10", surface: "#111318", surfaceAlt: "#161B24", border: "#1E2530", borderHover: "#2E3A4A",
  accent: "#9D00FF", accentDim: "#9D00FF22", accentHover: "#B800FF", accentGradient: "linear-gradient(135deg, #6A00FF 0%, #B800FF 100%)", accentHoverGradient: "linear-gradient(135deg, #8A00FF 0%, #D800FF 100%)", gold: "#C9A84C", goldDim: "#C9A84C22",
  red: "#E05C5C", redDim: "#E05C5C22", text: "#E8EDF5", textMuted: "#6B7A8D", textDim: "#3A4455",
};

// --- ICON COMPONENTS ---
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    wallet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" /><circle cx="17" cy="14" r="1" fill={color} /></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    portfolio: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
    faucet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M8 2h8v4H8z" /><path d="M10 6v2a4 4 0 0 0 4 0V6" /><path d="M12 8v8" /><path d="M8 20a4 4 0 0 1 8 0" /></svg>,
    admin: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    arrow: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>,
  };
  return icons[name] || null;
};

const Sparkline = ({ data, color = COLORS.accent, width = 80, height = 32 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => { const x = (i / (data.length - 1)) * width; const y = height - ((v - min) / (max - min || 1)) * height; return `${x},${y}`; }).join(" ");
  return (<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
};

const FullChart = ({ data, goal }) => {
  const max = goal; const w = 480, h = 140, pad = 20;
  const pts = data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: h - pad - ((v / max) * (h - pad * 2)), v }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.25" /><stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" /></linearGradient></defs>
      <path d={areaD} fill="url(#cg)" /><path d={pathD} fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={COLORS.accent} stroke={COLORS.bg} strokeWidth="2" />)}
    </svg>
  );
};

const ProgressBar = ({ pct, color = COLORS.accent }) => (
  <div style={{ height: 4, background: COLORS.border, borderRadius: 2, overflow: "hidden", width: "100%" }}>
    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
  </div>
);

const Spinner = () => <div style={{ display: "inline-block", width: 18, height: 18, border: `2px solid ${COLORS.border}`, borderTop: `2px solid ${COLORS.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
const Tag = ({ label, color = COLORS.accent }) => <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", padding: "3px 8px", borderRadius: 3, background: color + "22", color, border: `1px solid ${color}44`, textTransform: "uppercase" }}>{label}</span>;

// ===================== VIEWS =====================

const Landing = ({ onConnect }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", overflow: "hidden", backgroundColor: COLORS.bg }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 30%, ${COLORS.bg} 100%)` }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${COLORS.border} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border} 1px, transparent 1px)`, backgroundSize: "60px 60px", opacity: 0.4 }} />

      <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: COLORS.surface + "B3", backdropFilter: "blur(10px)", border: `1px solid ${COLORS.border}`, borderRadius: 6, zIndex: 2 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, boxShadow: `0 0 6px ${COLORS.accent}` }} />
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: COLORS.textMuted }}>Red: Sepolia Testnet</span>
      </div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: COLORS.accent, letterSpacing: "0.2em", marginBottom: 24, textTransform: "uppercase" }}>Token RWA · Web3</div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontFamily: "'Inter', sans-serif", fontWeight: 700, lineHeight: 1.1, color: COLORS.text, margin: "0 0 8px", textShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>Demo:</h1>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontFamily: "'Inter', sans-serif", fontWeight: 700, lineHeight: 1.1, color: COLORS.accent, margin: "0 0 32px" }}>Inversión en Facturas</h1>
        <p style={{ fontSize: 17, color: COLORS.textMuted, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 48px", fontFamily: "'DM Sans', sans-serif" }}>Tokenizamos facturas comerciales verificadas de empresas argentinas. Invertí desde $100 USD en activos con rendimientos del <strong style={{ color: COLORS.text }}>10–17% anual</strong>, respaldados on-chain.</p>
        <button onClick={onConnect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "16px 40px", background: hovered ? COLORS.accentHoverGradient : COLORS.accentGradient, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em", transition: "all 0.2s ease", boxShadow: `0 0 ${hovered ? 40 : 20}px ${COLORS.accent}55` }}>
          <Icon name="wallet" size={18} color="#E8EDF5" /> Conectar Billetera
        </button>
      </div>
    </div>
  );
};

const DashboardUI = ({ invoices, onSelectInvoice }) => (
  <div style={{ padding: "0 0 60px" }}>
    <div style={{ padding: "32px 32px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
      <div><h2 style={{ fontSize: 24, fontFamily: "'Inter', sans-serif", color: COLORS.text, margin: 0 }}>Activos Disponibles</h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "6px 0 0", fontFamily: "'DM Sans', sans-serif" }}>Facturas verificadas en proceso de recaudación</p></div>
    </div>
    <div style={{ padding: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
      {invoices.map(inv => {
        const pct = Math.round((inv.raised / inv.goal) * 100);
        return (
          <div key={inv.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s, transform 0.2s", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "translateY(0)"; }}>
            <div style={{ padding: "20px 20px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, fontFamily: "'DM Sans', sans-serif" }}>{inv.company}</div><div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{inv.sector}</div></div>
                <Tag label={inv.status} color={inv.status === "Pagado" ? COLORS.gold : COLORS.accent} />
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                <div><div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Rendimiento</div>
                  <div style={{ fontSize: 22, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: COLORS.accent }}>{inv.yield}%</div></div>
                <div><div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Riesgo</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: inv.riskColor, marginTop: 4 }}>{inv.risk}</div></div>
                <div style={{ marginLeft: "auto" }}><Sparkline data={inv.history} color={inv.status === "Pagado" ? COLORS.gold : COLORS.accent} /></div>
              </div>
            </div>
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{inv.raised} ANKD</span>
                <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{inv.goal} ANKD</span>
              </div>
              <ProgressBar pct={pct} color={inv.status === "Pagado" ? COLORS.gold : COLORS.accent} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: COLORS.textMuted }}>{pct}% ({Math.max(0, inv.goal - inv.raised)} ANKD restantes)</span>
                {inv.days > 0 && <span style={{ fontSize: 11, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={11} color={COLORS.textMuted} />{inv.days}d</span>}
              </div>
              <button onClick={() => onSelectInvoice(inv)} style={{ width: "100%", padding: "11px", background: COLORS.accentDim, border: `1px solid ${COLORS.accent}44`, borderRadius: 7, color: COLORS.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.accent + "33"} onMouseLeave={e => e.currentTarget.style.background = COLORS.accentDim}>
                Ver e Invertir <Icon name="arrow" size={14} color={COLORS.accent} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ProjectDetail = ({ invoice, onBack, factura }) => {
  const [amount, setAmount] = useState("");
  const [state, setState] = useState("idle");
  const pct = Math.round((invoice.raised / invoice.goal) * 100);
  const restante = Math.max(0, invoice.goal - invoice.raised);
  const metaAlcanzada = invoice.raised >= invoice.goal;

  const handleInvest = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setState("loading");
    if (invoice.id === 1) {
      try {
        await factura.invest(amount);
        // Liberamos el loading inmediatamente. El polling on-chain y el EventListener harán el resto en background
        setState("success");
      } catch (e) {
        setState("idle");
        alert("Excepción / Rechazado");
      }
    } else {
      setTimeout(() => setState("success"), 2800);
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 13, marginBottom: 28, fontFamily: "'DM Sans', sans-serif" }}><Icon name="back" size={14} color={COLORS.textMuted} /> Volver al catálogo</button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}><Tag label={invoice.risk} color={invoice.riskColor} /><Tag label={invoice.status} color={invoice.status === "Pagado" ? COLORS.gold : COLORS.accent} /></div>
          <h2 style={{ fontSize: 28, fontFamily: "'Inter', sans-serif", color: COLORS.text, margin: "0 0 4px" }}>{invoice.company}</h2>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 24px" }}>{invoice.sector}</p>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Descripción del activo</div>
            <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, margin: 0 }}>{invoice.description}</p>
          </div>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Progreso</div>
              {restante > 0 ? (
                <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 700 }}>{restante} ANKD restantes</div>
              ) : (
                <div style={{ fontSize: 13, color: COLORS.gold, fontWeight: 700 }}>🏆 Meta Alcanzada</div>
              )}
            </div>
            <ProgressBar pct={Math.min(pct, 100)} color={invoice.status === "Pagado" ? COLORS.gold : COLORS.accent} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{invoice.raised} ANKD</span>
              <span style={{ fontSize: 12, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>Meta: {invoice.goal} ANKD</span>
            </div>
          </div>
        </div>
        <div>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, position: "sticky", top: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[["Yield Anual", `${invoice.yield}%`, COLORS.accent], ["Días rest.", invoice.days > 0 ? `${invoice.days}d` : "—", COLORS.text], ["Meta", `${invoice.goal}`, COLORS.text], ["Min.Inv", "1 ANKD", COLORS.text]].map(([l, v, c], i) => (
                <div key={i} style={{ background: COLORS.surfaceAlt, borderRadius: 8, padding: "14px" }}>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 18, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            {state === "success" ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: COLORS.accentDim, border: `2px solid ${COLORS.accent}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Icon name="check" size={22} color={COLORS.accent} /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>¡Inversión confirmada!</div>
              </div>
            ) : state === "loading" || factura.isTxPending ? (
              <div style={{ textAlign: "center", padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <Spinner /> <div style={{ fontSize: 13, color: COLORS.textMuted }}>Ejecutando en Blockchain...</div>
              </div>
            ) : metaAlcanzada || invoice.status === "Completado" ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <button disabled style={{ width: "100%", padding: 14, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontSize: 15, fontWeight: 700, cursor: "not-allowed", fontFamily: "'DM Sans', sans-serif" }}>
                  Recaudación Completada
                </button>
              </div>
            ) : invoice.status === "Recaudando" ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Monto a invertir (ANKD)</label>
                  <div style={{ position: "relative" }}>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Máximo disponbile: ${restante}`}
                      style={{ width: "100%", padding: "12px 16px 12px 16px", background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 16, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = COLORS.accent} onBlur={e => e.target.style.borderColor = COLORS.border}
                    />
                  </div>
                </div>
                <button onClick={handleInvest} style={{ width: "100%", padding: 14, background: COLORS.accentGradient, border: "none", borderRadius: 8, color: "#E8EDF5", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Invertir ahora
                </button>
              </>
            ) : (
              <div style={{ color: COLORS.textMuted, textAlign: 'center' }}>Proyecto no disponible.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Faucet = ({ wallet, factura }) => {
  const [state, setState] = useState("idle");
  return (
    <div style={{ padding: "48px 32px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Testnet Tolls</div>
      <h2 style={{ fontSize: 26, fontFamily: "'Inter', sans-serif", color: COLORS.text, margin: "0 0 8px" }}>Faucet ANKDOL</h2>
      <p style={{ fontSize: 14, color: COLORS.textMuted, margin: "0 0 40px", lineHeight: 1.7 }}>Recibí tokens ANKD para probar Sepolia Testnet.</p>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
          <div><div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Token</div><div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>ANKD</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Cantidad</div><div style={{ fontSize: 28, fontFamily: "'Inter', sans-serif", fontWeight: 700, color: COLORS.accent }}>200</div></div>
        </div>
        <div style={{ marginBottom: 24 }}><div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Tu billetera</div><div style={{ padding: "10px 14px", background: COLORS.surfaceAlt, borderRadius: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.textMuted }}>{wallet}</div></div>
        {state === "success" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}><div style={{ fontSize: 36, marginBottom: 12 }}>✓</div><div style={{ fontSize: 16, fontWeight: 700, color: COLORS.accent }}>200 ANKD enviados</div></div>
        ) : state === "loading" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0" }}><Spinner /><span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>Enviando tokens desde el contrato...</span></div>
        ) : (
          <button onClick={async () => {
            setState("loading");
            try { await factura.claimFaucet(); setState("success"); factura.recargarDatos(); }
            catch (e) { setState("idle"); alert("Error Faucet"); }
          }}
            style={{ width: "100%", padding: 14, background: COLORS.accentDim, border: `1px solid ${COLORS.accent}55`, borderRadius: 8, color: COLORS.accent, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Icon name="faucet" size={18} color={COLORS.accent} /> Recibir 200 Tokens
          </button>
        )}
      </div>
    </div>
  );
};

const Portfolio = ({ factura }) => {
  const [claiming, setClaiming] = useState(null);

  const invReal = Number(factura.inversionRealizada);
  const esPagado = factura.estadoActual === 2;
  const statusText = esPagado ? "Pagado" : factura.estadoActual === 1 ? "Completado" : "Recaudando";

  const thePortfolio = [];
  if (invReal > 0) {
    thePortfolio.push({
      id: 1, asset: "Factura Acme Corp (Smart Contract)", invested: invReal,
      status: statusText, gain: esPagado ? invReal * 0.1 : 0, canClaim: esPagado
    });
  }

  const handleClaim = async (p) => {
    if (p.id === 1) {
      setClaiming(1);
      try {
        await factura.claimReturn();
        factura.recargarDatos();
      } catch (e) { }
      setClaiming(null);
    }
  };

  return (
    <div style={{ padding: "32px" }}>
      <h2 style={{ fontSize: 26, fontFamily: "'Inter', sans-serif", color: COLORS.text, margin: "0 0 4px" }}>Mis Inversiones</h2>
      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "0 0 32px" }}>Seguí tus inversiones conectadas en cadena</p>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr", padding: "14px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
          {["Activo", "Invertido", "Estado", "Ganancia", "Acción"].map((h, i) => <div key={i} style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{h}</div>)}
        </div>

        {thePortfolio.length === 0 && <div style={{ padding: "30px", color: COLORS.textMuted, textAlign: "center" }}>No tienes inversiones activas</div>}

        {thePortfolio.map(p => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr", padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, alignItems: "center" }}>
            <div><div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{p.asset}</div></div>
            <div style={{ fontSize: 14, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{p.invested} ANKD</div>
            <div><Tag label={p.status} color={p.status === "Pagado" ? COLORS.gold : COLORS.accent} /></div>
            <div style={{ fontSize: 14, color: p.gain > 0 ? COLORS.accent : COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{p.gain > 0 ? `+${p.gain} ANKD` : "—"}</div>
            <div>
              {p.canClaim ? (
                claiming === p.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Spinner /><span style={{ fontSize: 12, color: COLORS.textMuted }}>Tx...</span></div>
                ) : (
                  <button onClick={() => handleClaim(p)} style={{ padding: "8px 16px", background: COLORS.goldDim, border: `1px solid ${COLORS.gold}55`, borderRadius: 6, color: COLORS.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Retirar {p.invested + p.gain}</button>
                )
              ) : <span style={{ fontSize: 12, color: COLORS.textDim }}>{esPagado ? "Retirado" : "En curso"}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Admin = ({ factura }) => {
  const [loading, setLoading] = useState(null);
  const esRec = factura.estadoActual === 0;
  const esComp = factura.estadoActual === 1;

  const finalize = async () => {
    setLoading(1);
    try {
      await factura.finishAndPay();
      factura.recargarDatos();
    } catch (e) { }
    setLoading(null);
  };

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><div style={{ padding: "6px 12px", background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 6, fontSize: 11, color: COLORS.red, fontWeight: 700, letterSpacing: "0.08em" }}>ADMIN ONLY</div></div>
      <h2 style={{ fontSize: 26, fontFamily: "'Inter', sans-serif", color: COLORS.text, margin: "0 0 4px" }}>Panel de Administración</h2>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 24, marginTop: 24 }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex" }}><span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Gestión del Contrato</span></div>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Factura Acme Corp</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{factura.porcentaje}% · {factura.recaudadoFormateado} ANKD</span><div style={{ width: 120 }}><ProgressBar pct={factura.porcentaje} color={COLORS.accent} /></div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {factura.estadoActual === 2 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.accent, fontSize: 13 }}><Icon name="check" size={14} color={COLORS.accent} /> PAGO SIMULADO: Ok</div>
            ) : loading === 1 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Spinner /><span style={{ fontSize: 12, color: COLORS.textMuted }}>Ejecutando...</span></div>
            ) : (
              <button onClick={finalize} disabled={!esComp}
                style={{ padding: "10px 20px", background: COLORS.redDim, border: `1px solid ${COLORS.red}55`, borderRadius: 7, color: COLORS.red, fontSize: 12, fontWeight: 700, cursor: esComp ? "pointer" : "not-allowed", opacity: esComp ? 1 : 0.4 }}>
                {esRec ? "Esperando a recaudar 1000" : "Simular Empresa Pagando 1100 ANKD"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================== NAV + SHELL =====================
const NAV_ITEMS = [{ id: "dashboard", label: "Activos", icon: "chart" }, { id: "portfolio", label: "Mis Inversiones", icon: "portfolio" }, { id: "faucet", label: "Faucet", icon: "faucet" }, { id: "admin", label: "Admin", icon: "admin" }];

function MainApp() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const factura = useFactura();
  const wallet = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No conectada";

  const [view, setView] = useState("landing");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");

  const stNum = parseInt(factura.estadoActual);
  const statusLbl = stNum === 2 ? "Pagado" : stNum === 1 ? "Completado" : "Recaudando";

  const allInvoices = [
    {
      id: 1, company: "Acme Corp Factura (Contrato Real)", sector: "Construcción",
      raised: Number(factura.recaudadoFormateado), goal: 1000, yield: 10.0, days: 30, risk: "Bajo", riskColor: COLORS.accent, status: statusLbl,
      description: "Esta es tu factura del smart contract conectada en tiempo real a Sepolia.",
      history: [0, 100, 250, 400, Number(factura.recaudadoFormateado)],
    },
    {
      id: 2, company: "MercadoFresh Demo", sector: "Logística", raised: 420, goal: 800, yield: 14.2, days: 15, risk: "Medio", riskColor: COLORS.gold, status: "Recaudando", description: "Demo visual", history: [50, 100, 180, 280, 420],
    }
  ];

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      * { box-sizing: border-box; } body { margin: 0; background: ${COLORS.bg}; overflow-x: hidden; }
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    // Exponemos la navegación al listener de background para no depender de Router
    window.forceNavigateToPortfolio = () => {
      setSelectedInvoice(null);
      setActiveNav("portfolio");
    };
  }, []);

  const handleConnect = () => { connect({ connector: injected() }); setView("app"); setActiveNav("dashboard"); };

  if (view === "landing" && !isConnected) return (<Landing onConnect={handleConnect} />);

  const renderMain = () => {
    if (selectedInvoice) return <ProjectDetail invoice={selectedInvoice} onBack={() => setSelectedInvoice(null)} factura={factura} />;
    switch (activeNav) {
      case "dashboard": return <DashboardUI invoices={allInvoices} onSelectInvoice={(inv) => setSelectedInvoice(inv)} />;
      case "portfolio": return <Portfolio factura={factura} />;
      case "faucet": return <Faucet wallet={wallet} factura={factura} />;
      case "admin": return <Admin factura={factura} />;
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: COLORS.bg, color: COLORS.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ height: 60, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 24, top: 0, background: COLORS.bg + "F0", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15, marginRight: 24 }}>
          {/* EL LOGO AHORA USA UN GLOW EN LUGAR DE UN BORDE SÓLIDO */}
          <img src="/logo.png" alt="ANKDOL" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'cover', filter: `drop-shadow(0 0 8px ${COLORS.accent}66)` }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.text, letterSpacing: "0.05em", textTransform: "uppercase" }}>ANKDOL</span>
        </div>
        <nav style={{ display: "flex", gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const active = activeNav === item.id && !selectedInvoice;
            return (
              <button key={item.id} onClick={() => { setActiveNav(item.id); setSelectedInvoice(null); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", background: active ? COLORS.accentDim : "transparent", border: `1px solid ${active ? COLORS.accent + "44" : "transparent"}`, borderRadius: 7, color: active ? COLORS.accent : COLORS.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 400, transition: "all 0.15s" }}>
                <Icon name={item.icon} size={14} color={active ? COLORS.accent : "currentColor"} />{item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, boxShadow: `0 0 6px ${COLORS.accent}` }} /><span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: COLORS.textMuted }}>{wallet} || {factura.balanceFormateado} ANKD</span></div>
      </header>
      <main style={{ flex: 1, animation: "fadeIn 0.3s ease" }}>{renderMain()}</main>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
