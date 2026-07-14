export function ShipPreview() {
  return (
    <div className="bbShipPreview" aria-label="Base Ship preview">
      <span className="bbShipPreview__ring" />
      <span className="bbShipPreview__glow" />
      <div className="bbPreviewShip">
        <img className="bbPreviewShipImage" src="/assets/ships/base-ship-topdown.png" alt="" />
        <span className="bbPreviewEngine" />
        <span className="bbPreviewDecal" />
      </div>
    </div>
  );
}
