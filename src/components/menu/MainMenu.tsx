import { BookOpen, Dices, Orbit, Play, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FooterLinks } from "./FooterLinks";
import { HowToPlayModal } from "./HowToPlayModal";
import { ShipPreview } from "./ShipPreview";
import { StarfieldBackground } from "./StarfieldBackground";

const randomShipNames = [
  "Voidseed",
  "NebulaVow",
  "IonWarden",
  "SolarVex",
  "AsterVale",
  "PulseForge",
  "OrbitFang",
  "CryoHalo",
  "VantaWing",
  "FluxRider",
  "EchoBase",
  "RiftNova",
  "CometSable",
  "LumenArk",
  "ZenithDrift",
  "VoidHarbor",
  "PrismRift",
  "HelioShade",
  "StarlingCore",
  "QuasarMint",
  "NightRelay",
  "CinderOrbit",
  "FrostVector",
  "ArcFoundry",
  "DawnCipher",
];

export function getRandomShipName(currentName = "") {
  const availableNames = randomShipNames.filter((name) => name !== currentName);
  return availableNames[Math.floor(Math.random() * availableNames.length)] ?? randomShipNames[0];
}

export function MainMenu({
  shipName,
  setShipName,
  startGame,
}: {
  shipName: string;
  setShipName: (name: string) => void;
  startGame: () => void;
}) {
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const play = () => {
    if (!shipName.trim()) {
      inputRef.current?.focus();
      return;
    }
    startGame();
  };

  const randomizeName = () => {
    setShipName(getRandomShipName(shipName).slice(0, 16));
    inputRef.current?.focus();
  };

  return (
    <section className="bbMenu" aria-label="Baseborn.io main menu">
      <StarfieldBackground />
      <div className="bbMenuStack">
        <header className="bbLogoBlock">
          <h1><span>BASEBORN</span><em>.IO</em></h1>
          <p><span>Start small.</span> <b>Evolve fast.</b> <strong>Rule the void.</strong></p>
        </header>

        <section className="bbLaunchCard" aria-label="Start Baseborn.io">
          <ShipPreview />

          <label className="bbField">
            <span>SHIP NAME</span>
            <div className="bbInputWrap">
              <User size={15} />
              <input
                ref={inputRef}
                value={shipName}
                placeholder="Enter ship name"
                maxLength={16}
                onChange={(event) => setShipName(event.target.value.slice(0, 16))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") play();
                }}
              />
              <button
                type="button"
                className="bbRandomNameButton"
                aria-label="Generate random ship name"
                title="Generate random ship name"
                onClick={randomizeName}
              >
                <Dices size={18} />
              </button>
              <small>{shipName.length}/16</small>
            </div>
          </label>

          <div className="bbModeDescription">
            <div className="bbModeDescription__icon">
              <Orbit size={44} />
            </div>
            <div>
              <span>Baseborn</span>
              <p>Mine asteroids, collect Ether, evolve your ship, and fight for the central belt.</p>
            </div>
          </div>

          <button type="button" className="bbPlayButton" onClick={play}>
            <Play size={22} fill="currentColor" />
            Play Baseborn
          </button>

          <button type="button" className="bbHowToPlayButton" onClick={() => setIsHowToPlayOpen(true)}>
            <BookOpen size={16} />
            How to Play
          </button>
        </section>

        <FooterLinks />
      </div>

      {isHowToPlayOpen && <HowToPlayModal onClose={() => setIsHowToPlayOpen(false)} />}
    </section>
  );
}
