import { emptyEtherCargo, type CargoStorage, type EtherCost, type EtherType } from "../data/etherTypes";
import { CARGO_DROP_AMOUNT, ETHER_QUALITY_ORDER } from "../data/resourceBalance";

export function createCargoStorage(capacity = 100): CargoStorage {
  return {
    capacity,
    used: 0,
    ether: emptyEtherCargo(),
  };
}

export function getTotalCargoUsed(cargo: CargoStorage) {
  return Object.values(cargo.ether).reduce((sum, amount) => sum + amount, 0);
}

export function normalizeCargoUsed(cargo: CargoStorage) {
  cargo.used = getTotalCargoUsed(cargo);
}

export const syncCargoUsed = normalizeCargoUsed;

export function getAvailableCargoSpace(cargo: CargoStorage) {
  normalizeCargoUsed(cargo);
  return Math.max(0, cargo.capacity - cargo.used);
}

export function canPickupEtherAmount(cargo: CargoStorage, amount: number) {
  return getAvailableCargoSpace(cargo) >= amount;
}

export function getRemainingCargoCapacityForType(cargo: CargoStorage, etherType: EtherType) {
  return getAvailableCargoSpace(cargo);
}

export function addEtherToCargo(cargo: CargoStorage, etherType: EtherType, amount: number) {
  return addEtherToCombinedCargo(cargo, etherType, amount);
}

export function addEtherToCombinedCargo(cargo: CargoStorage, etherType: EtherType, amount: number) {
  const accepted = Math.max(0, Math.min(amount, getAvailableCargoSpace(cargo)));
  if (accepted <= 0) return 0;
  cargo.ether[etherType] += accepted;
  normalizeCargoUsed(cargo);
  return accepted;
}

export function removeEtherFromCombinedCargo(cargo: CargoStorage, etherType: EtherType, amount: number) {
  const removed = Math.max(0, Math.min(amount, cargo.ether[etherType]));
  if (removed <= 0) return 0;
  cargo.ether[etherType] -= removed;
  normalizeCargoUsed(cargo);
  return removed;
}

export function canAffordEtherCost(cargo: CargoStorage, cost: EtherCost) {
  return Object.entries(cost).every(([type, amount]) => cargo.ether[type as EtherType] >= (amount ?? 0));
}

export function spendEther(cargo: CargoStorage, cost: EtherCost) {
  if (!canAffordEtherCost(cargo, cost)) return false;
  Object.entries(cost).forEach(([type, amount]) => {
    cargo.ether[type as EtherType] -= amount ?? 0;
  });
  normalizeCargoUsed(cargo);
  return true;
}

export function getCargoDropPriorityOrder() {
  return ETHER_QUALITY_ORDER;
}

export function getLowestQualityCargoType(cargo: CargoStorage) {
  return getCargoDropPriorityOrder().find((type) => cargo.ether[type] > 0) ?? null;
}

export function canDropAnyCargo(cargo: CargoStorage) {
  return Boolean(getLowestQualityCargoType(cargo));
}

export function getNextCargoDropPreview(cargo: CargoStorage, amount = CARGO_DROP_AMOUNT) {
  const type = getLowestQualityCargoType(cargo);
  if (!type) return null;
  return { type, amount: Math.min(amount, cargo.ether[type]) };
}

export function dropLowestQualityCargoFromStorage(cargo: CargoStorage, amount = CARGO_DROP_AMOUNT) {
  const preview = getNextCargoDropPreview(cargo, amount);
  if (!preview) return null;
  const removed = removeEtherFromCombinedCargo(cargo, preview.type, preview.amount);
  return removed > 0 ? { type: preview.type, amount: removed } : null;
}
