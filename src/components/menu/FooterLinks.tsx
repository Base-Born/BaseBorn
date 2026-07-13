import { FileText, Settings, User, Users } from "lucide-react";

const links = [
  { label: "Patch Notes", icon: FileText },
  { label: "Discord", icon: Users },
  { label: "Settings", icon: Settings },
  { label: "Credits", icon: User },
];

export function FooterLinks() {
  return (
    <footer className="bbFooter" aria-label="Menu links">
      {links.map(({ label, icon: Icon }) => (
        <button type="button" key={label}>
          <Icon size={13} />
          {label}
        </button>
      ))}
    </footer>
  );
}
