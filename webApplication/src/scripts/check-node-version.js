import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const nodeVersion = process.versions.node;
const major = Number(nodeVersion.split(".")[0]);

// package.json engines: ">=20 <21"
if (!Number.isFinite(major) || major < 20 || major >= 21) {
  console.error(
    `[torrent-service] Unsupported Node.js version ${nodeVersion}. This service requires Node.js 20.x (see webApplication/src/.nvmrc).`
  );
  console.error(
    `Fix: cd webApplication/src && nvm install 20 && nvm use 20 && rm -rf node_modules && pnpm install`
  );
  process.exit(1);
}

// node-datachannel is a native dependency (via webtorrent -> webrtc-polyfill).
// If pnpm skipped build scripts, the addon won't exist and the server will crash at startup.
try {
  const nodeDatachannelPkgJson = require.resolve("node-datachannel/package.json");
  const nodeDatachannelRoot = path.dirname(nodeDatachannelPkgJson);
  const nativeAddonPath = path.join(
    nodeDatachannelRoot,
    "build",
    "Release",
    "node_datachannel.node"
  );

  if (!fs.existsSync(nativeAddonPath)) {
    console.error(
      "[torrent-service] node-datachannel native addon is missing (build/Release/node_datachannel.node)."
    );
    console.error(
      "This usually means pnpm skipped build scripts (see webApplication/src/node_modules/.modules.yaml -> ignoredBuilds)."
    );
    console.error(
      "Fix: cd webApplication/src && rm -rf node_modules && pnpm install"
    );
    console.error(
      "If pnpm still skips builds, run: cd webApplication/src && pnpm approve-builds (then rebuild) or ensure ignore-scripts=false."
    );
    process.exit(1);
  }
} catch {
  // If it's not installed, let the normal module resolution fail later with standard errors.
}
