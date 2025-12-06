services:
  postgres:
    image: postgres:15-alpine
    container_name: paraverse-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: paraverse
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    container_name: paraverse-backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: "postgresql://postgres:postgres123@postgres:5432/paraverse"
      JWT_SECRET: "your-super-secret-jwt-key-change-this-in-production"
      NODE_ENV: "development"
      PORT: "3001"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
      - ./node_modules:/app/node_modules
    command: >
      sh -c "
        sleep 5 &&
        npx prisma generate &&
        npx prisma db push --accept-data-loss &&
        npx tsx src/index.ts
      "

volumes:
  postgres_data: