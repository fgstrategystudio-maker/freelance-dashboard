import { useState } from "react";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  getStatoColor,
  getPrioritaColor,
  calcNetto,
  getCommessaLordoMensile,
} from "../../utils/helpers";
import CommessaModal from "../CommessaModal/CommessaModal";
import styles from "./Commesse.module.css";

const STATI = ["In corso", "In scadenza", "Da chiarire", "Sospeso", "Concluso", "Perso"];
const PRIORITA = ["Alta", "Media", "Bassa"];

export default function Commesse({ commesse, setCommesse, setup }) {
  const [search, setSearch] = useState("");
  const [filterStato, setFilterStato] = useState("Tutti");
  const [filterPriorita, setFilterPriorita] = useState("Tutti");
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const filtered = commesse.filter((c) => {
    const matchSearch =
      !search ||
      c.cliente.toLowerCase().includes(search.toLowerCase()) ||
      c.servizio.toLowerCase().includes(search.toLowerCase());
    const matchStato = filterStato === "Tutti" || c.stato === filterStato;
    const matchPriorita = filterPriorita === "Tutti" || c.priorita === filterPriorita;
    return matchSearch && matchStato && matchPriorita;
  });

  const selected = commesse.find((c) => c.id === selectedId);

  function handleNew() {
    setEditData(null);
    setModalOpen(true);
  }

  function handleEdit(commessa) {
    setEditData(commessa);
    setModalOpen(true);
  }

  function handleDelete(id) {
    if (!confirm("Eliminare questa commessa?")) return;
    setCommesse((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleSave(data) {
    if (data.id) {
      setCommesse((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      if (selectedId === data.id) setSelectedId(data.id);
    } else {
      const newId = Math.max(0, ...commesse.map((c) => c.id)) + 1;
      setCommesse((prev) => [...prev, { ...data, id: newId }]);
    }
    setModalOpen(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Commesse</h1>
          <p className={styles.subtitle}>{commesse.length} totali · {commesse.filter(c => c.stato === "In corso").length} in corso</p>
        </div>
        <button className={styles.addBtn} onClick={handleNew}>
          + Nuova commessa
        </button>
      </header>

      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="Cerca cliente o servizio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterStato}
          onChange={(e) => setFilterStato(e.target.value)}
        >
          <option value="Tutti">Tutti gli stati</option>
          {STATI.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={filterPriorita}
          onChange={(e) => setFilterPriorita(e.target.value)}
        >
          <option value="Tutti">Tutte le priorità</option>
          {PRIORITA.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className={styles.layout}>
        <div className={styles.list}>
          {filtered.length === 0 && (
            <div className={styles.empty}>Nessuna commessa trovata.</div>
          )}
          {filtered.map((c) => {
            const days = c.fine ? daysUntil(c.fine) : null;
            const lordo = getCommessaLordoMensile(c);
            return (
              <div
                key={c.id}
                className={`${styles.card} ${selectedId === c.id ? styles.cardActive : ""}`}
                onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardCliente}>{c.cliente}</div>
                  <span
                    className={styles.badge}
                    style={{ background: getStatoColor(c.stato) + "22", color: getStatoColor(c.stato) }}
                  >
                    {c.stato}
                  </span>
                </div>
                <div className={styles.cardServizio}>{c.servizio}</div>
                <div className={styles.cardMeta}>
                  <span
                    className={styles.prioritaBadge}
                    style={{ color: getPrioritaColor(c.priorita) }}
                  >
                    ● {c.priorita}
                  </span>
                  {lordo && (
                    <span className={styles.feeBadge}>
                      {formatCurrency(lordo)}/mese
                    </span>
                  )}
                  {c.lordoProgetto && !lordo && (
                    <span className={styles.feeBadge}>
                      {formatCurrency(c.lordoProgetto)} progetto
                    </span>
                  )}
                  {days !== null && days >= 0 && (
                    <span
                      className={styles.daysBadge}
                      style={{ color: days <= 14 ? "#ef4444" : days <= 30 ? "#f59e0b" : "#94a3b8" }}
                    >
                      ⏱ {days}gg
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selected && (
          <CommessaDetail
            commessa={selected}
            setup={setup}
            onEdit={() => handleEdit(selected)}
            onDelete={() => handleDelete(selected.id)}
          />
        )}
      </div>

      {modalOpen && (
        <CommessaModal
          initial={editData}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function CommessaDetail({ commessa: c, setup, onEdit, onDelete }) {
  const lordo = getCommessaLordoMensile(c);
  const netto = calcNetto(lordo, setup.fattoreNetto);
  const nettoProgetto = calcNetto(c.lordoProgetto, setup.fattoreNetto);
  const upsellNetto = calcNetto(c.upsellTarget, setup.fattoreNetto);
  const days = c.fine ? daysUntil(c.fine) : null;

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailCliente}>{c.cliente}</h2>
          <p className={styles.detailServizio}>{c.servizio}</p>
        </div>
        <div className={styles.detailActions}>
          <button className={styles.editBtn} onClick={onEdit}>Modifica</button>
          <button className={styles.deleteBtn} onClick={onDelete}>Elimina</button>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <DetailRow label="Stato" value={
          <span style={{ color: getStatoColor(c.stato), fontWeight: 600 }}>{c.stato}</span>
        } />
        <DetailRow label="Priorità" value={
          <span style={{ color: getPrioritaColor(c.priorita), fontWeight: 600 }}>{c.priorita}</span>
        } />
        <DetailRow label="Tipo" value={c.tipo || "—"} />
        <DetailRow label="Inizio" value={formatDate(c.inizio)} />
        <DetailRow label="Fine" value={
          c.fine ? (
            <span>
              {formatDate(c.fine)}
              {days !== null && (
                <span style={{ color: days <= 14 ? "#ef4444" : days <= 30 ? "#f59e0b" : "#94a3b8", marginLeft: "8px", fontSize: "0.8rem" }}>
                  ({days >= 0 ? `tra ${days} giorni` : `scaduta ${Math.abs(days)} giorni fa`})
                </span>
              )}
            </span>
          ) : "—"
        } />
        {lordo && <DetailRow label="Lordo mensile" value={formatCurrency(lordo)} />}
        {netto && <DetailRow label="Netto mensile" value={<span style={{ color: "#22c55e" }}>{formatCurrency(netto)}</span>} />}
        {c.lordoProgetto && <DetailRow label="Lordo progetto" value={formatCurrency(c.lordoProgetto)} />}
        {nettoProgetto && <DetailRow label="Netto progetto" value={<span style={{ color: "#22c55e" }}>{formatCurrency(nettoProgetto)}</span>} />}
        {c.upsellTarget && (
          <>
            <DetailRow label="Upsell target lordo" value={<span style={{ color: "#a78bfa" }}>{formatCurrency(c.upsellTarget)}</span>} />
            <DetailRow label="Upsell target netto" value={<span style={{ color: "#a78bfa" }}>{formatCurrency(upsellNetto)}</span>} />
          </>
        )}
      </div>

      {c.note && (
        <div className={styles.detailNote}>
          <div className={styles.noteLabel}>Note</div>
          <p className={styles.noteText}>{c.note}</p>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}
