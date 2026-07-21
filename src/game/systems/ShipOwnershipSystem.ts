import type { BaseFrameType } from "../data/baseShipFrames";
import type { StatKey } from "../data/stats";
import type { CargoStorage } from "../data/etherTypes";
import type { HullTierId, InstalledModule } from "../data/stationTypes";
import type { Player } from "../entities/Player";
import { createId } from "../id";
import { getAvailableUpgradePoints } from "./ShipUpgradeSystem";

export interface OwnedShip {
  id: string;
  ownerId: string;
  name: string;
  model: BaseFrameType;
  hullTier: HullTierId;
  currentShipId: string;
  currentBranch: string;
  stats: Record<StatKey, number>;
  craftedModuleIds: string[];
  installedModules: InstalledModule[];
  cargo: CargoStorage;
  health: number;
  shield: number;
  mothershipEligible: boolean;
  isMothership: boolean;
}

export class ShipOwnershipSystem {
  readonly hangarSlots = 6;
  private ships: OwnedShip[];
  private activeId: string;

  constructor(private player: Player) {
    const starter = this.capturePlayer(createId("ship"), "Starter Ship");
    this.ships = [starter];
    this.activeId = starter.id;
  }

  get activeShipId() {
    return this.activeId;
  }

  getSnapshot() {
    this.syncActive();
    return {
      activeShipId: this.activeId,
      hangarSlots: this.hangarSlots,
      ships: this.ships.map((ship) => ({
        ...ship,
        stats: { ...ship.stats },
        cargo: { ...ship.cargo, ether: { ...ship.cargo.ether } },
        craftedModuleIds: [...ship.craftedModuleIds],
        installedModules: ship.installedModules.map((module) => ({ ...module })),
      })),
    };
  }

  switchTo(shipId: string) {
    if (shipId === this.activeId) return true;
    const target = this.ships.find((ship) => ship.id === shipId);
    if (!target || target.isMothership) return false;
    this.syncActive();
    this.activeId = target.id;
    this.player.selectBaseFrame(target.model);
    this.player.loadout = {
      hullTier: target.hullTier,
      craftedModuleIds: [...target.craftedModuleIds],
      installedModules: target.installedModules.map((module) => ({ ...module })),
    };
    this.player.stats = { ...target.stats };
    this.player.currentShipId = target.currentShipId;
    this.player.currentBranch = target.currentBranch;
    this.player.cargo = { ...target.cargo, ether: { ...target.cargo.ether } };
    this.player.recalculate();
    this.player.health = Math.min(target.health, this.player.maxHealth);
    this.player.shieldHealth = Math.min(target.shield, this.player.maxShield);
    this.player.statPoints = getAvailableUpgradePoints(this.player);
    this.player.syncDrones();
    return true;
  }

  transformActiveToMothership() {
    this.syncActive();
    const active = this.ships.find((ship) => ship.id === this.activeId);
    if (!active || active.hullTier < 7) return false;
    active.mothershipEligible = true;
    active.isMothership = true;
    return true;
  }

  private syncActive() {
    const active = this.ships.find((ship) => ship.id === this.activeId);
    if (!active) return;
    const latest = this.capturePlayer(active.id, active.name);
    Object.assign(active, latest, { isMothership: active.isMothership });
  }

  private capturePlayer(id: string, name: string): OwnedShip {
    return {
      id,
      ownerId: this.player.id,
      name,
      model: this.player.baseFrameId,
      hullTier: this.player.loadout.hullTier,
      currentShipId: this.player.currentShipId,
      currentBranch: this.player.currentBranch,
      stats: { ...this.player.stats },
      craftedModuleIds: [...this.player.loadout.craftedModuleIds],
      installedModules: this.player.loadout.installedModules.map((module) => ({ ...module })),
      cargo: { ...this.player.cargo, ether: { ...this.player.cargo.ether } },
      health: this.player.health,
      shield: this.player.shieldHealth,
      mothershipEligible: this.player.level >= 100 && this.player.loadout.hullTier >= 7,
      isMothership: false,
    };
  }
}
