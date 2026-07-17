import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadWorldState, saveWorldState } from "../server/worldPersistence.js";

const directory = mkdtempSync(join(tmpdir(), "baseborn-world-"));
const filePath = join(directory, "world.json");
try {
  saveWorldState(filePath, {
    stations: [["station-1", { id:"station-1", name:"Shield", claimState:"claimed" }]],
    destroyedAsteroids: [["asteroid-1:1-0", Date.now()+5000]],
    teams: [["team-1", { id:"team-1", memberIds:["pilot-1"] }]],
    playerRecords: [["pilot-1", { state:{ x:12, y:34, score:500 }, inventory:[["rawEther",8]] }]],
  });
  const restored=loadWorldState(filePath);
  assert.equal(restored.version,1);
  assert.equal(restored.stations[0][1].name,"Shield");
  assert.equal(restored.playerRecords[0][1].inventory[0][1],8);
  console.log("World persistence smoke test passed: atomic state save and restore.");
} finally {
  rmSync(directory,{recursive:true,force:true});
}
