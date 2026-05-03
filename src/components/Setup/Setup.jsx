import { useState } from "react";
import { formatCurrency } from "../../utils/helpers";
import styles from "./Setup.module.css";

export default function Setup({ setup, setSetup }) {
  const [form, setForm] = useState({
    fattoreNetto: (setup.fattoreNetto * 100).toFixed(0),
    alertScadenzaGiorni: setup.alertScadenzaGiorni,
  });
  const [saved, setSaved] = useState(false);

  const fiscale = setup.fiscale || {};
  const [fiscaleForm, setFiscaleForm] = useState({
    regime: fiscale.regime || "forfettario",
    aliquotaIVA: fiscale.aliquotaIVA ?? 0,
    aliquotaIRPEF: fiscale.aliquotaIRPEF ?? 15,
    aliquotaINPS: fiscale.aliquotaINPS ?? 26.23,
    bufferExtra: fiscale.bufferExtra ?? 5,
  });
  const [fiscaleSaved, setFiscaleSaved] = useState(false);

  function handleSaveFiscale(e) {
    e.preventDefault();
    setSetup((prev) => ({
      ...prev,
      fiscale: {
        regime: fiscaleForm.regime,
        aliquotaIVA: Number(fiscaleForm.aliquotaIVA),
        aliquotaIRPEF: Number(fiscaleForm.aliquotaIRPEF),
        aliquotaINPS: Number(fiscaleForm.aliquotaINPS),
        bufferExtra: Number(fiscaleForm.bufferExtra),
      },
    }));
    setFiscaleSaved(true);
    setTimeout(() => setFiscaleSaved(false), 2500);
  }

  function setFf(field, value) {
    setFiscaleForm((f) => ({ ...f, [field]: value }));
    if (field === "regime") {
      setFiscaleForm((f) => ({
        ...f,
        regime: value,
        aliquotaIVA: value === "forfettario" ? 0 : 22,
        aliquotaIRPEF: value === "forfettario" ? 15 : 23,
      }));
    }
  }

  const [newMese, setNewMese] = useState("");
  const [newLordo, setNewLordo] = useState("");

  function handleSaveSetup(e) {
    e.preventDefault();
    setSetup((prev) => ({
      ...prev,
      fattoreNetto: Number(form.fattoreNetto) / 100,
      alertScadenzaGiorni: Number(form.alertScadenzaGiorni),
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleAddIncassato(e) {
    e.preventDefault();
    if (!newMese || !newLordo) return;
    const lordo = Number(newLordo);
    const netto = Math.round(lordo * setup.fattoreNetto);
    setSetup((prev) => ({
      ...prev,
      incassatoStorico: [
        ...(prev.incassatoStorico || []),
        { mese: newMese, lordo, netto },
      ],
    }));
    setNewMese("");
    setNewLordo("");
  }

  function handleDeleteIncassato(idx) {
    setSetup((prev) => ({
      ...prev,
      incassatoStorico: prev.incassatoStorico.filter((_, i) => i !== idx),
    }));
  }

  function handleEditIncassato(idx, field, value) {
    setSetup((prev) => {
      const updated = prev.incassatoStorico.map((r, i) => {
        if (i !== idx) return r;
        const newRow = { ...r, [field]: field === "mese" ? value : Number(value) };
        // ricalcola netto se cambia lordo
        if (field === "lordo") newRow.netto = Math.round(Number(value) * prev.fattoreNetto);
        return newRow;
      });
      return { ...prev, incassatoStorico: updated };
    });
  }

  function handleResetAll() {
    if (!confirm("Resettare tutti i dati? L'operazione è irreversibile.")) return;
    localStorage.clear();
    window.location.reload();
  }

  const storico = setup.incassatoStorico || [];
  const totLordo = storico.reduce((s, r) => s + r.lordo, 0);
  const totNetto = storico.reduce((s, r) => s + r.netto, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Setup</h1>
        <p className={styles.subtitle}>Configurazione parametri e storico incassato</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Parametri generali</h2>
          <form className={styles.form} onSubmit={handleSaveSetup}>
            <Field label="Fattore netto (%)">
              <input
                type="number"
                className={styles.input}
                value={form.fattoreNetto}
                onChange={(e) => setForm((f) => ({ ...f, fattoreNetto: e.target.value }))}
                min="1"
                max="100"
                step="1"
              />
              <span className={styles.inputNote}>
                {form.fattoreNetto}% del lordo = netto stimato
              </span>
            </Field>
            <Field label={`Alert scadenze (giorni)`}>
              <input
                type="number"
                className={styles.input}
                value={form.alertScadenzaGiorni}
                onChange={(e) => setForm((f) => ({ ...f, alertScadenzaGiorni: e.target.value }))}
                min="1"
                max="365"
              />
              <span className={styles.inputNote}>
                Alert quando la fine commessa è entro {form.alertScadenzaGiorni} giorni
              </span>
            </Field>
            <div className={styles.formFooter}>
              {saved && <span className={styles.savedMsg}>✓ Salvato</span>}
              <button type="submit" className={styles.saveBtn}>Salva parametri</button>
            </div>
          </form>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Aggiungi incassato</h2>
          <form className={styles.form} onSubmit={handleAddIncassato}>
            <Field label="Mese (es. Aprile 2026)">
              <input
                className={styles.input}
                value={newMese}
                onChange={(e) => setNewMese(e.target.value)}
                placeholder="Aprile 2026"
              />
            </Field>
            <Field label="Lordo incassato (€)">
              <input
                type="number"
                className={styles.input}
                value={newLordo}
                onChange={(e) => setNewLordo(e.target.value)}
                placeholder="es. 4200"
                min="0"
              />
              {newLordo && (
                <span className={styles.inputNote}>
                  Netto stimato: {formatCurrency(Math.round(Number(newLordo) * setup.fattoreNetto))}
                </span>
              )}
            </Field>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.saveBtn}>Aggiungi</button>
            </div>
          </form>
        </section>
      </div>

      <section className={styles.card} style={{ marginTop: "1rem" }}>
        <div className={styles.historicoHeader}>
          <h2 className={styles.sectionTitle}>Storico incassato</h2>
          {storico.length > 0 && (
            <div className={styles.totals}>
              <span className={styles.totalItem}>Totale lordo: <strong>{formatCurrency(totLordo)}</strong></span>
              <span className={styles.totalItem} style={{ color: "#22c55e" }}>Totale netto: <strong>{formatCurrency(totNetto)}</strong></span>
            </div>
          )}
        </div>

        {storico.length === 0 ? (
          <p className={styles.empty}>Nessun dato ancora registrato.</p>
        ) : (
          <div className={styles.storicoTable}>
            <div className={styles.storicoHead}>
              <span>Mese</span>
              <span>Lordo</span>
              <span>Netto</span>
              <span></span>
            </div>
            {storico.map((row, i) => (
              <div key={i} className={styles.storicoRow}>
                <input
                  className={styles.storicoInput}
                  value={row.mese}
                  onChange={(e) => handleEditIncassato(i, "mese", e.target.value)}
                  placeholder="es. Maggio 2026"
                />
                <input
                  className={styles.storicoInput}
                  type="number"
                  value={row.lordo}
                  min="0"
                  onChange={(e) => handleEditIncassato(i, "lordo", e.target.value)}
                />
                <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "0.875rem" }}>
                  {formatCurrency(row.netto)}
                </span>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleDeleteIncassato(i)}
                  title="Rimuovi"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.card} style={{ marginTop: "1rem" }}>
        <h2 className={styles.sectionTitle}>Configurazione fiscale</h2>
        <form className={styles.form} onSubmit={handleSaveFiscale}>
          <Field label="Regime fiscale">
            <select
              className={styles.input}
              value={fiscaleForm.regime}
              onChange={(e) => setFf("regime", e.target.value)}
            >
              <option value="forfettario">Forfettario</option>
              <option value="ordinario">Ordinario</option>
            </select>
          </Field>
          <div className={styles.fiscaleGrid}>
            <Field label="IVA (%)">
              <input
                type="number"
                className={styles.input}
                value={fiscaleForm.aliquotaIVA}
                onChange={(e) => setFiscaleForm((f) => ({ ...f, aliquotaIVA: e.target.value }))}
                min="0" max="30" step="1"
              />
              <span className={styles.inputNote}>
                {fiscaleForm.regime === "forfettario" ? "0% — esente IVA" : "Di norma 22%"}
              </span>
            </Field>
            <Field label="IRPEF / imp. sostitutiva (%)">
              <input
                type="number"
                className={styles.input}
                value={fiscaleForm.aliquotaIRPEF}
                onChange={(e) => setFiscaleForm((f) => ({ ...f, aliquotaIRPEF: e.target.value }))}
                min="0" max="50" step="0.5"
              />
              <span className={styles.inputNote}>
                {fiscaleForm.regime === "forfettario" ? "15% forfettario (5% start-up)" : "Aliquota marginale stimata"}
              </span>
            </Field>
            <Field label="Contributi INPS (%)">
              <input
                type="number"
                className={styles.input}
                value={fiscaleForm.aliquotaINPS}
                onChange={(e) => setFiscaleForm((f) => ({ ...f, aliquotaINPS: e.target.value }))}
                min="0" max="40" step="0.01"
              />
              <span className={styles.inputNote}>26.23% gestione separata</span>
            </Field>
            <Field label="Buffer extra (%)">
              <input
                type="number"
                className={styles.input}
                value={fiscaleForm.bufferExtra}
                onChange={(e) => setFiscaleForm((f) => ({ ...f, bufferExtra: e.target.value }))}
                min="0" max="20" step="1"
              />
              <span className={styles.inputNote}>Riserva aggiuntiva per imprevisti</span>
            </Field>
          </div>
          <div className={styles.formFooter}>
            {fiscaleSaved && <span className={styles.savedMsg}>✓ Salvato</span>}
            <button type="submit" className={styles.saveBtn}>Salva configurazione fiscale</button>
          </div>
        </form>
      </section>

      <section className={styles.dangerZone}>
        <h2 className={styles.dangerTitle}>Zona pericolosa</h2>
        <p className={styles.dangerDesc}>
          Resetta tutti i dati salvati (commesse, setup, storico) e ricarica i dati iniziali.
        </p>
        <button className={styles.resetBtn} onClick={handleResetAll}>
          Reset completo dati
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}
