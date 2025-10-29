# --- local machine ---
APP=watchscore
IMAGE="${APP}-backend"
HOST="root@bump.games"
REMOTE_BASE="/home/${APP}"
REMOTE_BACKEND="${REMOTE_BASE}/backend"

SHA="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
TAG="${SHA}-$(date +%Y%m%d%H%M)"
TARBALL="${IMAGE}-${TAG}.tar"

# 1) ensure folders exist on the server (BEFORE any scp)
ssh "${HOST}" "mkdir -p '${REMOTE_BACKEND}'"

# 2) put compose (and optionally .env) on the server
scp docker-compose.yml "${HOST}:${REMOTE_BACKEND}/"
# if you keep a server-specific .env, copy it once and stop overwriting it each deploy
scp .env "${HOST}:${REMOTE_BACKEND}/.env"

# 3) build/tag locally (immutable tag + latest)
docker buildx build --platform linux/amd64 -t "${IMAGE}:${TAG}" -t "${IMAGE}:latest" --load .

# 4) save and upload the image tar
docker save "${IMAGE}:${TAG}" -o "${TARBALL}"
scp "${TARBALL}" "${HOST}:${REMOTE_BASE}/"

# 5) load + restart on the server
ssh "${HOST}" bash -s <<EOF
  set -euo pipefail
  docker load -i "${REMOTE_BASE}/${TARBALL}"
  rm -f "${REMOTE_BASE}/${TARBALL}"
  cd "${REMOTE_BACKEND}"
  IMAGE_NAME="${IMAGE}" IMAGE_TAG="${TAG}" docker compose down
  IMAGE_NAME="${IMAGE}" IMAGE_TAG="${TAG}" docker compose up -d
  docker compose ps
EOF

# 6) local cleanup
rm -f "${TARBALL}"
