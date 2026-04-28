import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  formatCurrency,
  daysUntil,
  getStatoColor,
  calcNetto,
  getCommessaLordoMensile,
} from "../../utils/helpers";
import styles from "./Dashboard.module.css";

const STATO_ORDER = ["In corso", "In scadenza", "Da chiarire", "Sospeso", "Concluso", "Perso"];

export default function Dashboard({ commesse, setup }) {
  const attive = commesse.filter(
    (c) => c.stato === "In corso" || c.stato === "In scadenza"
  );

  const lordoMensileAttivo = attive.reduce((sum, c) => {
    const v = getCommessaLordoMensile(c);
    return sum + (v || 0);
  }, 0);

  const nettoMensileAttivo = calcNetto(lordoMensileAttivo, setup.fattoreNetto);

  const statoCount = STATO_ORDER.map((s) => ({
    name: s,
    value: commesse.filter((c) => c.stato === s).length,
    color: getStatoColor(s),
  })).filter((s) => s.value > 0);

  const upsellOpportunities = commesse
    .filter((c) => c.upsellTarget)
    .reduce((sum, c) => sum + c.upsellTarget, 0);

  const inScadenza = commesse
    .filter((c) => {
      if (!c.fine) return false;
      const days = daysUntil(c.fine);
      return days !== null && days >= 0 && days <= setup.alertScadenzaGiorni;
    })
    .sort((a, b) => daysUntil(a.fine) - daysUntil(b.fine));

  const barData = commesse
    .filter((c) => getCommessaLordoMensile(c))
    .map((c) => ({
      nome: c.cliente.length > 14 ? c.cliente.slice(0, 14) + "…" : c.cliente,
      Lordo: getCommessaLordoMensile(c),
      Netto: calcNetto(getCommessaLordoMensile(c), setup.fattoreNetto),
    }));

  const revenueHistory = setup.incassatoStorico || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Panoramica commesse e fatturato</p>
      </header>

      {inScadenza.length > 0 && (
        <div className={styles.alertBanner}>
          <span className={styles.alertIcon}>⚠</span>
          <div>
            <strong>Scadenze entro {setup.alertScadenzaGiorni} giorni:</strong>{" "}
            {inScadenza.map((c) => (
              <span key={c.id} className={styles.alertTag}>
                {c.cliente} ({daysUntil(c.fine)}gg)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.kpiGrid}>
        <KpiCard
          label="Lordo mensile attivo"
          value={formatCurrency(lordoMensileAttivo)}
          sub="commesse In corso + In scadenza"
          accent="#6366f1"
        />
        <KpiCard
          label="Netto mensile attivo"
          value={formatCurrency(nettoMensileAttivo)}
          sub={`fattore ${(setup.fattoreNetto * 100).toFixed(0)}%`}
          accent="#22c55e"
        />
        <KpiCard
          label="Commesse attive"
          value={attive.length}
          sub={`su ${commesse.length} totali`}
          accent="#f59e0b"
        />
        <KpiCard
          label="Potenziale upsell"
          value={formatCurrency(upsellOpportunities)}
          sub="obiettivo mensile aggregato"
          accent="#a78bfa"
        />
      </div>

      {revenueHistory.length > 0 && (
        <div className={styles.incassatoCard}>
          <h2 className={styles.sectionTitle}>Incassato storico</h2>
          <div className={styles.incassatoGrid}>
            {revenueHistory.map((r, i) => (
              <div key={i} className={styles.incassatoRow}>
                <span className={styles.incassatoMese}>{r.mese}</span>
                <span className={styles.incassatoLordo}>{formatCurrency(r.lordo)} lordo</span>
                <span className={styles.incassatoNetto}>{formatCurrency(r.netto)} netto</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Stato commesse</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statoCount}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={3}
              >
                {statoCount.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1a1f2e",
                  border: "1px solid #2d3748",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Fee mensile per cliente</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="nome"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1f2e",
                  border: "1px solid #2d3748",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
                formatter={(v) => formatCurrency(v)}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>
                )}
              />
              <Bar dataKey="Lordo" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Netto" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {inScadenza.length > 0 && (
        <div className={styles.scadenzeCard}>
          <h2 className={styles.sectionTitle}>Commesse in scadenza</h2>
          <div className={styles.scadenzeList}>
            {inScadenza.map((c) => {
              const days = daysUntil(c.fine);
              return (
                <div key={c.id} className={styles.scadenzeRow}>
                  <div>
                    <div className={styles.scadenzeCliente}>{c.cliente}</div>
                    <div className={styles.scadenzeServizio}>{c.servizio}</div>
                  </div>
                  <div
                    className={styles.scadenzeDays}
                    style={{ color: days <= 14 ? "#ef4444" : days <= 30 ? "#f59e0b" : "#94a3b8" }}
                  >
                    {days === 0 ? "Oggi" : `${days} giorni`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={styles.kpiCard} style={{ borderTopColor: accent }}>
      <div className={styles.kpiValue} style={{ color: accent }}>
        {value}
      </div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}
