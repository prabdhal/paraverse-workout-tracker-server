# backend/cleanup.sh
#!/bin/bash

echo "🧹 Cleaning up ParaVerse Backend..."

echo "🛑 Stopping all services..."
docker-compose down

echo "🗑️ Removing volumes..."
docker volume rm backend_postgres_data

echo "📦 Removing node_modules..."
rm -rf node_modules

echo "✅ Cleanup complete!"