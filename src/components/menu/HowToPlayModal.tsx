import { X } from "lucide-react";
import { useEffect, useRef } from "react";

const controlSections = [
  {
    title: "Movement",
    rows: [
      ["WASD / Arrow Keys", "Move"],
      ["Mouse", "Aim"],
    ],
  },
  {
    title: "Combat",
    rows: [
      ["Left Click / Space", "Fire"],
      ["E", "Auto Fire"],
      ["Q", "Auto Throttle"],
    ],
  },
  {
    title: "Upgrades",
    rows: [
      ["1-8", "Upgrade core stats"],
      ["U", "Core upgrades"],
      ["Hold Y", "View evolution tree"],
      ["Release Y", "Close evolution tree"],
    ],
  },
  {
    title: "Map and Team",
    rows: [
      ["M", "Map"],
      ["T", "Team panel"],
      ["B", "Base panel"],
      ["Tab", "Leaderboard"],
    ],
  },
];

const guideSections = [
  ["Objective", "Start as a Base Ship, mine asteroids, collect Ether, upgrade your ship, and push toward the center belt."],
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
