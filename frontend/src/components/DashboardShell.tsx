import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AccountType } from "../lib/api";
import Logo from "./Logo";
import CalmLandscape from "./CalmLandscape";

type Section = "overview" | "profile" | "network";
const copy = {
  autistic_person: { label: "Espacio personal", title: "Un espacio para ser tú.", text: "Puedes contar cómo te sientes, conocer tus apoyos o simplemente tomarte un momento. Tú eliges por dónde empezar." },
  parent_guardian: { label: "Espacio familiar", title: "Acompañar, paso a paso.", text: "Un lugar para conocer los apoyos compartidos y estar cerca, respetando las decisiones y los tiempos de cada persona." },
  teacher: { label: "Espacio docente", title: "Cada forma de aprender cuenta.", text: "Organiza el acompañamiento educativo, consulta los apoyos autorizados y registra observaciones con atención y respeto." },
  admin: { label: "Administración", title: "Una red que cuida.", text: "Consulta la actividad de la plataforma y sus autorizaciones." }
};
export default function DashboardShell({ name, role, section, onSection, onLogout, children }: {
  name: string; role: AccountType | null; section: Section; onSection: (section: Section) => void; onLogout: () => void; children: ReactNode;
}) {
  const [quiet, setQuiet] = useState(false);
  const content = copy[role ?? "autistic_person"];
  const links: { id: Section; label: string; icon: string }[] = [{ id: "overview", label: role === "autistic_person" ? "Mi bienestar" : "Resumen", icon: "01" }, { id: "profile", label: "Mi perfil", icon: "02" }, { id: "network", label: "Mi red de apoyo", icon: "03" }];
  return <div className={`dashboard-shell${quiet ? " is-quiet" : ""}`}>
    <a className="skip-link" href="#dashboard-content">Saltar al contenido</a>
    <aside className="dashboard-sidebar">
      <Link className="dashboard-brand" to="/" aria-label="Nébula, inicio"><Logo /></Link>
      <p className="dashboard-role">{content.label}</p>
      <nav aria-label="Secciones de mi espacio">{links.filter(link => role !== "admin" || link.id === "overview").map(link => <button key={link.id} type="button" aria-current={section === link.id ? "page" : undefined} onClick={() => onSection(link.id)}><span aria-hidden="true">{link.icon}</span>{link.label}</button>)}</nav>
      <div className="sidebar-note"><span aria-hidden="true">✓</span><strong>A tu ritmo</strong><p>No necesitas completar todo hoy. Este espacio es para ti.</p></div>
      <button className="dashboard-logout" type="button" onClick={onLogout}>Cerrar sesión</button>
    </aside>
    <main className="dashboard-main" id="dashboard-content" tabIndex={-1}>
      <header className="dashboard-topline"><p>Hola, <strong>{name}</strong></p><button className="quiet-toggle" type="button" aria-pressed={quiet} onClick={() => setQuiet(value => !value)}>Vista sencilla: {quiet ? "activada" : "desactivada"}</button></header>
      <section className="dashboard-welcome"><div><span className="profile-kicker">{content.label} · Nébula</span><h1>{content.title}</h1><p>{content.text}</p><span className="welcome-note">Sin prisa. Un paso a la vez.</span></div><CalmLandscape /></section>
      <div className="dashboard-content" key={role}>{children}</div>
    </main>
  </div>;
}
