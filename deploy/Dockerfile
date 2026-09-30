# 运行时镜像:只放 pnpm build 产出的 Nitro 自包含服务端(.output,依赖已打进去,无原生模块)。
# 构建上下文由 scripts/package.sh 准备(只含 .output),不在镜像里装依赖、不联网。
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY .output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=6 CMD wget -qO /dev/null http://127.0.0.1:3000/frontend/triage || exit 1
CMD ["node", ".output/server/index.mjs"]
