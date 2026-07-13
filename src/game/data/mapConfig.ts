import type { Vec2 } from "../types";

export const MAP_CONFIG = {
  worldWidth: 1000000,
  worldHeight: 1000000,
  halfWidth: 500000,
  halfHeight: 500000,
  centerX: 0,
  centerY: 0,
  sectorCount: 4,
  planetCount: 0,
  centerZoneRadius: 45000,
  asteroidBeltInnerRadius: 17500,
  asteroidBeltOuterRadius: 42500,
  minimapSize: 320,
};

export type MapConfig = typeof MAP_CONFIG;

export const MINIMAP_CONFIG = {
  desktopSize: 230,
  largeSize: 248,
  mobileSize: 176,
  gridColumns: 10,
  gridRows: 10,
  padding: 22,
  labelPadding: 17,
  statusStripHeight: 40,
  showNearestPlanet: false,
  showGrid: true,
  showLabels: true,
  showQuadrants: true,
  showCurrentSector: true,
  iconScale: 1.15,
};

export type MinimapRect = { x: number; y: number; width: number; height: number };

export function worldToMinimap(worldX: number, worldY: number, mapConfig: MapConfig, minimapRect: MinimapRect, padding = 0): Vec2 {
  const innerX = minimapRect.x + padding;
  const innerY = minimapRect.y + padding;
  const innerWidth = minimapRect.width - padding * 2;
  const innerHeight = minimapRect.height - padding * 2;
  const normalizedX = (worldX + mapConfig.halfWidth) / mapConfig.worldWidth;
  const normalizedY = (worldY + mapConfig.halfHeight) / mapConfig.worldHeight;
  return {
    x: innerX + normalizedX * innerWidth,
    y: innerY + normalizedY * innerHeight,
  };
}

export function clampToWorld(pos: Vec2, margin = 0): Vec2 {
  return {
    x: Math.max(-MAP_CONFIG.halfWidth + margin, Math.min(MAP_CONFIG.halfWidth - margin, pos.x)),
    y: Math.max(-MAP_CONFIG.halfHeight + margin, Math.min(MAP_CONFIG.halfHeight - margin, pos.y)),
  };
}

export function insideCenterZone(pos: Vec2) {
  return Math.hypot(pos.x - MAP_CONFIG.centerX, pos.y - MAP_CONFIG.centerY) <= MAP_CONFIG.centerZoneRadius;
}
