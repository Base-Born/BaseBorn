import { MAP_CONFIG, MINIMAP_CONFIG } from "../data/mapConfig";
import { createMinimapLayout, getMinimapPlayerInfo, getSectorRect, minimapPoint } from "../systems/MinimapSystem";
import { formatLocationCallout } from "../systems/MapSectorSystem";
import { LOOT_REGION_CONFIG, LOOT_REGION_ORDER } from "../data/lootRegionConfig";
import { useEffect, useState, type CSSProperties } from "react";
import type { GameSnapshot } from "../types";

const columns = Array.from("ABCDEFGHIJ");
const rows = Array.from({ length: MINIMAP_CONFIG.gridRows }, (_, index) => String(index + 1));

export function Minimap({ snapshot }: { snapshot: GameSnapshot }) {
  const [zoomLevel, setZoomLevel] = useState(0);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m") return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      setZoomLevel((current) => (current + 1) % 3);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const size = typeof window !== "undefined" && window.innerWidth <= 720
    ? MINIMAP_CONFIG.mobileSize
    : typeof window !== "undefined" && window.innerWidth >= 1600
      ? MINIMAP_CONFIG.largeSize
      : MINIMAP_CONFIG.desktopSize;
  const layout = createMinimapLayout(size);
  const { cellWidth, cellHeight, innerRect } = layout;
  const { sector } = getMinimapPlayerInfo(snapshot);
  const currentRect = getSectorRect(sector, layout.rect, layout.padding);
  const youLabel = sector.quadrant === "CENTER" ? "CENTER" : `${sector.quadrant}-${sector.sectorCode}`;
  const playerSize = size >= 280 ? 6.2 : 5;
  const planetScale = size >= 280 ? 1 : 0.86;
  const statusHeight = size <= MINIMAP_CONFIG.mobileSize ? 34 : MINIMAP_CONFIG.statusStripHeight;
  const center = size / 2;
  const coreRadius = size >= MINIMAP_CONFIG.desktopSize ? 17 : 14;
  const coreHexPoints = [
    [center, center - coreRadius],
    [center + coreRadius * 0.86, center - coreRadius * 0.5],
    [center + coreRadius * 0.86, center + coreRadius * 0.5],
    [center, center + coreRadius],
    [center - coreRadius * 0.86, center + coreRadius * 0.5],
    [center - coreRadius * 0.86, center - coreRadius * 0.5],
  ].map(([x, y]) => `${x},${y}`).join(" ");
  const coreChamberRadius = coreRadius * 0.48;
  const coreChamberPoints = [
    [center, center - coreChamberRadius],
    [center + coreChamberRadius * 0.86, center - coreChamberRadius * 0.5],
    [center + coreChamberRadius * 0.86, center + coreChamberRadius * 0.5],
    [center, center + coreChamberRadius],
    [center - coreChamberRadius * 0.86, center + coreChamberRadius * 0.5],
    [center - coreChamberRadius * 0.86, center - coreChamberRadius * 0.5],
  ].map(([x, y]) => `${x},${y}`).join(" ");
  const maxWorldRadius = Math.hypot(MAP_CONFIG.halfWidth, MAP_CONFIG.halfHeight);
  const minimapRadius = Math.hypot(innerRect.width / 2, innerRect.height / 2);
  const zoom = [1, 1.8, 3][zoomLevel];
  const zoomLabel = ["Sector", "Local", "Close"][zoomLevel];
  const playerPoint = minimapPoint(snapshot.minimap.player.x, snapshot.minimap.player.y, layout);
  const zoomTransform = zoom === 1 ? undefined : `translate(${center} ${center}) scale(${zoom}) translate(${-playerPoint.x} ${-playerPoint.y})`;

  return (
    <aside className="minimap" style={{ width: size, height: size + statusHeight, "--minimap-status-height": `${statusHeight}px` } as CSSProperties}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Sector minimap. You are in ${youLabel}`}>
        <defs>
          <clipPath id="minimapMapClip"><rect x={innerRect.x} y={innerRect.y} width={innerRect.width} height={innerRect.height} rx="7" /></clipPath>
        </defs>
        <rect className="minimapPanel" x="1" y="1" width={size - 2} height={size - 2} rx="10" />
        <rect className="minimapInnerMap" x={innerRect.x} y={innerRect.y} width={innerRect.width} height={innerRect.height} rx="7" />
        <g clipPath="url(#minimapMapClip)">
        <g transform={zoomTransform}>
        <g className="minimapLootZones">
          {[...LOOT_REGION_ORDER].reverse().map((region) => {
            const config = LOOT_REGION_CONFIG[region];
            const radius = config.maxDistance * Math.hypot(innerRect.width / 2, innerRect.height / 2);
            return (
              <g key={region}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  className={`minimapLootZone minimapLootZone--${region}`}
                  style={{ "--zone-fill": config.fillColor, "--zone-border": config.borderColor } as CSSProperties}
                />
              </g>
            );
          })}
        </g>
        <g className="minimapAsteroidBelts">
          {snapshot.minimap.asteroidBelts.map((belt) => {
            const innerRadius = (belt.minRadiusFromCenter / maxWorldRadius) * minimapRadius;
            const outerRadius = (belt.maxRadiusFromCenter / maxWorldRadius) * minimapRadius;
            const fullRing = Math.abs(Math.abs(belt.angleEnd - belt.angleStart) - Math.PI * 2) < 0.01 || belt.angleStart <= -Math.PI && belt.angleEnd >= Math.PI;
            return (
              <g key={belt.id} className={`minimapAsteroidBelt minimapAsteroidBelt--danger-${belt.dangerLevel}`} style={{ "--belt-color": belt.minimapColor } as CSSProperties}>
                {fullRing ? (
                  <>
                    <circle cx={center} cy={center} r={outerRadius} />
                    <circle cx={center} cy={center} r={innerRadius} />
                  </>
                ) : (
                  <>
                    <path d={arcPath(center, center, outerRadius, belt.angleStart, belt.angleEnd)} />
                    <path d={arcPath(center, center, innerRadius, belt.angleStart, belt.angleEnd)} />
                  </>
                )}
                <title>{belt.name}</title>
              </g>
            );
          })}
        </g>
        <g className="minimapCurrentCell minimapCurrentSector">
          <rect x={currentRect.x} y={currentRect.y} width={currentRect.width} height={currentRect.height} rx="2" />
        </g>
        <g className="minimapGrid">
          {columns.slice(1).map((_, index) => {
            if (index + 1 === 5) return null;
            const x = innerRect.x + (index + 1) * cellWidth;
            return <line key={`v-${index}`} x1={x} y1={innerRect.y} x2={x} y2={innerRect.y + innerRect.height} />;
          })}
          {rows.slice(1).map((_, index) => {
            if (index + 1 === 5) return null;
            const y = innerRect.y + (index + 1) * cellHeight;
            return <line key={`h-${index}`} x1={innerRect.x} y1={y} x2={innerRect.x + innerRect.width} y2={y} />;
          })}
        </g>
        <g className="minimapAxisLabels">
          {columns.map((column, index) => <text key={column} x={innerRect.x + index * cellWidth + cellWidth / 2} y={MINIMAP_CONFIG.labelPadding}>{column}</text>)}
          {rows.map((row, index) => <text key={row} x={MINIMAP_CONFIG.labelPadding * 0.5} y={innerRect.y + index * cellHeight + cellHeight / 2 + 3}>{row}</text>)}
        </g>
        <g className="minimapPlanets">
          {snapshot.minimap.planets.map((planet) => {
            const p = minimapPoint(planet.pos.x, planet.pos.y, layout);
            const callout = formatLocationCallout(planet.pos.x, planet.pos.y, MAP_CONFIG);
            const radius = (planet.rare ? 4.4 : 3.7) * planetScale;
            return (
              <circle className={`minimapPlanet minimapPlanet--${planet.owner}${planet.rare ? " minimapPlanet--rare" : ""}`} key={planet.id} cx={p.x} cy={p.y} r={radius}>
                <title>{`${planet.name} - ${callout}`}</title>
              </circle>
            );
          })}
        </g>
        <g className="minimapStations">
          {snapshot.minimap.stations.map((station) => {
            const p = minimapPoint(station.pos.x, station.pos.y, layout);
            const claimedByTeam = station.ownerTeamId && station.ownerTeamId === snapshot.station.team?.id;
            const damaged = station.maxHealth > 0 && station.health / station.maxHealth <= 0.5;
            const isMothership = station.mothershipUnlocked;
            const stationClass = [
              "minimapStation",
              claimedByTeam ? "minimapStation--team" : station.claimState === "claimed" ? "minimapStation--claimed" : "minimapStation--broken",
              station.underAttack || damaged ? "minimapStation--alert" : "",
              isMothership ? "minimapStation--mothership" : "",
            ].filter(Boolean).join(" ");
            return (
              <g className={stationClass} key={station.id} transform={`translate(${p.x} ${p.y})`}>
                {(station.underAttack || damaged) && <circle className="minimapStation__warning" r={isMothership ? "12" : "10"} />}
                <path className="minimapStation__frame" d={isMothership ? "M 0 -8 L 8 -2 L 8 5 L 0 9 L -8 5 L -8 -2 Z" : "M 0 -7 L 7 0 L 0 7 L -7 0 Z"} />
                <path className="minimapStation__core" d={isMothership ? "M 0 -3.5 L 3.5 0 L 0 3.5 L -3.5 0 Z" : "M -3 -3 H 3 V 3 H -3 Z"} />
                {station.claimState === "unclaimed" && (
                  <>
                    <line className="minimapStation__break" x1="-6" y1="-1" x2="-1" y2="-6" />
                    <line className="minimapStation__break" x1="2" y1="6" x2="6" y2="2" />
                  </>
                )}
                {claimedByTeam && <circle className="minimapStation__teamPing" r="10.5" />}
                <title>{`${station.name} - ${isMothership ? "mothership" : station.claimState} Lv ${station.level}`}</title>
              </g>
            );
          })}
        </g>
        <g className="minimapShips">
          {snapshot.minimap.ships.map((ship) => {
            const p = minimapPoint(ship.pos.x, ship.pos.y, layout);
            const shipSize = ship.owner === "player" ? playerSize : playerSize * 0.62;
            const rotation = (ship.angle * 180) / Math.PI + 90;
            return (
              <g className={`minimapShip minimapShip--${ship.owner}${ship.owner === "player" ? " minimapPlayerShip" : ""}`} key={ship.id} transform={`rotate(${rotation} ${p.x} ${p.y})`}>
                <path className="minimapShipCone" d={`M ${p.x} ${p.y - shipSize * 1.45} L ${p.x + shipSize * 0.52} ${p.y + shipSize * 0.68} L ${p.x} ${p.y + shipSize * 0.25} L ${p.x - shipSize * 0.52} ${p.y + shipSize * 0.68} Z`} />
                {ship.owner === "player" && <line className="minimapPlayerDirection" x1={p.x} y1={p.y - shipSize * 0.1} x2={p.x} y2={p.y - shipSize * 1.65} />}
                <title>{ship.owner === "player" ? "Your ship" : ship.owner === "teammate" ? "Teammate ship" : "Enemy ship"}</title>
              </g>
            );
          })}
        </g>
        <g className="minimapCenter">
          <circle cx={center} cy={center} r={coreRadius + 10} className="minimapCoreAura" />
          <polygon points={coreHexPoints} className="minimapCoreShell" />
          <polygon points={coreChamberPoints} className="minimapCoreChamber" />
        </g>
        </g>
        </g>
      </svg>
      <div className="minimapReadout">
        <b>{youLabel}</b>
        <span>{zoomLabel} · M</span>
      </div>
    </aside>
  );
}

function arcPath(cx: number, cy: number, radius: number, start: number, end: number) {
  const sx = cx + Math.cos(start) * radius;
  const sy = cy + Math.sin(start) * radius;
  const ex = cx + Math.cos(end) * radius;
  const ey = cy + Math.sin(end) * radius;
  const delta = Math.abs(end - start);
  const largeArc = delta > Math.PI ? 1 : 0;
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey}`;
}
