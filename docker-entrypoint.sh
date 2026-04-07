#!/bin/sh
# =============================================================================
# Nexus QMS — Docker Entrypoint
#
# Runs before the Next.js server starts inside the container.
# Responsible for syncing the Prisma schema to MongoDB on every deploy.
#
# MongoDB does not use migration files (unlike PostgreSQL). Prisma uses
# `db push` which introspects the schema and applies any structural changes
# directly to the database without needing a migrations folder.
#
# Note: `set -e` causes the script to exit immediately if any command fails,
# preventing the app from starting with an out-of-sync database schema.
# =============================================================================
set -e

echo "Pushing database schema to MongoDB..."
# Syncs prisma/schema.prisma to the connected MongoDB instance.
# Safe to run on every startup — idempotent for unchanged schemas.
node_modules/.bin/prisma db push

echo "Starting application..."
# Replace this shell process with the Node server (PID 1 in the container)
# so that OS signals (SIGTERM, SIGINT) are forwarded correctly for graceful shutdown.
exec node server.js
