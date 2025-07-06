#!/bin/bash

# Fragrance Battle AI - Setup Script
# This script sets up the complete development environment with Docker

set -e

echo "🚀 Setting up Fragrance Battle AI Development Environment"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose found ✅"

# Create environment file for backend if it doesn't exist
if [ ! -f "apps/api/.env" ]; then
    print_status "Creating backend environment file..."
    cat > apps/api/.env << EOF
# Database (Docker setup)
DATABASE_URL="postgresql://fragranceuser:fragrancepass123@localhost:5432/fragrance_battle_ai"

# JWT Configuration
JWT_SECRET="fragrance-battle-ai-super-secret-jwt-key-min-32-chars-$(date +%s)"
JWT_EXPIRES_IN="7d"

# OpenAI API (Add your API key here)
OPENAI_API_KEY="your-openai-api-key-here"

# Server Configuration
PORT=3001
NODE_ENV="development"

# Frontend Configuration
FRONTEND_URL="http://localhost:5173"

# Logging
LOG_LEVEL="info"
EOF
    print_success "Backend .env file created"
    print_warning "⚠️  Please add your OpenAI API key to apps/api/.env"
else
    print_status "Backend .env file already exists"
fi

# Create environment file for frontend if it doesn't exist
if [ ! -f "apps/web/.env.local" ]; then
    print_status "Creating frontend environment file..."
    cat > apps/web/.env.local << EOF
# Frontend Environment Variables

# API Configuration
VITE_API_URL=http://localhost:3001/api

# App Configuration
VITE_APP_NAME="Fragrance Battle AI"
VITE_APP_DESCRIPTION="AI-powered fragrance collection management and blind testing platform"

# Development
VITE_NODE_ENV=development
EOF
    print_success "Frontend .env.local file created"
else
    print_status "Frontend .env.local file already exists"
fi

# Create environment file for database package if it doesn't exist
if [ ! -f "packages/database/.env" ]; then
    print_status "Creating database package environment file..."
    cat > packages/database/.env << EOF
# Database Configuration
DATABASE_URL="postgresql://fragranceuser:fragrancepass123@localhost:5432/fragrance_battle_ai"
EOF
    print_success "Database package .env file created"
else
    print_status "Database package .env file already exists"
fi

# Start Docker containers
print_status "Starting PostgreSQL database with Docker..."
docker-compose up -d postgres

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Check if database is responding
until docker exec fragrance-battle-db pg_isready -U fragranceuser -d fragrance_battle_ai; do
    print_status "Database is not ready yet. Waiting..."
    sleep 5
done

print_success "Database is ready! 🐘"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Generate Prisma client
print_status "Generating Prisma client..."
npm run db:generate

# Push database schema
print_status "Setting up database schema..."
npm run db:push

# Import fragrance data
if [ -f "data/fra_cleaned.csv" ]; then
    print_status "Importing fragrance data from CSV..."
    cd packages/database
    npm run db:import
    cd ../..
    print_success "Fragrance data imported successfully! 📊"
else
    print_warning "CSV file 'data/fra_cleaned.csv' not found. Skipping data import."
    print_status "You can import data later with: cd packages/database && npm run db:import"
fi

# Start PgAdmin (optional)
print_status "Starting PgAdmin (optional database management tool)..."
docker-compose up -d pgadmin

echo ""
print_success "🎉 Setup completed successfully!"
echo ""
echo "Your development environment is ready:"
echo ""
echo "📊 Database:"
echo "   - PostgreSQL: postgresql://fragranceuser:fragrancepass123@localhost:5432/fragrance_battle_ai"
echo "   - PgAdmin: http://localhost:8080 (admin@fragrancebattle.com / admin123)"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "🔧 Other useful commands:"
echo "   npm run db:studio    # Open Prisma Studio"
echo "   docker-compose logs  # View database logs"
echo "   docker-compose down  # Stop all containers"
echo ""

if grep -q "your-openai-api-key-here" apps/api/.env; then
    print_warning "⚠️  Don't forget to add your OpenAI API key to apps/api/.env for AI features!"
fi

echo "Happy coding! 🧪✨"
