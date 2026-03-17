#!/usr/bin/env bash
set -eox pipefail

echo ">>> Scoping pnpm workspace to timecard package only..."

# Hook runs from artifacts/timecard/ so workspace root is ../..
WORKSPACE_ROOT="$(cd ../.. && pwd)"
WORKSPACE_YAML="$WORKSPACE_ROOT/pnpm-workspace.yaml"

if [ -f "$WORKSPACE_YAML" ]; then
  echo "Found workspace at: $WORKSPACE_ROOT"
  cat > "$WORKSPACE_YAML" << 'EOF'
packages:
  - "artifacts/timecard"
EOF
  echo "Updated pnpm-workspace.yaml to timecard only:"
  cat "$WORKSPACE_YAML"
else
  echo "No pnpm-workspace.yaml found, skipping"
fi
