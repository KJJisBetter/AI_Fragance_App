FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/types/package*.json ./packages/types/
COPY packages/ai/package*.json ./packages/ai/

# Install dependencies
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules

# Build the application
RUN npm run build --workspace=@fragrance-battle/api

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copy built application
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=apiuser:nodejs /app/packages ./packages
COPY --from=dependencies --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package*.json ./apps/api/

USER apiuser

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
