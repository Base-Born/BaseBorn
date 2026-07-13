import { AlertTriangle, RotateCcw } from "lucide-react";
import { PrimaryButton } from "../design/components";
export function ConnectionErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section className="connectionError"><AlertTriangle size={32}/><span>SECTOR LINK FAILED</span><h1>Launch interrupted</h1><p>{message}</p><PrimaryButton onClick={onRetry}><RotateCcw size={16}/>Retry launch</PrimaryButton></section>;
}
