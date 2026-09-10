# Bobo&Doda backend — ko'p bosqichli Docker image.
#   target: build    → to'liq deps + kompilyatsiya + `prisma migrate deploy`
#   target: runtime  → faqat prod deps + dist/  (lean image)

# ---- deps ----------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build ---------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime -----------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall (`prisma generate`) prisma CLI'ni talab qiladi — u devDep,
# shuning uchun --ignore-scripts; generatsiya qilingan client build'dan ko'chiriladi.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/main.js"]
