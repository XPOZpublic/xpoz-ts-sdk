import { VERSION } from "./version.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@xpoz/xpoz/latest";
const CHECK_TIMEOUT_MS = 3_000;
const PACKAGE_NAME = "@xpoz/xpoz";

let hasWarned = false;

export async function checkForUpdates(): Promise<void> {
  if (hasWarned) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const response = await fetch(NPM_REGISTRY_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!response.ok) return;

    const data = (await response.json()) as { version?: string };
    const latest = data.version;
    if (!latest || latest === VERSION) return;

    if (isNewerVersion(latest, VERSION)) {
      hasWarned = true;
      console.warn(
        `[xpoz] A newer version of ${PACKAGE_NAME} is available: ${latest} (current: ${VERSION}). ` +
          `Run \`npm install ${PACKAGE_NAME}@latest\` to update.`
      );
    }
  } catch {
    // Silently ignore - network errors, timeouts, parse errors
    // should never affect SDK functionality
  }
}

function isNewerVersion(
  latestVersion: string,
  currentVersion: string
): boolean {
  const latestVersionParts = latestVersion.split(".").map(Number);
  const currentVersionParts = currentVersion.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const latestVersionPart = latestVersionParts[i] ?? 0;
    const currentVersionPart = currentVersionParts[i] ?? 0;
    if (latestVersionPart > currentVersionPart) return true;
    if (latestVersionPart < currentVersionPart) return false;
  }
  return false;
}
