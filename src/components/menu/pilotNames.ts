const randomPilotNames = [
  "Voidseed", "NebulaVow", "IonWarden", "SolarVex", "AsterVale",
  "PulseForge", "OrbitFang", "CryoHalo", "VantaWing", "FluxRider",
  "EchoBase", "RiftNova", "CometSable", "LumenArk", "ZenithDrift",
  "VoidHarbor", "PrismRift", "HelioShade", "StarlingCore", "QuasarMint",
  "NightRelay", "CinderOrbit", "FrostVector", "ArcFoundry", "DawnCipher",
];

export function getRandomPilotName(currentName = "") {
  const availableNames = randomPilotNames.filter((name) => name !== currentName);
  return availableNames[Math.floor(Math.random() * availableNames.length)] ?? randomPilotNames[0];
}
