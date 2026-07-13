import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { LockKeyhole, X } from "lucide-react";

export function GamePanel({ children, className = "", label, ...props }: PropsWithChildren<HTMLAttributes<HTMLElement> & { label?: string }>) {
  return <section className={`uiPanel ${className}`} aria-label={label} {...props}>{children}</section>;
}

export function HUDCard({ children, className = "", ...props }: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return <section className={`uiHudCard ${className}`} {...props}>{children}</section>;
}

export function IconButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`uiIconButton ${className}`} {...props}>{children}</button>;
}

export function PrimaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`uiButton uiButton--primary ${className}`} {...props}>{children}</button>;
}

export function SecondaryButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`uiButton uiButton--secondary ${className}`} {...props}>{children}</button>;
}

export function StatusBadge({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "neutral" | "success" | "warning" | "danger" | "info" }>) {
  return <span className={`uiStatus uiStatus--${tone}`}>{children}</span>;
}

export function ProgressBar({ value, max, tone = "accent", label }: { value: number; max: number; tone?: "accent" | "hull" | "shield" | "fuel" | "danger"; label?: string }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
  return <div className={`uiProgress uiProgress--${tone}`} aria-label={label} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><i style={{ width: `${percent}%` }} /></div>;
}

export function KeyHint({ children }: PropsWithChildren) {
  return <kbd className="uiKeyHint">{children}</kbd>;
}

export function LockReason({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <small className="uiLockReason"><LockKeyhole size={12} />{children}</small>;
}

export function EmptyState({ title, children }: PropsWithChildren<{ title: string }>) {
  return <div className="uiEmptyState"><strong>{title}</strong><span>{children}</span></div>;
}

export function ModalHeader({ eyebrow, title, onClose }: { eyebrow?: string; title: string; onClose: () => void }) {
  return <header className="uiModalHeader"><div>{eyebrow && <span>{eyebrow}</span>}<strong>{title}</strong></div><IconButton aria-label="Close" onClick={onClose}><X size={18} /></IconButton></header>;
}
