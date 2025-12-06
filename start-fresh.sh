#!/bin/bash
cd ~/Desktop/ParaVerse/Projects/paraverse-workout-tracker/server

echo "🚀 Starting fresh ParaVerse setup..."

# Clean up everything
docker-compose down -v
docker system prune -a -f

echo "1. Starting PostgreSQL..."
docker run -d \
  --name paraverse-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=paraverse \
  -p 5433:5432 \
  postgres:15-alpine

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "2. Setting up backend locally..."
# Install dependencies
npm install

# Generate Prisma client locally
npx prisma generate

# Push schema locally (connects to localhost:5433)
export DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/paraverse"
npx prisma db push --accept-data-loss

echo "3. Starting backend server..."
export JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
export PORT=3001
export NODE_ENV="development"
npx tsx src/index.ts