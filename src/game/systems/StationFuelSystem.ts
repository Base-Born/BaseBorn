import { ETHER_CONFIG } from "../data/etherConfig";
import type { EtherType } from "../data/etherTypes";
import type { Station, StationFuelState } from "../data/stationTypes";
import { syncCargoUsed } from "./CargoSystem";

export function createStationFuelState(): StationFuelState {
  return {
    currentFuel: 250,
    maxFuel: 50000,
    conversionEfficiency: 1,
    conversionQueue: [],
    reservedFuel: 0,
    totalFuelGenerated: 250,
    totalFuelSpent: 0,
  };
}

export function getFuelYieldForEther(etherType: EtherType, amount: number, station: Station) {
  return Math.max(0, amount) * ETHER_CONFIG[etherType].fuelPerUnit * station.fuel.conversionEfficiency;
}

export function canConvertEtherToFuel(station: Station, etherType: EtherType, amount: number) {
  if (amount <= 0 || station.storage.ether[etherType] < amount) return false;
  if (station.fuel.currentFuel >= station.fuel.maxFuel) return false;
  const refinery = station.subsystemStates.fuel_refinery;
  return refinery.state !== "offline" && refinery.state !== "disabled";
}

export function getFuelConversionPreview(station: Station, etherType: EtherType, amount: number) {
  const requestedFuel = getFuelYieldForEther(etherType, amount, station);
  const acceptedFuel = Math.min(requestedFuel, station.fuel.maxFuel - station.fuel.currentFuel);
  const consumedEther = acceptedFuel / Math.max(0.0001, ETHER_CONFIG[etherType].fuelPerUnit * station.fuel.conversionEfficiency);
  return { requestedEther: amount, consumedEther, fuelYield: acceptedFuel };
}

export function convertEtherToStationFuel(station: Station, etherType: EtherType, amount: number) {
  if (!canConvertEtherToFuel(station, etherType, amount)) return 0;
  const preview = getFuelConversionPreview(station, etherType, amount);
  station.storage.ether[etherType] -= preview.consumedEther;
  station.fuel.currentFuel += preview.fuelYield;
  station.fuel.totalFuelGenerated += preview.fuelYield;
  syncCargoUsed(station.storage);
  return preview.fuelYield;
}

export function getTotalConvertibleFuel(station: Station) {
  return (Object.keys(ETHER_CONFIG) as EtherType[]).reduce(
    (total, etherType) => total + getFuelYieldForEther(etherType, station.storage.ether[etherType], station),
    0,
  );
}

export function canAffordStationFuelCost(station: Station, amount: number) {
  return amount >= 0 && station.fuel.currentFuel - station.fuel.reservedFuel >= amount;
}

export function spendStationFuel(station: Station, amount: number, _reason: string) {
  if (!canAffordStationFuelCost(station, amount)) return false;
  station.fuel.currentFuel -= amount;
  station.fuel.totalFuelSpent += amount;
  return true;
}
