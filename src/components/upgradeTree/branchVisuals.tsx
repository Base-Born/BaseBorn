import type { ShipNode, WeaponBranch, WeaponType } from "../../game/data/shipUpgradeTree";
import { getShipVisualProfile, type ShipVisualProfile } from "../../game/rendering/ShipVisualProfiles";
import type { WeaponMountDefinition } from "../../game/rendering/ShipModelDefinitions";
import type { CSSProperties } from "react";

export const branchAccent: Record<WeaponBranch | "Core", string> = {
  Core: "#5aa6c8",
  Rockets: "#c8793f",
  Laser: "#5aa6c8",
  "Repair Beam": "#76bf87",
  Booster: "#c49a45",
  Speedster: "#6fb3c8",
  Tank: "#8da2bf",
  Drones: "#8e80b8",
  "Machine Gun": "#c6a84d",
  "Force Field": "#7892cf",
  Mines: "#bd8b45",
  Sniper: "#b7c8dc",
  Cannon: "#b65c58",
  "Arc Lightning": "#806fb0",
};

export function branchCssVars(branch: WeaponBranch | "Core") {
  return { "--branch-accent": branchAccent[branch] } as CSSProperties;
}

export function BranchIcon({ type, mothership = false }: { type: WeaponType; mothership?: boolean }) {
  if (mothership) {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 2 28 12 24 26 16 30 8 26 4 12 16 2Z" />
        <path d="M16 7 22 13 20 23 16 25 12 23 10 13 16 7Z" className="detail" />
      </svg>
    );
  }

  switch (type) {
    case "rockets":
      return <IconPaths paths={["M7 25 17 5l8 8-18 12Z", "M17 5l4 10", "M9 21l7 2"]} />;
    case "laser":
      return <IconPaths paths={["M5 16h18", "M22 10l5 6-5 6", "M9 10l4 6-4 6"]} />;
    case "repair_beam":
      return <IconPaths paths={["M16 5v22", "M5 16h22", "M8 8l16 16", "M24 8 8 24"]} />;
    case "booster":
      return <IconPaths paths={["M6 23 18 5l8 13-20 5Z", "M4 17h8", "M3 22h7"]} />;
    case "speedster":
      return <IconPaths paths={["M4 18 26 6l-7 11 7 9L4 18Z", "M5 10h8", "M3 24h10"]} />;
    case "tank":
      return <IconPaths paths={["M7 10h14l5 6-5 6H7l-3-6 3-6Z", "M13 10V7h7", "M13 22v3h7"]} />;
    case "drones":
      return <IconPaths paths={["M16 11a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z", "M5 8h4v4H5z", "M23 20h4v4h-4z", "M24 7l-4 4", "M8 24l4-4"]} />;
    case "machine_gun":
      return <IconPaths paths={["M6 10h14", "M6 16h18", "M6 22h14", "M21 8l6 8-6 8"]} />;
    case "force_field":
      return <IconPaths paths={["M16 4c7 3 10 5 10 11 0 7-4 11-10 13C10 26 6 22 6 15 6 9 9 7 16 4Z", "M11 16h10"]} />;
    case "mines":
      return <IconPaths paths={["M16 9a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", "M16 3v5", "M16 24v5", "M3 16h5", "M24 16h5", "M8 8l3 3", "M24 8l-3 3"]} />;
    case "sniper":
      return <IconPaths paths={["M4 17h18", "M22 11l6 6-6 6", "M8 12v10", "M13 14v6"]} />;
    case "cannon":
      return <IconPaths paths={["M5 20 21 8l6 8-18 8-4-4Z", "M7 22v5", "M14 17v8"]} />;
    case "arc_lightning":
      return <IconPaths paths={["M18 3 8 17h8l-2 12 10-16h-8l2-10Z"]} />;
    default:
      return <IconPaths paths={["M4 16 26 5l-6 11 6 11L4 16Z"]} />;
  }
}

function IconPaths({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {paths.map((d) => <path d={d} key={d} />)}
    </svg>
  );
}

export function ShipPreviewIcon({ node }: { node: ShipNode }) {
  const profile = getShipVisualProfile(node);
  const hullPoints = getHullPoints(profile);
  const maxScale = profile.variantType === "mother_heavy" ? 46 : profile.variantType === "mother_balanced" ? 40 : node.isMotherShipOption ? 34 : 28;
  const scale = Math.min(maxScale, 13.5 * profile.sizeScale);
  const mountLimit = node.isMotherShipOption ? 7 : node.levelRequired >= 60 ? 5 : 3;

  return (
    <svg className="shipPreviewIcon" viewBox="-96 -96 192 192" aria-hidden="true">
      <defs>
        <filter id={`shipGlow-${node.id}`} x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.1" floodColor={profile.glowColor} floodOpacity="0.32" />
        </filter>
      </defs>
      <g className="shipPreviewIcon__ship" transform="rotate(-90)" filter={`url(#shipGlow-${node.id})`}>
        {profile.levelRequired >= 100 && (
          <polygon
            className="shipPreviewIcon__innerHull"
            points={toPoints(getMothershipCorePoints(profile), scale)}
            fill={profile.secondaryColor}
            stroke={profile.accentColor}
          />
        )}
        <polygon
          className="shipPreviewIcon__hull"
          points={toPoints(hullPoints, scale)}
          fill={profile.primaryColor}
          stroke={profile.glowColor}
        />
        {profile.detailLevel >= 3 && <ArmorLines profile={profile} scale={scale} />}
        {profile.levelRequired >= 100 && <MothershipCrown profile={profile} scale={scale} />}
        <Cockpit profile={profile} scale={scale} />
        {profile.weaponMounts.slice(0, mountLimit).map((mount, index) => (
          <Mount key={`${mount.type}-${index}`} mount={mount} scale={scale} accent={profile.accentColor} secondary={profile.secondaryColor} />
        ))}
        <EngineTrail profile={profile} scale={scale} />
      </g>
    </svg>
  );
}

function getHullPoints(profile: ShipVisualProfile): [number, number][] {
  if (profile.levelRequired >= 100 || profile.hullShape === "mothership") {
    return getMothershipHullPoints(profile);
  }
  if (profile.branch === "Core") {
    return [[1.32, 0], [-0.62, 0.72], [-0.38, 0.16], [-1.05, 0], [-0.38, -0.16], [-0.62, -0.72]];
  }

  const heavy = profile.variantType === "heavy";
  const light = profile.variantType === "light";
  const nose = profile.hullShape === "rail" ? 1.95 : profile.hullShape === "fortress" ? 1.08 : profile.hullShape === "rounded" ? 1.14 : 1.42;
  const tail = profile.hullShape === "carrier" || heavy ? -1.16 : -1.28;
  const span = profile.wingShape === "needle" ? 0.48 : profile.wingShape === "armor" ? 1.12 : profile.wingShape === "wide" ? 1.08 : light ? 0.7 : 0.88;

  if (profile.hullShape === "fortress") return [[nose, 0], [0.46, span], [-0.72, span * 0.74], [tail, 0.4], [tail, -0.4], [-0.72, -span * 0.74], [0.46, -span]];
  if (profile.hullShape === "rounded") return [[nose, 0], [0.26, span * 0.78], [-0.78, span * 0.68], [tail, 0.28], [tail, -0.28], [-0.78, -span * 0.68], [0.26, -span * 0.78]];
  if (profile.hullShape === "carrier") return [[nose, 0], [0.18, span], [-0.98, span * 0.9], [tail, 0.54], [tail * 0.82, 0], [tail, -0.54], [-0.98, -span * 0.9], [0.18, -span]];
  return [[nose, 0], [-0.28, span], [-0.52, 0.18], [tail, 0], [-0.52, -0.18], [-0.28, -span]];
}

const mothershipBranchOrder: Array<ShipVisualProfile["branch"]> = [
  "Rockets",
  "Laser",
  "Repair Beam",
  "Booster",
  "Speedster",
  "Tank",
  "Drones",
  "Machine Gun",
  "Force Field",
  "Mines",
  "Sniper",
  "Cannon",
  "Arc Lightning",
];

function mothershipStyle(profile: ShipVisualProfile) {
  return Math.max(0, mothershipBranchOrder.indexOf(profile.branch));
}

function getMothershipHullPoints(profile: ShipVisualProfile): [number, number][] {
  const style = mothershipStyle(profile);
  const isLight = profile.variantType === "mother_light";
  const isHeavy = profile.variantType === "mother_heavy";
  const nose = (isLight ? 1.72 : isHeavy ? 1.04 : 1.34) + (style % 3) * 0.08;
  const fore = 0.74 - (style % 4) * 0.07;
  const mid = -0.12 - (style % 5) * 0.08;
  const rear = -0.84 - (style % 6) * 0.06;
  const tail = -1.34 - (style % 4) * 0.09;
  const span = (isLight ? 0.46 : isHeavy ? 0.88 : 0.66) + (style % 5) * 0.055;
  const rearSpan = span * (isHeavy ? 1.18 : isLight ? 0.78 : 1);
  const notch = -1.02 - (style % 3) * 0.11;

  switch (style % 13) {
    case 0:
      return [[nose, 0], [fore, span * 0.58], [mid, span], [rear, rearSpan * 0.72], [tail, span * 0.24], [notch, 0], [tail, -span * 0.24], [rear, -rearSpan * 0.72], [mid, -span], [fore, -span * 0.58]];
    case 1:
      return [[nose, 0], [0.52, span * 0.32], [0.28, span * 0.92], [-0.44, span * 0.68], [tail, span * 0.52], [notch, 0], [tail, -span * 0.52], [-0.44, -span * 0.68], [0.28, -span * 0.92], [0.52, -span * 0.32]];
    case 2:
      return [[nose * 0.92, 0], [0.58, span * 0.78], [-0.18, span * 1.04], [-0.78, span * 0.92], [tail, span * 0.34], [notch, 0], [tail, -span * 0.34], [-0.78, -span * 0.92], [-0.18, -span * 1.04], [0.58, -span * 0.78]];
    case 3:
      return [[nose, 0], [0.5, span * 0.4], [0.05, span * 0.52], [-0.12, span * 1.08], [tail, span * 0.72], [notch, 0], [tail, -span * 0.72], [-0.12, -span * 1.08], [0.05, -span * 0.52], [0.5, -span * 0.4]];
    case 4:
      return [[nose * 1.08, 0], [0.42, span * 0.32], [-0.18, span * 0.44], [-0.52, span * 0.9], [tail, span * 0.42], [notch, 0], [tail, -span * 0.42], [-0.52, -span * 0.9], [-0.18, -span * 0.44], [0.42, -span * 0.32]];
    case 5:
      return [[nose * 0.78, 0], [0.76, span * 0.96], [-0.16, span * 1.12], [-1.08, span * 0.86], [tail, span * 0.46], [notch, 0], [tail, -span * 0.46], [-1.08, -span * 0.86], [-0.16, -span * 1.12], [0.76, -span * 0.96]];
    case 6:
      return [[nose * 0.86, 0], [0.64, span * 0.58], [0.18, span * 1.16], [-0.42, span * 0.72], [tail, span * 0.92], [notch, 0], [tail, -span * 0.92], [-0.42, -span * 0.72], [0.18, -span * 1.16], [0.64, -span * 0.58]];
    case 7:
      return [[nose * 0.96, 0], [0.78, span * 0.38], [0.42, span * 0.86], [-0.38, span * 0.58], [tail, span * 0.34], [notch, 0], [tail, -span * 0.34], [-0.38, -span * 0.58], [0.42, -span * 0.86], [0.78, -span * 0.38]];
    case 8:
      return [[nose * 0.82, 0], [0.62, span * 0.76], [-0.08, span * 0.96], [-0.62, span * 0.62], [tail, span * 0.78], [notch, 0], [tail, -span * 0.78], [-0.62, -span * 0.62], [-0.08, -span * 0.96], [0.62, -span * 0.76]];
    case 9:
      return [[nose * 0.9, 0], [0.54, span * 0.54], [-0.3, span * 0.48], [-0.58, span * 1.08], [tail, span * 0.42], [notch, 0], [tail, -span * 0.42], [-0.58, -span * 1.08], [-0.3, -span * 0.48], [0.54, -span * 0.54]];
    case 10:
      return [[nose * 1.16, 0], [0.5, span * 0.22], [0.08, span * 0.42], [-0.24, span * 0.32], [tail, span * 0.22], [notch, 0], [tail, -span * 0.22], [-0.24, -span * 0.32], [0.08, -span * 0.42], [0.5, -span * 0.22]];
    case 11:
      return [[nose * 0.74, 0], [0.82, span], [0.0, span * 0.76], [-0.72, span * 1.04], [tail, span * 0.66], [notch, 0], [tail, -span * 0.66], [-0.72, -span * 1.04], [0.0, -span * 0.76], [0.82, -span]];
    default:
      return [[nose, 0], [0.46, span * 0.42], [0.14, span * 1.12], [-0.5, span * 0.62], [tail, span * 0.7], [notch, 0], [tail, -span * 0.7], [-0.5, -span * 0.62], [0.14, -span * 1.12], [0.46, -span * 0.42]];
  }
}

function getMothershipCorePoints(profile: ShipVisualProfile): [number, number][] {
  const style = mothershipStyle(profile);
  const width = profile.variantType === "mother_heavy" ? 0.56 : profile.variantType === "mother_light" ? 0.34 : 0.44;
  const length = 0.86 + (style % 4) * 0.06;
  return [[0.72, 0], [0.22, width], [-length, width * 0.82], [-length - 0.28, 0], [-length, -width * 0.82], [0.22, -width]];
}

function MothershipCrown({ profile, scale }: { profile: ShipVisualProfile; scale: number }) {
  const style = mothershipStyle(profile);
  const accent = profile.accentColor;
  if (style % 4 === 0) {
    return (
      <g className="shipPreviewIcon__crown" stroke={accent}>
        <circle cx={-0.42 * scale} cy={0} r={0.42 * scale} fill="none" />
        <circle cx={-0.42 * scale} cy={0} r={0.24 * scale} fill="none" />
      </g>
    );
  }
  if (style % 4 === 1) {
    return (
      <g className="shipPreviewIcon__crown" stroke={accent}>
        <path d={`M ${-0.92 * scale} ${-0.72 * scale} L ${-1.26 * scale} ${-1.12 * scale}`} />
        <path d={`M ${-0.92 * scale} ${0.72 * scale} L ${-1.26 * scale} ${1.12 * scale}`} />
        <circle cx={-1.34 * scale} cy={-1.18 * scale} r={0.08 * scale} />
        <circle cx={-1.34 * scale} cy={1.18 * scale} r={0.08 * scale} />
      </g>
    );
  }
  if (style % 4 === 2) {
    return (
      <g className="shipPreviewIcon__crown" stroke={accent}>
        <rect x={-1.18 * scale} y={-0.52 * scale} width={0.26 * scale} height={1.04 * scale} rx={0.04 * scale} fill={profile.secondaryColor} />
        <rect x={0.24 * scale} y={-0.42 * scale} width={0.18 * scale} height={0.84 * scale} rx={0.04 * scale} fill={profile.secondaryColor} />
      </g>
    );
  }
  return (
    <g className="shipPreviewIcon__crown" stroke={accent}>
      <path d={`M ${-0.32 * scale} ${-0.88 * scale} Q ${0.1 * scale} 0 ${-0.32 * scale} ${0.88 * scale}`} fill="none" />
      <path d={`M ${-0.76 * scale} ${-0.7 * scale} Q ${-0.46 * scale} 0 ${-0.76 * scale} ${0.7 * scale}`} fill="none" />
    </g>
  );
}

function toPoints(points: [number, number][], scale: number) {
  return points.map(([x, y]) => `${(x * scale).toFixed(2)},${(y * scale).toFixed(2)}`).join(" ");
}

function Cockpit({ profile, scale }: { profile: ShipVisualProfile; scale: number }) {
  const stroke = profile.accentColor;
  if (profile.cockpitShape === "bridge") {
    return <rect className="shipPreviewIcon__cockpit" x={-0.2 * scale} y={-0.12 * scale} width={0.52 * scale} height={0.24 * scale} rx={1.4} stroke={stroke} />;
  }
  if (profile.cockpitShape === "lens") {
    return <ellipse className="shipPreviewIcon__cockpit" cx={0.38 * scale} cy={0} rx={0.16 * scale} ry={0.2 * scale} stroke={stroke} />;
  }
  if (profile.cockpitShape === "split") {
    return (
      <>
        <ellipse className="shipPreviewIcon__cockpit" cx={0.16 * scale} cy={-0.14 * scale} rx={0.13 * scale} ry={0.08 * scale} stroke={stroke} />
        <ellipse className="shipPreviewIcon__cockpit" cx={0.16 * scale} cy={0.14 * scale} rx={0.13 * scale} ry={0.08 * scale} stroke={stroke} />
      </>
    );
  }
  return <ellipse className="shipPreviewIcon__cockpit" cx={0.2 * scale} cy={0} rx={0.22 * scale} ry={0.11 * scale} stroke={stroke} />;
}

function ArmorLines({ profile, scale }: { profile: ShipVisualProfile; scale: number }) {
  return (
    <g className="shipPreviewIcon__armor" stroke={profile.accentColor}>
      {Array.from({ length: Math.min(5, profile.detailLevel) }, (_, index) => {
        const x = (-0.62 + index * 0.28) * scale;
        return <path key={index} d={`M ${x} ${-0.34 * scale} L ${x + 0.42 * scale} 0 L ${x} ${0.34 * scale}`} />;
      })}
    </g>
  );
}

function Mount({ mount, scale, accent, secondary }: { mount: WeaponMountDefinition; scale: number; accent: string; secondary: string }) {
  const sides = mount.mirror ? [1, -1] : [1];
  return (
    <>
      {sides.map((side) => {
        const x = mount.x * scale;
        const y = mount.y * side * scale;
        const s = mount.scale * scale;
        if (mount.type === "lens" || mount.type === "ring" || mount.type === "coil") {
          return <circle className="shipPreviewIcon__mount" key={`${side}`} cx={x} cy={y} r={Math.max(1.3, s * 0.18)} fill={mount.type === "lens" ? accent : "none"} stroke={accent} />;
        }
        if (mount.type === "barrel") {
          return <path className="shipPreviewIcon__mount" key={`${side}`} d={`M ${x} ${y} L ${x + s * 0.85} ${y}`} stroke={accent} />;
        }
        if (mount.type === "thruster") {
          return <path className="shipPreviewIcon__mount" key={`${side}`} d={`M ${x - s * 0.2} ${y - s * 0.16} L ${x + s * 0.28} ${y} L ${x - s * 0.2} ${y + s * 0.16}`} fill="none" stroke={accent} />;
        }
        return <rect className="shipPreviewIcon__mount" key={`${side}`} x={x - s * 0.18} y={y - s * 0.22} width={s * 0.54} height={s * 0.44} fill={secondary} stroke={accent} />;
      })}
    </>
  );
}

function EngineTrail({ profile, scale }: { profile: ShipVisualProfile; scale: number }) {
  const color = profile.trailStyle === "rocket" || profile.trailStyle === "boost" ? "#c8793f" : profile.trailStyle === "repair" ? "#76bf87" : profile.trailStyle === "electric" ? "#8e80b8" : "#5aa6c8";
  return (
    <g className="shipPreviewIcon__trail" stroke={color}>
      <path d={`M ${-1.02 * scale} ${-0.22 * scale} L ${-1.45 * scale} ${-0.22 * scale}`} />
      <path d={`M ${-1.02 * scale} ${0.22 * scale} L ${-1.45 * scale} ${0.22 * scale}`} />
    </g>
  );
}
