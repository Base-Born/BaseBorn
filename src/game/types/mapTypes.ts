export type MapQuadrant = "NW" | "NE" | "SW" | "SE" | "CENTER";

export type MapSector = {
  columnIndex: number;
  rowIndex: number;
  columnLabel: string;
  rowLabel: string;
  sectorCode: string;
  quadrant: MapQuadrant;
};

export interface TeamPing {
  id: string;
  teamId: string;
  playerId: string;
  x: number;
  y: number;
  sectorCode: string;
  quadrant: MapQuadrant;
  message: string;
  createdAt: number;
  expiresAt: number;
}

