import { useState } from "react";
import styles from "./CommessaModal.module.css";

const STATI = ["In corso", "In scadenza", "Da chiarire", "Sospeso", "Concluso", "Perso"];
const TIPI = ["Mensile", "Progetto", "Da definire"];
const PRIORITA = ["Alta", "Media", "Bassa"];

const EMPTY = {
  cliente: "",
  servizio: "",
  tipo: "Mensile",
  inizio: "",
  fine: "",
  stato: "In corso",
  lordoMensile: "",
  lordoProgetto: "",
  upsellTarget: "",
  priorita: "Media",
  note: "",
};

export default function CommessaModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY;
    return {
      ...initial,
      lordoMensile: initial.lordoMensile ?? "",
      lordoProgetto: initial.lordoProgetto ?? "",
      upsellTarget: initial.upsellTarget ?? "",
      inizio: initial.inizio ?? "",
      fine: initial.fine ?? "",
    };
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.cliente.trim()) return;
    onSave({
      ...form,
      id: initial?.id ?? null,
      lordoMensile: form.lordoMensile !== "" ? Number(form.lordoMensile) : null,
      lordoProgetto: form.lordoProgetto !== "" ? Number(form.lordoProgetto) : null,
      upsellTarget: form.upsellTarget !== "" ? Number(form.upsellTarget) : null,
      inizio: form.inizio || null,
      fine: form.fine || null,
    });
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {initial ? "Modifica commessa" : "Nuova commessa"}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <Field label="Cliente *">
              <input
                required
                className={styles.input}
                value={form.cliente}
                onChange={(e) => set("cliente", e.target.value)}
                placeholder="Nome cliente"
              />
            </Field>
            <Field label="Priorità">
              <select className={styles.input} value={form.priorita} onChange={(e) => set("priorita", e.target.value)}>
                {PRIORITA.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Servizio">
            <input
              className={styles.input}
              value={form.servizio}
              onChange={(e) => set("servizio", e.target.value)}
              placeholder="Descrizione del servizio"
            />
          </Field>

          <div className={styles.row}>
            <Field label="Tipo">
              <select className={styles.input} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                {TIPI.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Stato">
              <select className={styles.input} value={form.stato} onChange={(e) => set("stato", e.target.value)}>
                {STATI.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Data inizio">
              <input type="date" className={styles.input} value={form.inizio} onChange={(e) => set("inizio", e.target.value)} />
            </Field>
            <Field label="Data fine">
              <input type="date" className={styles.input} value={form.fine} onChange={(e) => set("fine", e.target.value)} />
            </Field>
          </div>

          <div className={styles.row}>
            <Field label="Lordo mensile (€)">
              <input
                type="number"
                className={styles.input}
                value={form.lordoMensile}
                onChange={(e) => set("lordoMensile", e.target.value)}
                placeholder="es. 1000"
                min="0"
              />
            </Field>
            <Field label="Lordo progetto (€)">
              <input
                type="number"
                className={styles.input}
                value={form.lordoProgetto}
                onChange={(e) => set("lordoProgetto", e.target.value)}
                placeholder="es. 3500"
                min="0"
              />
            </Field>
          </div>

          <Field label="Upsell target lordo (€)">
            <input
              type="number"
              className={styles.input}
              value={form.upsellTarget}
              onChange={(e) => set("upsellTarget", e.target.value)}
              placeholder="Obiettivo upsell mensile"
              min="0"
            />
          </Field>

          <Field label="Note">
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Note interne, reminder, contesto…"
              rows={4}
            />
          </Field>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className={styles.saveBtn}>
              {initial ? "Salva modifiche" : "Crea commessa"}
            </button>
          </div>
        </form>
      </div>
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
