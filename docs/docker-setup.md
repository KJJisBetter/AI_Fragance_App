# Docker Database Setup Guide

This guide will help you set up the Fragrance Battle AI application using Docker for the database.

## 🐳 Why Docker?

**Recommended for Development** because it provides:
- ✅ **Easy Setup**: One command gets you a fully configured PostgreSQL database
- ✅ **Consistency**: Same environment across all developers
- ✅ **No Local Installation**: No need to install PostgreSQL on your machine
- ✅ **Data Persistence**: Your data survives container restarts
- ✅ **PgAdmin Included**: Web-based database management interface

## 🚀 Quick Start (Recommended)

### Option 1: Automated Setup (Easiest)
```bash
# Run the setup script - it does everything for you!
npm run setup
```

This script will:
- Start PostgreSQL with Docker
- Create environment files
- Install dependencies
- Set up database schema
- Import your 24K+ fragrance dataset
- Start PgAdmin for database management

### Option 2: Manual Setup
```bash
# 1. Start the database
docker-compose up -d postgres

# 2. Install dependencies
npm install

# 3. Setup environment files
cp apps/api/env.example apps/api/.env
cp apps/web/env.example apps/web/.env.local

# 4. Generate Prisma client and setup schema
npm run db:generate
npm run db:push

# 5. Import your fragrance data
npm run db:import

# 6. Start development servers
npm run dev
```

## 🔧 Environment Configuration

The setup script creates these files automatically, but here's what they contain:

### Backend (.env)
```env
DATABASE_URL="postgresql://fragranceuser:fragrancepass123@localhost:5432/fragrance_battle_ai"
JWT_SECRET="auto-generated-secure-key"
OPENAI_API_KEY="your-openai-api-key-here"  # ⚠️ Add your key here
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME="Fragrance Battle AI"
```

## 📊 Your Fragrance Dataset

Your `fra_cleaned.csv` contains **24,064 fragrances** with:
- Fragrance names and brands
- Top/middle/base notes
- Fragrantica ratings and countries
- Main accords for AI categorization
- Perfumer information

The import script automatically:
- ✅ Parses semicolon-separated values
- ✅ Handles European decimal format (comma → dot)
- ✅ Maps main accords to seasons/occasions/moods
- ✅ Processes in batches for performance
- ✅ Skips duplicates automatically

## 🛠️ Docker Commands

```bash
# Database Management
npm run docker:up       # Start all containers
npm run docker:down     # Stop all containers
npm run docker:restart  # Restart containers
npm run docker:logs     # View container logs

# Database Operations
npm run db:studio      # Open Prisma Studio
npm run db:import      # Import CSV data
npm run db:generate    # Regenerate Prisma client
npm run db:push        # Push schema changes
```

## 🌐 Access Points

Once running, you can access:

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api
- **PgAdmin**: http://localhost:8080
  - Email: `admin@fragrancebattle.com`
  - Password: `admin123`
- **Prisma Studio**: `npm run db:studio`

## 🔍 Database Connection Details

```
Host: localhost
Port: 5432
Database: fragrance_battle_ai
Username: fragranceuser
Password: fragrancepass123
```

## 🆚 Alternative: Local PostgreSQL

If you prefer installing PostgreSQL locally:

```bash
# Install PostgreSQL 14+ on your system
# Create database manually
createdb fragrance_battle_ai

# Update .env with your local connection
DATABASE_URL="postgresql://yourusername:yourpassword@localhost:5432/fragrance_battle_ai"

# Continue with normal setup
npm run db:generate
npm run db:push
npm run db:import
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if containers are running
docker ps

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Import Issues
```bash
# Check CSV file exists
ls -la data/fra_cleaned.csv

# Manual import with logging
cd packages/database
npm run db:import

# View detailed import logs
docker-compose logs fragrance-battle-db
```

### Port Conflicts
If port 5432 is already in use:
```yaml
# Edit docker-compose.yml
ports:
  - "5433:5432"  # Use different external port

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://fragranceuser:fragrancepass123@localhost:5433/fragrance_battle_ai"
```

## 🎯 Next Steps

After setup is complete:

1. **Add OpenAI API Key**: Edit `apps/api/.env` and add your OpenAI key
2. **Start Development**: `npm run dev`
3. **Test the Application**: Visit http://localhost:5173
4. **Explore Data**: Use PgAdmin or Prisma Studio to view your imported fragrances

## 📈 Performance Notes

With 24K+ fragrances:
- **Import time**: ~2-5 minutes depending on your machine
- **Database size**: ~50MB after import
- **Search performance**: Optimized with database indexes
- **Memory usage**: ~100MB for PostgreSQL container

The application is designed to handle this dataset size efficiently with pagination, caching, and optimized queries.

---

**Ready to start building your AI-powered fragrance platform!** 🧪✨
