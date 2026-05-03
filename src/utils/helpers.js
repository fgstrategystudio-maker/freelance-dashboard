export function formatCurrency(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function getStatoColor(stato) {
  const map = {
    "In corso": "#22c55e",
    "In scadenza": "#f59e0b",
    "Da chiarire": "#8b5cf6",
    Sospeso: "#6b7280",
    Concluso: "#3b82f6",
    Perso: "#ef4444",
  };
  return map[stato] || "#6b7280";
}

export function getPrioritaColor(priorita) {
  const map = {
    Alta: "#ef4444",
    Media: "#f59e0b",
    Bassa: "#22c55e",
  };
  return map[priorita] || "#6b7280";
}

export function calcNetto(lordo, fattore) {
  if (lordo == null) return null;
  return Math.round(lordo * fattore);
}

export function getCommessaLordoMensile(commessa) {
  if (commessa.lordoMensile) return commessa.lordoMensile;
  if (commessa.lordoProgetto && commessa.inizio && commessa.fine) {
    const mesi = monthsBetween(commessa.inizio, commessa.fine);
    return mesi > 0 ? Math.round(commessa.lordoProgetto / mesi) : commessa.lordoProgetto;
  }
  return null;
}

const MESI_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function getMeseCorrente() {
  const now = new Date();
  return `${MESI_IT[now.getMonth()]} ${now.getFullYear()}`;
}

export function getMesePrecedente() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${MESI_IT[d.getMonth()]} ${d.getFullYear()}`;
}

// Parsa date ISO come orario locale (evita shift UTC → problemi con date a mezzanotte)
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getLordoPerMese(monthIdx, year, commesse) {
  const monthStart = new Date(year, monthIdx, 1);
  const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59);
  return commesse
    .filter((c) => {
      if (c.stato !== "In corso" && c.stato !== "In scadenza") return false;
      const lordo = getCommessaLordoMensile(c);
      if (!lordo) return false;
      const start = c.inizio ? parseLocalDate(c.inizio) : null;
      const end = c.fine ? parseLocalDate(c.fine) : null;
      if (end && end < monthStart) return false;
      if (start && start > monthEnd) return false;
      return true;
    })
    .reduce((sum, c) => sum + (getCommessaLordoMensile(c) || 0), 0);
}

export function monthsBetween(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}
