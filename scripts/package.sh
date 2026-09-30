#!/usr/bin/env bash
# 打离线部署包:构建 app 镜像,连同 nginx、pgvector 镜像、知识库数据和部署脚本打成一个 tar.gz。
# 服务器上:tar xzf <包> && cd ai-triage-deploy && ./deploy.sh
# 前提:本机 docker(containerd 镜像存储,可存多架构)、开发向量库已起且入过库(pnpm kb:up && pnpm kb:ingest)。
# 目标架构默认 linux/amd64,ARM 服务器用 TARGET_PLATFORM=linux/arm64 覆盖。
set -euo pipefail
cd "$(dirname "$0")/.."

PLATFORM=${TARGET_PLATFORM:-linux/amd64}
VERSION="$(date +%Y%m%d)-$(git rev-parse --short HEAD)$(git diff --quiet HEAD || echo -dirty)"
APP_IMAGE="ai-triage:${VERSION}"
NGINX_IMAGE=nginx:1.28.3-alpine
PGVECTOR_IMAGE=pgvector/pgvector:pg18
WORK=$(mktemp -d)
STAGE="${WORK}/ai-triage-deploy"
trap 'rm -rf "${WORK}"' EXIT
mkdir -p "${STAGE}" "${WORK}/ctx" dist

echo "==> 构建前端与服务端"
pnpm build
cp -R .output "${WORK}/ctx/.output"

echo "==> 构建 ${APP_IMAGE}(${PLATFORM})"
docker build --platform "${PLATFORM}" -f deploy/Dockerfile -t "${APP_IMAGE}" "${WORK}/ctx"

echo "==> 拉取依赖镜像(${PLATFORM})"
docker pull -q --platform "${PLATFORM}" "${NGINX_IMAGE}"
docker pull -q --platform "${PLATFORM}" "${PGVECTOR_IMAGE}"

echo "==> 导出镜像"
docker save --platform "${PLATFORM}" "${APP_IMAGE}" "${NGINX_IMAGE}" "${PGVECTOR_IMAGE}" | gzip > "${STAGE}/images.tar.gz"

echo "==> 导出知识库(开发向量库 → SQL,可重复导入)"
{
  echo 'create extension if not exists vector;'
  docker compose -f compose.dev.yml exec -T kb-db pg_dump -U kb -d kb -t kb_chunks --clean --if-exists --no-owner --no-privileges
} > "${STAGE}/kb-init.sql"
grep -q '^COPY public.kb_chunks' "${STAGE}/kb-init.sql" || { echo "知识库导出为空:先 pnpm kb:up && pnpm kb:ingest"; exit 1; }

cp deploy/compose.prod.yml deploy/nginx.conf deploy/deploy.sh deploy/.env.example "${STAGE}/"
echo "${VERSION}" > "${STAGE}/VERSION"

OUT="dist/ai-triage-deploy-${VERSION}-${PLATFORM##*/}.tar.gz"
tar czf "${OUT}" -C "${WORK}" ai-triage-deploy
echo "==> 完成:${OUT}($(du -h "${OUT}" | cut -f1))"
