import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function loadWorldState(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const value = JSON.parse(readFileSync(filePath, "utf8"));
    return value && value.version === 1 ? value : null;
  } catch (error) {
    console.error("Unable to load persisted BaseBorn world", error);
    return null;
  }
}

export function saveWorldState(filePath, state) {
  if (!filePath) return;
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify({ version: 1, savedAt: Date.now(), ...state }), "utf8");
    renameSync(temporaryPath, filePath);
  } catch (error) {
    console.error("Unable to persist BaseBorn world", error);
  }
}
