import {
  Activity,
  BookOpen,
  Compass,
  Dices,
  Hammer,
  Play,
  Radio,
  Rocket,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { HowToPlayModal } from "../../../components/menu/HowToPlayModal";

const StoryModal = lazy(() => import("../../../components/menu/StoryModal").then((module) => ({ default: module.StoryModal })));

type ServerStatus = {
  online: boolean;
  players: number;
};

export function LoginScreen({ pilotName, setPilotName, onStart, onRandomize }: { pilotName: string; setPilotName: (name: string) => void; onStart: () => void; onRandomize: () => void }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ online: true, players: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const error = useMemo(() => {
    const value = pilotName.trim();
    if (!value) return "Enter a pilot name to launch.";
    if (value.length < 2) return "Pilot name must be at least 2 characters.";
    if (!/^[a-zA-Z0-9 _-]+$/.test(value)) return "Use letters, numbers, spaces, dashes, or underscores.";
    return "";
  }, [pilotName]);

  useEffect(() => {
    let active = true;
    const readStatus = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) throw new Error("Server unavailable");
        const status = await response.json() as { players?: number };
        if (active) setServerStatus({ online: true, players: Math.max(0, Number(status.players) || 0) });
      } catch {
        if (active) setServerStatus((current) => ({ ...current, online: false }));
      }
    };
    void readStatus();
    const timer = window.setInterval(readStatus, 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const submit = () => {
    if (error) { inputRef.current?.focus(); return; }
    onStart();
  };

  return <section className="loginScreen" aria-label="BaseBorn pilot entry">
    <div className="loginBackdrop" aria-hidden="true" />
    <div className="loginVignette" aria-hidden="true" />

    <aside className="loginSystemStatus" aria-label="Game system status">
      <Activity size={15} />
      <div><strong>Systems online</strong><span>All systems operational</span></div>
      <i />
    </aside>

    <aside className="loginSectorStatus" aria-label="Multiplayer server status">
      <div><span>Sector: <strong>Void Harbor</strong></span><small>{serverStatus.players} {serverStatus.players === 1 ? "pilot" : "pilots"} online</small></div>
      <i className={serverStatus.online ? "is-online" : ""} />
      <Radio size={24} />
    </aside>

    <div className="loginContent">
      <header className="loginBrand">
        <div className="loginBrand__emblem"><Rocket size={42} strokeWidth={1.35} /><i /><i /></div>
        <h1>BASEBORN</h1>
        <p>Build <b>•</b> Defend <b>•</b> Survive</p>
      </header>

      <main className="loginCard">
        <header><span>Pilot login</span><p>Welcome back, Pilot.</p></header>
        <label className="loginField">
          <span>Pilot callsign</span>
          <div><User size={18}/><input ref={inputRef} autoFocus value={pilotName} maxLength={16} aria-invalid={Boolean(error)} aria-describedby="pilot-error" placeholder="Enter pilot name" onChange={(event) => setPilotName(event.target.value.slice(0,16))} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} /><button type="button" aria-label="Random pilot name" title="Generate random callsign" onClick={onRandomize}><Dices size={18}/></button></div>
          <small id="pilot-error" className={error ? "loginField__error" : ""}>{error || `${pilotName.length}/16 • Saved on this browser`}</small>
        </label>
        <button type="button" className="loginLaunch" disabled={Boolean(error)} onClick={submit}><Play size={19} fill="currentColor"/>Launch into sector</button>
        <div className="loginDivider"><i /><span>Mission archive</span><i /></div>
        <div className="loginActions">
          <button type="button" onClick={() => setHelpOpen(true)}><BookOpen size={16}/><span>Controls</span></button>
          <button type="button" onClick={() => setStoryOpen(true)}><ScrollText size={16}/><span>Story</span></button>
          <button type="button" onClick={() => setSettingsOpen((value) => !value)}><Settings size={16}/><span>Settings</span></button>
        </div>
        {settingsOpen && <div className="loginInlineNotice"><strong>Interface defaults</strong><span>North-up map • Motion follows system settings • Pilot name stored locally</span></div>}
      </main>
    </div>

    <footer className="loginFooter">
      <div className="loginFooter__meta"><strong>Live multiplayer</strong><span>•</span><strong>Build</strong><span>•</span><strong>Trade</strong><span>•</span><strong>Conquer</strong></div>
      <div className="loginPillars">
        <article><i><Hammer size={21}/></i><div><strong>Build</strong><span>Construct & upgrade your station</span></div></article>
        <article><i><ShieldCheck size={21}/></i><div><strong>Defend</strong><span>Fortify & protect your territory</span></div></article>
        <article><i><Compass size={21}/></i><div><strong>Survive</strong><span>Explore, gather & outlast rivals</span></div></article>
      </div>
    </footer>

    {helpOpen && <HowToPlayModal onClose={() => setHelpOpen(false)} />}
    {storyOpen && <Suspense fallback={null}><StoryModal onClose={() => setStoryOpen(false)} /></Suspense>}
  </section>;
}
