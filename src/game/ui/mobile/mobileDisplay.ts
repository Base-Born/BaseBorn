export function isMobileDisplay() {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 720 || window.innerHeight <= 520;
}

export async function requestMobileFullscreen() {
  if (!isMobileDisplay() || document.fullscreenElement) return Boolean(document.fullscreenElement);
  const root = document.documentElement;
  if (!root.requestFullscreen) return false;
  try {
    await root.requestFullscreen({ navigationUI: "hide" });
    return true;
  } catch {
    return false;
  }
}

export function isInstalledDisplayMode() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || iosNavigator.standalone === true;
}
