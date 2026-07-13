import type { MapConfig } from "../data/mapConfig";
import type { MapQuadrant, MapSector } from "../types/mapTypes";

const columns = "ABCDEFGHIJ";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function getMapSector(worldX: number, worldY: number, mapConfig: MapConfig, gridColumns = 10, gridRows = 10): MapSector {
  const normalizedX = clamp((worldX + mapConfig.halfWidth) / mapConfig.worldWidth, 0, 0.9999);
  const normalizedY = clamp((worldY + mapConfig.halfHeight) / mapConfig.worldHeight, 0, 0.9999);
  const columnIndex = Math.floor(normalizedX * gridColumns);
  const rowIndex = Math.floor(normalizedY * gridRows);
  const columnLabel = columns[columnIndex] ?? String(columnIndex + 1);
  const rowLabel = String(rowIndex + 1);
  const sectorCode = `${columnLabel}${rowLabel}`;
  let quadrant: MapQuadrant;
  const centerThresholdX = mapConfig.worldWidth * 0.04;
  const centerThresholdY = mapConfig.worldHeight * 0.04;

  if (Math.abs(worldX) < centerThresholdX && Math.abs(worldY) < centerThresholdY) quadrant = "CENTER";
  else if (worldX < 0 && worldY < 0) quadrant = "NW";
  else if (worldX >= 0 && worldY < 0) quadrant = "NE";
  else if (worldX < 0 && worldY >= 0) quadrant = "SW";
  else quadrant = "SE";

  return { columnIndex, rowIndex, columnLabel, rowLabel, sectorCode, quadrant };
}

export function formatLocationCallout(worldX: number, worldY: number, mapConfig: MapConfig) {
  const sector = getMapSector(worldX, worldY, mapConfig);
  if (sector.quadrant === "CENTER") return "Center Belt";
  return `${sector.quadrant}-${sector.sectorCode}`;
}

