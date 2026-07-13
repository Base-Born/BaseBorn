import { MAP_CONFIG, MINIMAP_CONFIG, type MapConfig, worldToMinimap, type MinimapRect } from "../data/mapConfig";
import { getMapSector } from "./MapSectorSystem";
import type { GameSnapshot } from "../types";

export type MinimapLayout = {
  size: number;
  rect: MinimapRect;
  innerRect: MinimapRect;
  padding: number;
  cellWidth: number;
  cellHeight: number;
};

export function createMinimapLayout(size = MINIMAP_CONFIG.desktopSize, padding = MINIMAP_CONFIG.padding): MinimapLayout {
  const rect = { x: 0, y: 0, width: size, height: size };
  const innerRect = {
    x: padding,
    y: padding,
    width: size - padding * 2,
    height: size - padding * 2,
  };
  return {
    size,
    rect,
    innerRect,
    padding,
    cellWidth: innerRect.width / MINIMAP_CONFIG.gridColumns,
    cellHeight: innerRect.height / MINIMAP_CONFIG.gridRows,
  };
}

export function getMinimapPlayerInfo(snapshot: GameSnapshot, mapConfig: MapConfig = MAP_CONFIG) {
  const sector = getMapSector(snapshot.minimap.player.x, snapshot.minimap.player.y, mapConfig, MINIMAP_CONFIG.gridColumns, MINIMAP_CONFIG.gridRows);
  const nearestPlanet = snapshot.minimap.planets
    .filter((planet) => planet.discovered || planet.owner !== "neutral")
    .map((planet) => ({ planet, d: Math.hypot(planet.pos.x - snapshot.minimap.player.x, planet.pos.y - snapshot.minimap.player.y) }))
    .sort((a, b) => a.d - b.d)[0]?.planet;
  return { sector, nearestPlanet };
}

export function minimapPoint(worldX: number, worldY: number, layout: MinimapLayout, mapConfig: MapConfig = MAP_CONFIG) {
  return worldToMinimap(worldX, worldY, mapConfig, layout.rect, layout.padding);
}

export function getSectorRect(
  sector: { columnIndex: number; rowIndex: number },
  minimapRect: MinimapRect,
  padding = MINIMAP_CONFIG.padding,
  gridColumns = MINIMAP_CONFIG.gridColumns,
  gridRows = MINIMAP_CONFIG.gridRows,
) {
  const innerX = minimapRect.x + padding;
  const innerY = minimapRect.y + padding;
  const innerWidth = minimapRect.width - padding * 2;
  const innerHeight = minimapRect.height - padding * 2;
  const cellWidth = innerWidth / gridColumns;
  const cellHeight = innerHeight / gridRows;
  return {
    x: innerX + sector.columnIndex * cellWidth,
    y: innerY + sector.rowIndex * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
}
