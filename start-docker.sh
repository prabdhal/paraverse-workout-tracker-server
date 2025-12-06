#!/bin/bash
cd ~/Desktop/ParaVerse/Projects/paraverse-workout-tracker/server

echo "🚀 Starting ParaVerse with Docker Compose..."

# Stop and remove existing containers
docker-compose down

# Build and start services
docker-compose up --build