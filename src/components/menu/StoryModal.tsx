import { BookOpen, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";
import storySource from "../../../docs/STORY.md?raw";

type StoryBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "rule" };

function parseStory(source: string): StoryBlock[] {
  const fullStory = source.replace(/\r/g, "").split("\n# Main-Page Story Version")[0];
  const lines = fullStory.split("\n");
  const blocks: StoryBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line === "---") { blocks.push({ type: "rule" }); index += 1; continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      if (!(heading[1].length === 1 && heading[2] === "BaseBorn")) blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    const unordered = /^\*\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const match = (isOrdered ? /^\d+\.\s+(.+)$/ : /^\*\s+(.+)$/).exec(lines[index].trim());
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || next === "---" || /^(#{1,3})\s+/.test(next) || /^\*\s+/.test(next) || /^\d+\.\s+/.test(next)) break;
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>,
  );
}

export function StoryModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const blocks = useMemo(() => parseStory(storySource), []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="bbModalBackdrop bbStoryBackdrop" onMouseDown={onClose}>
    <section ref={modalRef} className="bbModal bbStoryModal" role="dialog" aria-modal="true" aria-labelledby="baseborn-story-title" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div><span>ARCHIVE • PROJECT BORN</span><h2 id="baseborn-story-title">The Story of BaseBorn</h2></div>
        <button ref={closeRef} type="button" aria-label="Close story" onClick={onClose}><X size={19}/></button>
      </header>
      <div className="bbStoryHero"><BookOpen size={24}/><div><strong>The universe did not end in fire.</strong><span>It ended in silence.</span></div></div>
      <article className="bbStoryContent">
        {blocks.map((block, index) => {
          if (block.type === "rule") return <hr key={index}/>;
          if (block.type === "heading") {
            const Tag = block.level <= 1 ? "h2" : "h3";
            return <Tag key={index}>{block.text}</Tag>;
          }
          if (block.type === "paragraph") return <p key={index}>{inline(block.text)}</p>;
          const List = block.ordered ? "ol" : "ul";
          return <List key={index}>{block.items.map((item) => <li key={item}>{inline(item)}</li>)}</List>;
        })}
        <footer><strong>Mine. Build. Evolve. Connect. Survive.</strong><span>You are BaseBorn.</span></footer>
      </article>
    </section>
  </div>;
}