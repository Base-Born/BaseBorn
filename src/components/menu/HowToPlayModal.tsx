import { X } from "lucide-react";
import { useEffect, useRef } from "react";

const controlSections = [
  {
    title: "Movement",
    rows: [
      ["W / S or ↑ / ↓", "Forward thrust / reverse thrusters"],
      ["A / D or ← / →", "Turn with maneuvering thrusters"],
      ["Mouse", "Aim"],
    ],
  },
  {
    title: "Combat",
    rows: [
      ["Left Click / Space", "Fire"],
      ["Right Click", "Repel drones / secondary system"],
      ["E", "Auto Fire"],
      ["Q", "Auto Throttle"],
    ],
  },
  {
    title: "Spacecraft",
    rows: [
      ["F", "Repair / integrate / dock / undock"],
      ["R", "Scanner pulse / repair next stage"],
      ["U", "Open recovered-spacecraft systems while docked"],
      ["V", "Locate your nearby derelict or team spacecraft"],
    ],
  },
  {
    title: "Cargo and Upgrades",
    rows: [
      ["H", "Toggle cargo pickup"],
      ["G", "Eject lowest-quality cargo"],
      ["1-8", "Allocate an available core-tuning point"],
      ["Y", "Open tuning or available weapon evolutions"],
    ],
  },
  {
    title: "Map and Interface",
    rows: [
      ["M", "Cycle minimap zoom: Sector / Local / Close"],
      ["Escape", "Close the active panel or overlay"],
    ],
  },
];

const guideSections = [
  ["Objective", "Start in a Survey Pod, mine 12 Raw Ether, repair and integrate with your derelict spacecraft, then push toward the center belt."],
  ["Mining", "Every asteroid can be mined. Rarer and larger asteroids take longer, but they pay much higher XP."],
  ["Ether and Cargo", "Destroyed asteroids drop Ether shards. Fly over them to collect Ether until your cargo is full."],
  ["Center Belt", "The center belt has the best loot. Alien defenders guard it. Going alone is dangerous."],
  ["Winning", "There is no fixed end. Grow stronger, control territory, reach mothership evolution, and dominate the leaderboard."],
];

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>(".bbModal button"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="bbModalBackdrop" onMouseDown={onClose}>
      <section className="bbModal bbHowToPlayModal" role="dialog" aria-modal="true" aria-label="How to Play" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>How to Play</h2>
          <button ref={closeRef} type="button" aria-label="Close How to Play" onClick={onClose}><X size={18} /></button>
        </header>

        <div className="bbHowToPlayContent">
          {guideSections.slice(0, 1).map(([title, text]) => (
            <article className="bbHowToPlaySection" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}

          {controlSections.map((section) => (
            <article className="bbHowToPlaySection" key={section.title}>
              <h3>{section.title}</h3>
              <div className="bbControlRows">
                {section.rows.map(([key, action]) => (
                  <div key={key}>
                    <b>{key}</b>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}

          {guideSections.slice(1).map(([title, text]) => (
            <article className="bbHowToPlaySection" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
