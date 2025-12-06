# backend/setup.sh
#!/bin/bash

echo "🚀 Setting up ParaVerse Backend..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🐘 Starting PostgreSQL database..."
docker-compose up -d postgres

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "📊 Running database migrations..."
npx prisma migrate dev --name init

echo "🌱 Seeding database..."
npm run db:seed

echo "🚀 Starting backend server..."
docker-compose up -d backend

echo "🌐 Starting pgAdmin (http://localhost:5050)..."
docker-compose up -d pgadmin

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Services running:"
echo "   Backend API: http://localhost:3001"
echo "   PostgreSQL: localhost:5432"
echo "   pgAdmin: http://localhost:5050"
echo ""
echo "🔑 Default credentials:"
echo "   pgAdmin: admin@paraverse.com / admin123"
echo "   Demo user: demo@paraverse.com / demo123"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Prisma Studio: npx prisma studio"