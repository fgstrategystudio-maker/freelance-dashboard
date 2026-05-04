import { useState } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from "recharts";
import {
  formatCurrency,
  daysUntil,
  getStatoColor,
  calcNetto,
  getCommessaLordoMensile,
  getMeseCorrente,
  getLordoPerMese,
} from "../../utils/helpers";
import styles from "./Dashboard.module.css";

const MESI_IT = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
];
const MESI_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const TIPO_COLOR = {
  reale:      "#22c55e",
  stimato:    "#f59e0b",
  proiezione: "#274d91",
  mancante:   "#1a2540",
};

const STATO_ORDER = ["In corso","In scadenza","Da chiarire","Sospeso","Concluso","Perso"];

export default function Dashboard({ commesse, setup, setSetup }) {
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
  const sortedStorico = [...revenueHistory].sort((a, b) => {
    const [mA, yA = "0"] = a.mese.split(" ");
    const [mB, yB = "0"] = b.mese.split(" ");
    const yearDiff = Number(yA) - Number(yB);
    if (yearDiff !== 0) return yearDiff;
    return MESI_IT.indexOf(mA) - MESI_IT.indexOf(mB);
  });

  const meseCorrente = getMeseCorrente();
  const meseCorrManc = !revenueHistory.some(
    (r) => r.mese.toLowerCase() === meseCorrente.toLowerCase()
  );

  const costiFissi = setup.costiFissi || [];
  const totaleCostiFissi = costiFissi.reduce((s, c) => s + c.importo, 0);
  const profittoMensile = nettoMensileAttivo - totaleCostiFissi;
  const breakEvenLordo = totaleCostiFissi > 0
    ? Math.round(totaleCostiFissi / setup.fattoreNetto)
    : null;

  // YTD escluso mese corrente
  const storicoSenzaMeseCorrente = sortedStorico.filter(
    (r) => r.mese.toLowerCase() !== meseCorrente.toLowerCase()
  );
  const ytdLordo = storicoSenzaMeseCorrente.reduce((s, r) => s + r.lordo, 0);
  const ytdNetto = storicoSenzaMeseCorrente.reduce((s, r) => s + r.netto, 0);
  const ytdProfitto = totaleCostiFissi > 0
    ? ytdNetto - totaleCostiFissi * storicoSenzaMeseCorrente.length
    : null;

  // — Panoramica annuale —
  const now = new Date();
  const anno = now.getFullYear();
  const meseIdx = now.getMonth();

  const annualData = MESI_IT.map((nome, i) => {
    const label = `${nome} ${anno}`;
    const recorded = revenueHistory.find(
      (r) => r.mese.toLowerCase() === label.toLowerCase()
    );
    let tipo, lordo;
    if (recorded) {
      tipo = "reale";
      lordo = recorded.lordo;
    } else if (i < meseIdx) {
      tipo = "mancante";
      lordo = 0;
    } else if (i === meseIdx) {
      tipo = "stimato";
      lordo = getLordoPerMese(i, anno, commesse);
    } else {
      tipo = "proiezione";
      lordo = getLordoPerMese(i, anno, commesse);
    }
    return { mese: MESI_SHORT[i], lordo, tipo, netto: calcNetto(lordo, setup.fattoreNetto) };
  });

  const totReale = annualData.filter((d) => d.tipo === "reale").reduce((s, d) => s + d.netto, 0);
  const totProiezione = annualData.filter((d) => d.tipo !== "reale" && d.tipo !== "mancante").reduce((s, d) => s + d.netto, 0);
  const totAnno = totReale + totProiezione;
  const mesiMancanti = annualData.filter((d) => d.tipo === "mancante").length;

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

      {meseCorrManc && (
        <MonthlyPrompt
          mese={meseCorrente}
          stimaLordo={lordoMensileAttivo}
          fattoreNetto={setup.fattoreNetto}
          commesseAttive={attive}
          onAdd={(entry) =>
            setSetup((prev) => ({
              ...prev,
              incassatoStorico: [...(prev.incassatoStorico || []), entry],
            }))
          }
        />
      )}

      <div className={styles.kpiGrid}>
        <KpiCard label="Lordo mensile attivo" value={formatCurrency(lordoMensileAttivo)} sub="commesse In corso + In scadenza" accent="#c8a96e" />
        <KpiCard label="Netto mensile attivo" value={formatCurrency(nettoMensileAttivo)} sub={`fattore ${(setup.fattoreNetto * 100).toFixed(0)}%`} accent="#22c55e" />
        <KpiCard label="Commesse attive" value={attive.length} sub={`su ${commesse.length} totali`} accent="#f59e0b" />
        <KpiCard label="Potenziale upsell" value={formatCurrency(upsellOpportunities)} sub="obiettivo mensile aggregato" accent="#7b9cd4" />
        {totaleCostiFissi > 0 && (
          <KpiCard
            label="Costi mensili"
            value={formatCurrency(totaleCostiFissi)}
            sub={`${costiFissi.length} voci · ${meseCorrente.split(" ")[0]}`}
            accent="#f43f5e"
          />
        )}
        {totaleCostiFissi > 0 && (
          <KpiCard
            label="Profitto mensile"
            value={formatCurrency(profittoMensile)}
            sub={`netto − ${formatCurrency(totaleCostiFissi)} costi fissi`}
            accent={profittoMensile >= 0 ? "#22c55e" : "#ef4444"}
          />
        )}
      </div>

      {/* Panoramica annuale */}
      <div className={styles.annualCard}>
        <div className={styles.annualHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Panoramica {anno}</h2>
            <p className={styles.annualSub}>
              <span style={{ color: "#22c55e" }}>■</span> Registrato{" "}
              <span style={{ color: "#f59e0b", marginLeft: 8 }}>■</span> Stimato{" "}
              <span style={{ color: "#274d91", marginLeft: 8 }}>■</span> Proiezione{" "}
              <span style={{ color: "#1a2540", marginLeft: 8 }}>■</span> Mancante
              {breakEvenLordo && <><span style={{ color: "#ef4444", marginLeft: 8 }}>■</span>{" "}Sotto soglia costi</>}
            </p>
          </div>
          <div className={styles.annualKpis}>
            <div className={styles.annualKpi}>
              <span className={styles.annualKpiVal} style={{ color: "#22c55e" }}>{formatCurrency(totReale)}</span>
              <span className={styles.annualKpiLabel}>Netto reale</span>
            </div>
            <div className={styles.annualKpi}>
              <span className={styles.annualKpiVal} style={{ color: "#274d91" }}>{formatCurrency(totProiezione)}</span>
              <span className={styles.annualKpiLabel}>Proiezione netto</span>
            </div>
            <div className={styles.annualKpi}>
              <span className={styles.annualKpiVal} style={{ color: "#e2e8f0" }}>{formatCurrency(totAnno)}</span>
              <span className={styles.annualKpiLabel}>Totale netto anno</span>
            </div>
          </div>
        </div>

        {mesiMancanti > 0 && (
          <div className={styles.annualWarning}>
            ⚠ {mesiMancanti} {mesiMancanti === 1 ? "mese passato non registrato" : "mesi passati non registrati"} — il totale anno è sottostimato. Aggiornali in Setup → Storico.
          </div>
        )}

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={annualData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="mese" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px" }}
              labelStyle={{ color: "#94a3b8" }}
              itemStyle={{ color: "#e2e8f0" }}
              formatter={(v, name, props) => [
                formatCurrency(v),
                props.payload.tipo === "reale" ? "Netto reale" : props.payload.tipo === "mancante" ? "Non registrato" : props.payload.tipo === "stimato" ? "Netto stimato" : "Netto proiez.",
              ]}
            />
            <Bar dataKey="netto" radius={[4, 4, 0, 0]}>
              {annualData.map((entry, i) => {
                let fill = TIPO_COLOR[entry.tipo];
                if (totaleCostiFissi > 0 && entry.tipo !== "reale" && entry.tipo !== "mancante" && entry.netto < totaleCostiFissi) {
                  fill = "#ef4444";
                }
                return <Cell key={i} fill={fill} opacity={entry.tipo === "mancante" ? 0.4 : 1} />;
              })}
            </Bar>
            {totaleCostiFissi > 0 && (
              <ReferenceLine
                y={totaleCostiFissi}
                stroke="#ef4444"
                strokeDasharray="5 3"
                strokeOpacity={0.55}
                label={{ value: `costi fissi  ${formatCurrency(totaleCostiFissi)}`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {sortedStorico.length > 0 && (
        <div className={styles.incassatoCard}>
          <h2 className={styles.sectionTitle}>Incassato storico</h2>
          <div className={styles.incassatoLayout}>
            <div className={styles.incassatoGrid}>
              {sortedStorico.map((r, i) => {
                const meseShort = (() => {
                  const [m, y] = r.mese.split(" ");
                  const idx = MESI_IT.indexOf(m);
                  return idx >= 0 ? `${MESI_SHORT[idx]} '${(y || "").slice(2)}` : r.mese;
                })();
                const profR = totaleCostiFissi > 0 ? r.netto - totaleCostiFissi : null;
                return (
                  <div key={i} className={styles.incassatoRow}>
                    <span className={styles.incassatoMese}>{meseShort}</span>
                    <span className={styles.incassatoLordo}>{formatCurrency(r.lordo)}</span>
                    <span className={styles.incassatoNetto}>{formatCurrency(r.netto)}</span>
                    {profR !== null && (
                      <span
                        className={styles.profittoTag}
                        style={{
                          color: profR >= 0 ? "#22c55e" : "#ef4444",
                          background: profR >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                        }}
                      >
                        {profR >= 0 ? "+" : ""}{formatCurrency(profR)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {storicoSenzaMeseCorrente.length > 0 && (
              <div className={styles.incassatoYtd}>
                <div className={styles.ytdBlock}>
                  <span className={styles.ytdVal} style={{ color: "#38bdf8" }}>{formatCurrency(ytdLordo)}</span>
                  <span className={styles.ytdLabel}>Lordo incassato YTD</span>
                  <span className={styles.ytdSub}>{storicoSenzaMeseCorrente.length} mesi · escluso {meseCorrente.split(" ")[0]}</span>
                </div>
                <div className={styles.ytdBlock}>
                  <span className={styles.ytdVal} style={{ color: "#34d399" }}>{formatCurrency(ytdNetto)}</span>
                  <span className={styles.ytdLabel}>Netto incassato YTD</span>
                  <span className={styles.ytdSub}>fattore {(setup.fattoreNetto * 100).toFixed(0)}%</span>
                </div>
                {ytdProfitto !== null && (
                  <div className={styles.ytdBlock}>
                    <span className={styles.ytdVal} style={{ color: ytdProfitto >= 0 ? "#22c55e" : "#ef4444" }}>
                      {ytdProfitto >= 0 ? "+" : ""}{formatCurrency(ytdProfitto)}
                    </span>
                    <span className={styles.ytdLabel}>Profitto YTD</span>
                    <span className={styles.ytdSub}>netto − {formatCurrency(totaleCostiFissi)}/mese</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Stato commesse</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statoCount} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {statoCount.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px" }} />
              <Legend formatter={(value) => <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Fee mensile per cliente</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="nome" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", color: "#e2e8f0", fontSize: "13px" }} formatter={(v) => formatCurrency(v)} />
              <Legend formatter={(value) => <span style={{ color: "#94a3b8", fontSize: "12px" }}>{value}</span>} />
              <Bar dataKey="Lordo" fill="#c8a96e" radius={[4, 4, 0, 0]} />
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
                  <div className={styles.scadenzeDays} style={{ color: days <= 14 ? "#ef4444" : days <= 30 ? "#f59e0b" : "#94a3b8" }}>
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

function MonthlyPrompt({ mese, stimaLordo, fattoreNetto, commesseAttive, onAdd }) {
  const [open, setOpen] = useState(false);
  const [lordo, setLordo] = useState(stimaLordo);

  function handleAdd() {
    if (!lordo) return;
    const netto = Math.round(Number(lordo) * fattoreNetto);
    onAdd({ mese, lordo: Number(lordo), netto });
  }

  return (
    <div className={styles.monthlyPrompt}>
      <div className={styles.promptLeft}>
        <span className={styles.promptIcon}>📅</span>
        <div>
          <div className={styles.promptTitle}>
            <strong>{mese}</strong> non è ancora nello storico
          </div>
          <div className={styles.promptSub}>
            Stimato da commesse attive:{" "}
            <strong>{new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(stimaLordo)}</strong>
            {commesseAttive.length > 0 && (
              <span className={styles.promptClients}> ({commesseAttive.map((c) => c.cliente).join(", ")})</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.promptRight}>
        {!open ? (
          <button className={styles.promptBtnPrimary} onClick={() => setOpen(true)}>
            Registra incassato
          </button>
        ) : (
          <div className={styles.promptForm}>
            <div className={styles.promptInputWrap}>
              <label className={styles.promptLabel}>Lordo incassato (€)</label>
              <input
                type="number"
                className={styles.promptInput}
                value={lordo}
                onChange={(e) => setLordo(e.target.value)}
                min="0"
                autoFocus
              />
              {lordo > 0 && (
                <span className={styles.promptNetto}>
                  Netto: {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(Number(lordo) * fattoreNetto))}
                </span>
              )}
            </div>
            <div className={styles.promptActions}>
              <button className={styles.promptBtnSecondary} onClick={() => setOpen(false)}>Annulla</button>
              <button className={styles.promptBtnPrimary} onClick={handleAdd}>Aggiungi</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={styles.kpiCard} style={{ borderTopColor: accent }}>
      <div className={styles.kpiValue} style={{ color: accent }}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}
