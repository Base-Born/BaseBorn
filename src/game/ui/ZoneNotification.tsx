export function ZoneNotification({ text, visible }: { text: string; visible: boolean }) {
  if (!text) return null;
  return (
    <div className={visible ? "zoneNotification zoneNotification--visible" : "zoneNotification"}>
      {text}
    </div>
  );
}
