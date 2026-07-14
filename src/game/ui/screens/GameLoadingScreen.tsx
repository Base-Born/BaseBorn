import { LoaderCircle, Radio, Shield, Sparkles } from "lucide-react";
import { StarfieldBackground } from "../../../components/menu/StarfieldBackground";

export function GameLoadingScreen({ pilotName }: { pilotName: string }) {
  return <section className="gameLoadingScreen"><StarfieldBackground /><div className="gameLoadingCore"><LoaderCircle className="spin" size={32}/><span>INITIALIZING PILOT LINK</span><h1>{pilotName}</h1><div><i/><i/><i/></div><p><Radio size={14}/>Calibrating scanner <Shield size={14}/>Arming spawn protection <Sparkles size={14}/>Mapping station signals</p><small>Tip: Ether only becomes upgrade currency after station conversion.</small></div></section>;
}
