#!/usr/bin/env bash
# Regenerates the typed ABI consumed by the web app from the compiled contract artifact.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/contracts"
forge build >/dev/null
node - "$ROOT" <<'NODE'
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const artifact = JSON.parse(
  fs.readFileSync(path.join(root, "contracts/out/StreamPay.sol/StreamPay.json"), "utf8"),
);
const out = `// Generated from contracts/out/StreamPay.sol/StreamPay.json. Run scripts/sync-abi.sh after changing the contract.\nexport const streamPayAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`;
fs.writeFileSync(path.join(root, "web/lib/abi/streamPay.ts"), out);
console.log(`Synced ${artifact.abi.length} ABI items`);
NODE
