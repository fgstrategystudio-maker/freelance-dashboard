import { formatCurrency, daysUntil } from "../../utils/helpers";
import styles from "./Fiscale.module.css";

const MESI_IT = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
};

function parseMese(meseStr) {
  if (!meseStr) return null;
  const parts = meseStr.toLowerCase().trim().split(/\s+/);
  if (parts.length < 2) return null;
  const mIdx = MESI_IT[parts[0]];
  const year = parseInt(parts[1]);
  if (mIdx === undefined || isNaN(year)) return null;
  return { month: mIdx, year };
}

function getQuarter(month) {
  return Math.floor(month / 3);
}

function getScadenzaIVA(quarter, year) {
  const map = [
    { label: "Q1 (gen–mar)", deadline: `${year}-05-16` },
    { label: "Q2 (apr–giu)", deadline: `${year}-08-16` },
    { label: "Q3 (lug–set)", deadline: `${year}-11-16` },
    { label: "Q4 (ott–dic)", deadline: `${year + 1}-02-16` },
  ];
  return map[quarter];
}

export default function Fiscale({ setup }) {
  const fiscale = setup.fiscale || {};
  const {
    regime = "forfettario",
    aliquotaIVA = 0,
    aliquotaIRPEF = 15,
    aliquotaINPS = 26.23,
    bufferExtra = 5,
  } = fiscale;

  const storico = setup.incassatoStorico || [];

  const totalLordo = storico.reduce((s, r) => s + r.lordo, 0);

  const ivaRate = aliquotaIVA / 100;
  const irpefRate = aliquotaIRPEF / 100;
  const inpsRate = aliquotaINPS / 100;
  const bufferRate = bufferExtra / 100;

  const totIVA = Math.round(totalLordo * ivaRate);
  const totIRPEF = Math.round(totalLordo * irpefRate);
  const totINPS = Math.round(totalLordo * inpsRate);
  const totBuffer = Math.round(totalLordo * bufferRate);
  const totDaMettere = totIVA + totIRPEF + totINPS + totBuffer;
  const totTieni = totalLordo - totDaMettere;
  const percAccantonamento = totalLordo > 0 ? Math.round((totDaMettere / totalLordo) * 100) : 0;

  // Raggruppa per trimestre per scadenze IVA
  const quarterMap = {};
  storico.forEach((r) => {
    const parsed = parseMese(r.mese);
    if (!parsed) return;
    const q = getQuarter(parsed.month);
    const key = `${parsed.year}-Q${q}`;
    if (!quarterMap[key]) {
      quarterMap[key] = { quarter: q, year: parsed.year, lordo: 0, iva: 0 };
    }
    quarterMap[key].lordo += r.lordo;
    quarterMap[key].iva += Math.round(r.lordo * ivaRate);
  });

  const scadenzeIVA = Object.values(quarterMap)
    .map((q) => {
      const info = getScadenzaIVA(q.quarter, q.year);
      const days = daysUntil(info.deadline);
      return { ...q, ...info, days };
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Fiscale</h1>
        <p className={styles.subtitle}>
          Regime {regime} · Accantonamento consigliato {percAccantonamento}% del lordo
        </p>
      </header>

      {storico.length === 0 && (
        <div className={styles.empty}>
          Aggiungi gli incassi nella sezione Setup → Storico incassato per attivare i calcoli.
        </div>
      )}

      {storico.length > 0 && (
        <>
          {/* Salvadanaio */}
          <section className={styles.salvadanaio}>
            <h2 className={styles.sectionTitle}>Salvadanaio fiscale</h2>
            <p className={styles.salvadanaioBasis}>
              Calcolato su <strong>{formatCurrency(totalLordo)}</strong> lordo incassato
            </p>
            <div className={styles.breakdownGrid}>
              {aliquotaIVA > 0 && (
                <BreakdownCard
                  label="IVA da versare"
                  rate={aliquotaIVA}
                  amount={totIVA}
                  color="#f59e0b"
                  note="Non è tua — va restituita all'erario"
                />
              )}
              <BreakdownCard
                label="IRPEF stimata"
                rate={aliquotaIRPEF}
                amount={totIRPEF}
                color="#6366f1"
                note={regime === "forfettario" ? "Imposta sostitutiva 15%" : "Aliquota marginale"}
              />
              <BreakdownCard
                label="Contributi INPS"
                rate={aliquotaINPS}
                amount={totINPS}
                color="#8b5cf6"
                note="Gestione separata"
              />
              {bufferExtra > 0 && (
                <BreakdownCard
                  label="Buffer extra"
                  rate={bufferExtra}
                  amount={totBuffer}
                  color="#64748b"
                  note="Riserva di sicurezza"
                />
              )}
            </div>

            <div className={styles.totalBar}>
              <div className={styles.totalItem}>
                <span className={styles.totalLabel}>Da accantonare</span>
                <span className={styles.totalAmount} style={{ color: "#ef4444" }}>
                  {formatCurrency(totDaMettere)}
                </span>
                <span className={styles.totalPercent}>{percAccantonamento}% del lordo</span>
              </div>
              <div className={styles.totalDivider} />
              <div className={styles.totalItem}>
                <span className={styles.totalLabel}>Puoi spendere</span>
                <span className={styles.totalAmount} style={{ color: "#22c55e" }}>
                  {formatCurrency(totTieni)}
                </span>
                <span className={styles.totalPercent}>{100 - percAccantonamento}% del lordo</span>
              </div>
            </div>
          </section>

          {/* Dettaglio mensile */}
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Dettaglio per incasso</h2>
            <div className={styles.tableHead}>
              <span>Mese</span>
              <span>Lordo</span>
              {aliquotaIVA > 0 && <span>IVA</span>}
              <span>IRPEF</span>
              <span>INPS</span>
              <span>Accantona</span>
              <span>Tieni</span>
            </div>
            {storico.map((r, i) => {
              const iva = Math.round(r.lordo * ivaRate);
              const irpef = Math.round(r.lordo * irpefRate);
              const inps = Math.round(r.lordo * inpsRate);
              const buf = Math.round(r.lordo * bufferRate);
              const accantona = iva + irpef + inps + buf;
              const tieni = r.lordo - accantona;
              return (
                <div key={i} className={styles.tableRow}>
                  <span className={styles.meseCell}>{r.mese}</span>
                  <span>{formatCurrency(r.lordo)}</span>
                  {aliquotaIVA > 0 && <span style={{ color: "#f59e0b" }}>{formatCurrency(iva)}</span>}
                  <span style={{ color: "#818cf8" }}>{formatCurrency(irpef)}</span>
                  <span style={{ color: "#a78bfa" }}>{formatCurrency(inps)}</span>
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>{formatCurrency(accantona)}</span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>{formatCurrency(tieni)}</span>
                </div>
              );
            })}
          </section>

          {/* Scadenze IVA */}
          {aliquotaIVA > 0 && scadenzeIVA.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Scadenze IVA trimestrali</h2>
              <div className={styles.scadenzeList}>
                {scadenzeIVA.map((s) => {
                  const isPast = s.days !== null && s.days < 0;
                  const isUrgent = s.days !== null && s.days >= 0 && s.days <= 30;
                  const isWarning = s.days !== null && s.days > 30 && s.days <= 60;
                  const urgColor = isPast ? "#6b7280" : isUrgent ? "#ef4444" : isWarning ? "#f59e0b" : "#22c55e";
                  return (
                    <div key={`${s.year}-${s.quarter}`} className={styles.scadenzaRow}>
                      <div>
                        <div className={styles.scadenzaLabel}>{s.label} — {s.year}</div>
                        <div className={styles.scadenzaDate}>
                          Scadenza: {new Date(s.deadline).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                      </div>
                      <div className={styles.scadenzaRight}>
                        <span className={styles.scadenzaIVA} style={{ color: "#f59e0b" }}>
                          {formatCurrency(s.iva)}
                        </span>
                        <span className={styles.scadenzaDays} style={{ color: urgColor }}>
                          {isPast
                            ? `scaduta ${Math.abs(s.days)}gg fa`
                            : s.days === 0
                            ? "Oggi!"
                            : `tra ${s.days} giorni`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Nota regime forfettario */}
          {regime === "forfettario" && aliquotaIVA === 0 && (
            <div className={styles.infoBox}>
              <strong>Regime forfettario:</strong> esente IVA — non addebiti né versi IVA.
              L&apos;imposta sostitutiva IRPEF al {aliquotaIRPEF}% si paga in acconto (novembre) e saldo (giugno) dell&apos;anno successivo.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BreakdownCard({ label, rate, amount, color, note }) {
  return (
    <div className={styles.breakdownCard} style={{ borderTopColor: color }}>
      <div className={styles.breakdownRate} style={{ color }}>{rate}%</div>
      <div className={styles.breakdownLabel}>{label}</div>
      <div className={styles.breakdownAmount} style={{ color }}>{formatCurrency(amount)}</div>
      <div className={styles.breakdownNote}>{note}</div>
    </div>
  );
}
