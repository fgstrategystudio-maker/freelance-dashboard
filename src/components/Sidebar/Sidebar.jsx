import styles from "./Sidebar.module.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "commesse", label: "Commesse", icon: "◻" },
  { id: "fiscale", label: "Fiscale", icon: "◎" },
  { id: "setup", label: "Setup", icon: "⚙" },
];

export default function Sidebar({ view, onNavigate }) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>◆</span>
        <span className={styles.brandName}>Freelance<br />Dashboard</span>
      </div>
      <ul className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              className={`${styles.navBtn} ${view === item.id ? styles.active : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
