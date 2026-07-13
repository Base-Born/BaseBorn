export function ShipPreview() {
  return (
    <div className="bbShipPreview" aria-label="Base Ship preview">
      <span className="bbShipPreview__ring" />
      <span className="bbShipPreview__glow" />
      <div className="bbPreviewShip">
        <span className="bbPreviewCockpit" />
        <span className="bbPreviewDecal" />
      </div>
    </div>
  );
}
