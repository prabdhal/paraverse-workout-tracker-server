#!/bin/bash
cd ~/Desktop/ParaVerse/Projects/paraverse-workout-tracker/server

echo "🚀 Starting ParaVerse Backend Development..."

# Check if Docker PostgreSQL is running
if docker ps | grep -q "paraverse-postgres"; then
  echo "🐳 Docker PostgreSQL is running"
  # Use Docker connection
  export DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/paraverse"
else
  echo "⚠️  Docker PostgreSQL not found. Starting it..."
  docker run -d \
    --name paraverse-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres123 \
    -e POSTGRES_DB=paraverse \
    -p 5433:5432 \
    postgres:15-alpine
  
  echo "⏳ Waiting for PostgreSQL to start..."
  sleep 5
  export DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/paraverse"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push schema to database
echo "🗄️  Pushing schema to database..."
npx prisma db push --accept-data-loss

# Start the server
echo "🌐 Starting server..."
npx tsx src/index.ts