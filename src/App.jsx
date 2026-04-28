import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { INITIAL_COMMESSE, INITIAL_SETUP } from "./data/initialData";
import Sidebar from "./components/Sidebar/Sidebar";
import Dashboard from "./components/Dashboard/Dashboard";
import Commesse from "./components/Commesse/Commesse";
import Setup from "./components/Setup/Setup";
import styles from "./App.module.css";

export default function App() {
  const [commesse, setCommesse] = useLocalStorage("commesse", INITIAL_COMMESSE);
  const [setup, setSetup] = useLocalStorage("setup", INITIAL_SETUP);
  const [view, setView] = useState("dashboard");

  return (
    <div className={styles.layout}>
      <Sidebar view={view} onNavigate={setView} />
      <main className={styles.main}>
        {view === "dashboard" && (
          <Dashboard commesse={commesse} setup={setup} />
        )}
        {view === "commesse" && (
          <Commesse
            commesse={commesse}
            setCommesse={setCommesse}
            setup={setup}
          />
        )}
        {view === "setup" && (
          <Setup setup={setup} setSetup={setSetup} />
        )}
      </main>
    </div>
  );
}
