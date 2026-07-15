import { Play, Rocket, Swords, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getRandomShipName } from "./components/menu/MainMenu";
import { UpgradeTreeOverlay } from "./components/UpgradeTreeOverlay";
import { ErrorBoundary } from "./ErrorBoundary";
import { XP_BY_LEVEL, totalUpgradePointsForLevel } from "./game/config";
import { Game, type RespawnProgress } from "./game/Game";
import type { Customization, GameSnapshot } from "./game/types";
import { emptyEtherCargo } from "./game/data/etherTypes";
import { getHullTier, getNextHullTier } from "./game/data/hullTiers";
import { BASE_SHIP_FRAMES } from "./game/data/baseShipFrames";
import { DeathScreen } from "./game/ui/DeathScreen";
import { ShipUpgradePanel } from "./game/ui/ShipUpgradePanel";
import { StationInteractionPanel } from "./game/ui/StationInteractionPanel";
import { StationCommandPanel } from "./game/ui/StationCommandPanel";
import type { StationTabId } from "./game/ui/StationTabs";
import { CargoManagementPanel } from "./game/ui/CargoManagementPanel";
import { EMPTY_STATION_INTERACTION } from "./game/systems/StationInteractionSystem";
import { LoginScreen } from "./game/ui/screens/LoginScreen";
import { GameLoadingScreen } from "./game/ui/screens/GameLoadingScreen";
import { ConnectionErrorScreen } from "./game/ui/screens/ConnectionErrorScreen";
import { GameplayHUD } from "./game/ui/hud/GameplayHUD";
import { calculateBuildIdentity } from "./game/systems/BuildIdentitySystem";
import { Leaderboard } from "./game/ui/Leaderboard";
import { TeamHub } from "./game/ui/TeamHub";
import { MobileController } from "./game/ui/mobile/MobileController";

const defaultCustomization: Customization = {
  name: "Voidseed",
  shipColor: "#2fbce1",
  glowColor: "#4cc9f0",
  trailColor: "#4cc9f0",
  projectileColor: "#eef7ff",
  wingVariant: "delta",
  cockpitVariant: "needle",
  decalPattern: "chevron",
  thrusterStyle: "ion",
  glowIntensity: 0.8,
};

const SHIP_NAME_STORAGE_KEY = "baseborn.io.shipName.v1";
function loadShipName() {
  if (typeof window === "undefined") return getRandomShipName();
  try {
    const saved = window.localStorage.getItem(SHIP_NAME_STORAGE_KEY);
    if (saved?.trim()) return saved.slice(0, 16);
  } catch {
  }
  return getRandomShipName();
}

const buildLaunchCustomization = (shipName: string): Customization => ({
  ...defaultCustomization,
  name: shipName.trim().slice(0, 16) || getRandomShipName(),
});

const emptySnapshot: GameSnapshot = {
  level: 1,
  xp: 0,
  nextXp: 100,
  score: 0,
  statPoints: 0,
  upgradePoints: 0,
  health: 120,
  maxHealth: 120,
  shieldHealth: 0,
  maxShield: 0,
  shipClass: "Base Ship",
  shipClassId: "base_ship",
  currentBranch: "Core",
  availableUpgradeIds: [],
  evolutionChoices: [],
  upgradeHistory: ["base_ship"],
  stats: {
    autonomousRepair: 0,
    maxHealth: 0,
    maxShield: 0,
    bodyDamage: 0,
    movementSpeed: 0,
    bulletSpeed: 0,
    bulletDamage: 0,
    reloadSpeed: 0,
  },
  baseFrame: BASE_SHIP_FRAMES[0],
  shipUpgradeStats: [],
  effectiveShipStats: {
    maxHealth: 120,
    maxShield: 0,
    movementMultiplier: 1,
    bodyDamageMultiplier: 1,
    repairPerSecond: 0,
    thrusterVisualScale: 1,
  },
  effectiveModuleStats: {
    projectileSpeedMultiplier: 1,
    droneSpeedMultiplier: 1,
    damageMultiplier: 1,
    droneDamageMultiplier: 1,
    reloadMultiplier: 1,
  },
  leaderboard: [],
  multiplayer: { status: "offline", room: "public", playerId: null, playerCount: 0, message: "Offline", teamId: null, teams: [], invites: [], actionError: "" },
  buildSummary: "Uncommitted Scout",
  buildIdentity: calculateBuildIdentity({ vehicleId: "player", frameId: "balanced", hullTier: 1, stats: { autonomousRepair: 0, maxHealth: 0, maxShield: 0, bodyDamage: 0, movementSpeed: 0, bulletSpeed: 0, bulletDamage: 0, reloadSpeed: 0 }, loadout: { hullTier: 1, craftedModuleIds: [], installedModules: [] }, health: 120, maxHealth: 120, currentHeat: 0 }),
  upgradeFeedback: null,
  fleet: { activeShipId: "", hangarSlots: 6, ships: [] },
  hull: {
    current: getHullTier(1),
    next: getNextHullTier(1) ?? null,
    canUpgrade: false,
    craftedModuleIds: [],
    installedModules: [],
    craftableModules: [],
  },
  station: {
    claimed: null,
    nearby: null,
    interactionPrompt: "",
    team: null,
  },
  autoFire: false,
  autoThrottle: false,
  evolutionAvailable: false,
  cargo: {
    capacity: 100,
    used: 0,
    ether: emptyEtherCargo(),
  },
  cargoFull: false,
  cargoPickupEnabled: true,
  nextCargoDrop: null,
  currentObjective: null,
  objectiveProgress: "",
  objectiveHint: "",
  playerDeathState: null,
  baseLostState: null,
  stationHealthWarning: "",
  stationInteraction: EMPTY_STATION_INTERACTION,
  stationFinder: {
    visible: false,
    stationId: null,
    stationName: "",
    distance: 0,
    direction: { x: 0, y: 0 },
    bearingLabel: "",
    scannerActive: false,
    pulseReady: true,
    hint: "",
  },
  zone: {
    id: "outer",
    displayName: "Safe Outer Zone",
    pvpEnabled: false,
    lootDescription: "Common Ether",
    statusText: "PvE Safe Outer Zone",
  },
  zoneNotification: { text: "", visible: false },
  mode: "playing",
  minimap: {
    player: { x: 0, y: 0, angle: -Math.PI / 2 },
    ships: [],
    planets: [],
    aliens: [],
    stations: [],
    asteroidBelts: [],
  },
};

type Screen = "menu" | "loading" | "playing";
type Panel = "none" | "guide";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const respawnProgressRef = useRef<RespawnProgress | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [panel, setPanel] = useState<Panel>("none");
  const [corePanelOpen, setCorePanelOpen] = useState(false);
  const [isUpgradeTreeOpen, setIsUpgradeTreeOpen] = useState(false);
  const [stationCommandOpen, setStationCommandOpen] = useState(false);
  const [stationCommandTab, setStationCommandTab] = useState<StationTabId>("overview");
  const [cargoPanelOpen, setCargoPanelOpen] = useState(false);
  const [, setIsUpgradeTreeHeld] = useState(false);
  const [startupError, setStartupError] = useState<Error | null>(null);
  const [runId, setRunId] = useState(0);
  const [shipName, setShipName] = useState(loadShipName);
  const [customization, setCustomization] = useState(() => buildLaunchCustomization(shipName));
  const [snapshot, setSnapshot] = useState<GameSnapshot>(emptySnapshot);

  useEffect(() => {
    if (screen !== "playing" || !canvasRef.current) return;
    let game: Game | null = null;
    try {
      setStartupError(null);
      game = new Game(canvasRef.current, customization, setSnapshot, respawnProgressRef.current ?? undefined);
      game.onUiShortcut = (key) => {
        if (!game) return;
        if (key === "u") {
          const claimed = game.stations.claimedStation;
          const interaction = game.stations.getNearestInteraction(game.player);
          if (claimed && interaction.station?.id === claimed.id && game.player.dockingState === "docked") {
            setStationCommandTab("overview");
            setStationCommandOpen(true);
            setCorePanelOpen(false);
          } else {
            setStationCommandOpen(false);
            setCorePanelOpen((current) => !current);
          }
        }
        if (key === "y") {
          setStationCommandOpen(false);
          setCorePanelOpen(true);
        }
      };
      respawnProgressRef.current = null;
      gameRef.current = game;
      game.start();
    } catch (error) {
      const nextError = error instanceof Error ? error : new Error(String(error));
      console.error("Baseborn.io startup error", nextError);
      setStartupError(nextError);
    }
    return () => {
      game?.destroy();
      gameRef.current = null;
    };
  }, [screen, runId, customization]);

  useEffect(() => {
    if (screen !== "loading") return;
    const timer = window.setTimeout(() => setScreen("playing"), 520);
    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.pausedByTree = isUpgradeTreeOpen || stationCommandOpen || cargoPanelOpen || corePanelOpen || panel !== "none";
    }
  }, [isUpgradeTreeOpen, stationCommandOpen, cargoPanelOpen, corePanelOpen, panel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inputFocused = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (inputFocused) return;
      if (event.code === "Escape") {
        if (stationCommandOpen) setStationCommandOpen(false);
        else if (cargoPanelOpen) setCargoPanelOpen(false);
        else if (corePanelOpen) setCorePanelOpen(false);
        else if (isUpgradeTreeOpen) {
          setIsUpgradeTreeOpen(false);
          setIsUpgradeTreeHeld(false);
        } else if (panel !== "none") setPanel("none");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyY") {
        setIsUpgradeTreeHeld(false);
        setIsUpgradeTreeOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [stationCommandOpen, cargoPanelOpen, corePanelOpen, isUpgradeTreeOpen, panel]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error(event.message);
      console.error("Baseborn.io uncaught error", error);
      setStartupError(error);
      setScreen("playing");
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      console.error("Baseborn.io unhandled rejection", error);
      setStartupError(error);
      setScreen("playing");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHIP_NAME_STORAGE_KEY, shipName);
    } catch (error) {
      console.warn("Baseborn.io could not save ship name", error);
    }
  }, [shipName]);

  const startGame = () => {
    const launchCustomization = buildLaunchCustomization(shipName);
    setShipName(launchCustomization.name);
    setCustomization(launchCustomization);
    setStartupError(null);
    respawnProgressRef.current = null;
    setSnapshot(emptySnapshot);
    setScreen("loading");
    setPanel("none");
    setCorePanelOpen(false);
    setIsUpgradeTreeOpen(false);
  };

  const playAgain = () => {
    const respawnLevel = Math.max(1, Math.floor(snapshot.level * 0.3));
    respawnProgressRef.current = {
      level: respawnLevel,
      xp: XP_BY_LEVEL[Math.min(respawnLevel, XP_BY_LEVEL.length - 1)],
      statPoints: totalUpgradePointsForLevel(respawnLevel),
    };
    gameRef.current?.destroy();
    gameRef.current = null;
    setStartupError(null);
    setSnapshot(emptySnapshot);
    setPanel("none");
    setCorePanelOpen(false);
    setIsUpgradeTreeOpen(false);
    setStationCommandOpen(false);
    setCargoPanelOpen(false);
    setRunId((current) => current + 1);
    setScreen("playing");
  };

  const returnToMenu = () => {
    gameRef.current?.destroy();
    gameRef.current = null;
    setStartupError(null);
    respawnProgressRef.current = null;
    setSnapshot(emptySnapshot);
    setPanel("none");
    setCorePanelOpen(false);
    setIsUpgradeTreeOpen(false);
    setStationCommandOpen(false);
    setCargoPanelOpen(false);
    setScreen("menu");
  };

  return (
    <main className="app">
      {screen === "menu" ? (
        <LoginScreen
          pilotName={shipName}
          setPilotName={setShipName}
          onStart={startGame}
          onRandomize={() => setShipName(getRandomShipName().slice(0, 16))}
        />
      ) : screen === "loading" ? (
        <GameLoadingScreen pilotName={shipName} />
      ) : (
        <ErrorBoundary>
          {startupError ? (
            <ConnectionErrorScreen message={startupError.message} onRetry={() => window.location.reload()} />
          ) : (
            <GameScreen
              canvasRef={canvasRef}
              snapshot={snapshot}
              panel={panel}
              setPanel={setPanel}
              corePanelOpen={corePanelOpen}
              setCorePanelOpen={setCorePanelOpen}
              treeOpen={isUpgradeTreeOpen}
              setTreeOpen={setIsUpgradeTreeOpen}
              stationCommandOpen={stationCommandOpen}
              setStationCommandOpen={setStationCommandOpen}
              stationCommandTab={stationCommandTab}
              setStationCommandTab={setStationCommandTab}
              cargoPanelOpen={cargoPanelOpen}
              setCargoPanelOpen={setCargoPanelOpen}
              game={gameRef.current}
              customization={customization}
              playAgain={playAgain}
              returnToMenu={returnToMenu}
            />
          )}
        </ErrorBoundary>
      )}
    </main>
  );
}

function RuntimeError({ error }: { error: Error }) {
  return (
    <section className="runtimeError">
      <h1>Baseborn.io</h1>
      <h2>Launch interrupted</h2>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </section>
  );
}

function GameScreen({
  canvasRef,
  snapshot,
  panel,
  setPanel,
  corePanelOpen,
  setCorePanelOpen,
  treeOpen,
  setTreeOpen,
  stationCommandOpen,
  setStationCommandOpen,
  stationCommandTab,
  setStationCommandTab,
  cargoPanelOpen,
  setCargoPanelOpen,
  game,
  customization,
  playAgain,
  returnToMenu,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  snapshot: GameSnapshot;
  panel: Panel;
  setPanel: (panel: Panel) => void;
  corePanelOpen: boolean;
  setCorePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  treeOpen: boolean;
  setTreeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stationCommandOpen: boolean;
  setStationCommandOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stationCommandTab: StationTabId;
  setStationCommandTab: React.Dispatch<React.SetStateAction<StationTabId>>;
  cargoPanelOpen: boolean;
  setCargoPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  game: Game | null;
  customization: Customization;
  playAgain: () => void;
  returnToMenu: () => void;
}) {
  const showShipPanel = corePanelOpen;
  const openCommand = (tab: StationTabId = "overview") => {
    if (!snapshot.station.claimed || !snapshot.stationInteraction.docked) return;
    setStationCommandTab(tab);
    setStationCommandOpen(true);
    setCorePanelOpen(false);
  };

  useEffect(() => {
    if (!snapshot.stationInteraction.docked) setStationCommandOpen(false);
  }, [snapshot.stationInteraction.docked, setStationCommandOpen]);


  return (
    <section className="gameShell">
      <canvas ref={canvasRef} className="gameCanvas" />
      <Leaderboard rows={snapshot.leaderboard.slice(0, 10)} />
      <TeamHub
        multiplayer={snapshot.multiplayer}
        onJoin={(teamId, spawnAtBase) => game?.joinTeam(teamId, spawnAtBase)}
        onInvite={(playerId) => game?.invitePlayer(playerId)}
        onAccept={(inviteId, spawnAtBase) => game?.acceptTeamInvite(inviteId, spawnAtBase)}
        onDecline={(inviteId) => game?.declineTeamInvite(inviteId)}
        onLeave={() => game?.leaveTeam()}
        onRemove={(playerId) => game?.removeTeamMember(playerId)}
        onTransfer={(playerId) => game?.transferTeamLeadership(playerId)}
      />
      <GameplayHUD
        snapshot={snapshot}
        onOpenCargo={() => setCargoPanelOpen(true)}
        onOpenCommand={() => openCommand("overview")}
        onOpenShip={() => setCorePanelOpen((current) => !current)}
        onOpenGuide={() => setPanel(panel === "guide" ? "none" : "guide")}
        onToggleAutoFire={() => game?.toggleAutoFire()}
        onToggleAutoThrottle={() => game?.toggleAutoThrottle()}
      />
      <MobileController
        snapshot={snapshot}
        active={snapshot.mode === "playing" && panel === "none" && !corePanelOpen && !stationCommandOpen && !cargoPanelOpen}
        onMove={(movement) => game?.setMobileMovement(movement)}
        onAim={(direction) => game?.setMobileAim(direction)}
        onFire={(active) => game?.setMobileFiring(active)}
        onInteract={() => game?.performStationPrimaryAction()}
        onScan={() => game?.scanStationWreck()}
        onCargo={() => setCargoPanelOpen(true)}
        onShip={() => setCorePanelOpen(true)}
        onToggleAutoFire={() => game?.toggleAutoFire()}
      />
      {showShipPanel && (
        <div className="bottomLeftUpgradeDock">
          <ShipUpgradePanel
            snapshot={snapshot}
            frames={BASE_SHIP_FRAMES}
            onSelectFrame={(id) => game?.selectBaseFrame(id)}
            onUpgrade={(key) => game?.upgradeStat(key)}
          />
        </div>
      )}
      <StationInteractionPanel
        interaction={snapshot.stationInteraction}
        cargo={snapshot.cargo}
        onPrimaryAction={() => game?.performStationPrimaryAction()}
        onAction={(actionId) => game?.performStationAction(actionId)}
        onOpenCommand={() => openCommand("overview")}
      />
      {stationCommandOpen && (
        <StationCommandPanel
          snapshot={snapshot}
          activeTab={stationCommandTab}
          onTabChange={setStationCommandTab}
          onClose={() => setStationCommandOpen(false)}
          onDeposit={() => game?.performStationAction("deposit")}
          onRepair={() => game?.repairStation()}
          onRepairSubsystem={(subsystemId) => game?.repairStationSubsystem(subsystemId)}
          onUpgradeDefense={(category) => game?.upgradeStationDefense(category)}
          onCraftModule={(id) => game?.craftModule(id)}
          onAcquireShip={(frameId) => game?.acquireShip(frameId)}
          onSwitchShip={(shipId) => game?.switchOwnedShip(shipId)}
          onInstallModule={(id) => game?.installModule(id)}
          onRelocateBase={() => game?.relocateBaseToPlayer()}
          onConvertFuel={(type) => game?.convertStationEtherToFuel(type)}
          onTransformMothership={() => game?.transformStationToMothership()}
          onStartHyperdrive={(destination) => game?.startStationHyperdrive(destination)}
          onRenameStation={(name) => game?.renameStation(name)}
        />
      )}
      {cargoPanelOpen && (
        <CargoManagementPanel
          snapshot={snapshot}
          onClose={() => setCargoPanelOpen(false)}
          onDrop={() => game?.dropLowestCargo()}
          onTogglePickup={() => game?.toggleCargoPickup()}
        />
      )}

      {panel === "guide" && (
        <OverlayPanel title="Build Guide" onClose={() => setPanel("none")}>
          <BuildGuide compact />
        </OverlayPanel>
      )}
      {false && treeOpen && (
        <UpgradeTreeOverlay
          level={snapshot.level}
          currentShipId={snapshot.shipClassId}
          choices={snapshot.evolutionChoices.filter((choice) => choice.state === "available").map((choice) => choice.node)}
          onChoose={(id) => game?.evolve(id)}
          onClose={() => setTreeOpen(false)}
        />
      )}
      {snapshot.mode === "respawning" && <DeathScreen snapshot={snapshot} />}
      {snapshot.mode === "gameover" && (
        <div className="gameOver">
          <h2>Ship destroyed</h2>
          <p>{customization.name} was blown apart at level {snapshot.level} with {snapshot.score.toLocaleString()} score. The sector is still active.</p>
          <div className="gameOverActions">
            <button className="primary" onClick={playAgain}><Play size={18} /> Respawn</button>
            <button className="secondary" onClick={returnToMenu}><Rocket size={18} /> Launch Menu</button>
          </div>
        </div>
      )}
    </section>
  );
}

function OverlayPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside className="overlayPanel">
      <header>
        <h2>{title}</h2>
        <button aria-label="Close panel" onClick={onClose}><X size={18} /></button>
      </header>
      {children}
    </aside>
  );
}

function BuildGuide({ embedded = false, compact = false, onBack }: { embedded?: boolean; compact?: boolean; onBack?: () => void }) {
  const guideCards = [
    { name: "Claim a Station", description: "Search the station belt for a broken abandoned station. Move into claim range and press F to make it your team base.", tags: ["Station Belt", "F Interact"] },
    { name: "Dock and Deposit", description: "Mine asteroids, collect Ether, return to your claimed station, then press F to dock before depositing cargo into shared storage.", tags: ["Cargo", "Docking"] },
    { name: "Repair Systems", description: "Repairs, crafting, defenses, landing pads, and station upgrades are managed from inside the docked station command room.", tags: ["Repair Stages", "Team Base"] },
    { name: "Build Your Ship", description: "Level up to qualify for stronger hulls, then use station storage to upgrade through seven linear hull tiers and craft installable modules.", tags: ["Hull Tiers", "Modules"] },
    { name: "Prepare the Mothership", description: "A fully restored level 100 station, Tier 7 hull, crafted Mothership Core, and paid transformation cost unlock future mobile mothership play.", tags: ["Level 100", "Endgame"] },
  ];
  return (
    <section className={compact ? "buildGuide compact" : "buildGuide"}>
      {embedded && (
        <header className="guideHeader">
          <button className="secondary" onClick={onBack}><X size={16} /> Close guide</button>
        </header>
      )}
      <div className="guideIntro">
        <h2>Station Guide</h2>
        <p>BaseBorn now revolves around claiming a broken station, repairing it with Ether, and crafting hull/module upgrades from your team base.</p>
      </div>
      <div className="presetGrid">
        {guideCards.map((card) => (
          <article className="preset" key={card.name}>
            <div className="presetIcon"><Swords size={18} /></div>
            <h3>{card.name}</h3>
            <p>{card.description}</p>
            <div className="presetShips">{card.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
