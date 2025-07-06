# Fragrance Battle AI

AI-powered fragrance collection management and blind testing platform. This MVP addresses the gap in current AI fragrance categorization by combining personal collection management, AI categorization, blind testing, and real user data validation.

## 🚀 Features

### Core Functionality
- **AI Fragrance Categorization**: Advanced GPT-4 powered categorization for seasons, occasions, and moods
- **Personal Collection Management**: Organize and rate your fragrance collection with personal notes
- **Blind Testing Battles**: Create and participate in fragrance battles without knowing the names
- **User Feedback Loop**: Improve AI accuracy through community corrections
- **Analytics Dashboard**: Track preferences, ratings, and battle performance

### Technical Highlights
- **Modern Tech Stack**: React 18 + TypeScript + Tailwind CSS + Vite frontend
- **Robust Backend**: Node.js + Express + TypeScript with comprehensive API
- **Type-Safe Database**: PostgreSQL + Prisma ORM with full type safety
- **AI Integration**: OpenAI GPT-4 API with intelligent prompt engineering
- **Monorepo Architecture**: Organized workspace with shared packages

## 🏗️ Project Structure

```
fragrance-battle-ai/
├── apps/
│   ├── web/                 # React frontend (Vite + TypeScript + Tailwind)
│   └── api/                 # Express backend (TypeScript + Prisma)
├── packages/
│   ├── database/            # Prisma schema and database utilities
│   ├── types/               # Shared TypeScript types
│   └── ai/                  # OpenAI integration and AI services
├── data/
│   └── (CSV import files)   # Initial fragrance datasets
└── docs/
    └── api.md               # API documentation
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript and strict mode
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with custom design system
- **React Router** for client-side routing
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Radix UI** components for accessibility

### Backend
- **Node.js + Express** with TypeScript
- **Prisma ORM** with PostgreSQL database
- **JWT authentication** with bcrypt password hashing
- **OpenAI GPT-4 API** integration
- **Rate limiting** and security middleware
- **Comprehensive validation** with Joi

### Database
- **PostgreSQL** with optimized schemas
- **Prisma** for type-safe database operations
- **Automated migrations** and seeding
- **Indexes** for search performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

### 1. Clone Repository
```bash
git clone <repository-url>
cd fragrance-battle-ai
```

### 2. Quick Setup with Docker (Recommended)

**🚀 One-command setup:**
```bash
npm run setup
```

This automated script will:
- ✅ Start PostgreSQL with Docker
- ✅ Install all dependencies
- ✅ Create environment files
- ✅ Set up database schema
- ✅ Import your 24K+ fragrance dataset
- ✅ Configure PgAdmin for database management

**📋 Manual setup:** See [Docker Setup Guide](docs/docker-setup.md) for detailed instructions.

**⚠️ Don't forget:** Add your OpenAI API key to `apps/api/.env` after setup.

### 3. Start Development
```bash
# Start both frontend and backend
npm run dev
```

### 4. Access Your Application
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api
- **Database Admin**: http://localhost:8080 (PgAdmin)
- **Database Studio**: `npm run db:studio` (Prisma Studio)

Your **24,064 fragrances** are now ready for AI-powered categorization! 🧪✨

## 📝 Development

### Available Scripts
```bash
# Install dependencies for all packages
npm install

# Start development servers
npm run dev

# Build all packages
npm run build

# Run linting
npm run lint

# Run tests
npm run test

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema changes
npm run db:migrate    # Create and run migrations
npm run db:import     # Import your CSV data
npm run db:studio     # Open Prisma Studio

# Docker database management
npm run docker:up      # Start database containers
npm run docker:down    # Stop database containers
npm run docker:logs    # View database logs

# Clean build artifacts
npm run clean
```

### Database Operations
```bash
# Reset database and reseed
npm run db:migrate:reset

# View data in Prisma Studio
cd packages/database && npm run db:studio
```

## 🔧 Configuration

### Environment Variables

**Backend (apps/api/.env)**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (32+ characters)
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)
- `OPENAI_API_KEY`: OpenAI API key for AI categorization
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

**Frontend (apps/web/.env.local)**:
- `VITE_API_URL`: Backend API URL (default: http://localhost:3001/api)

### Database Schema

The application uses a comprehensive PostgreSQL schema with the following models:
- **User**: Authentication and profile data
- **Fragrance**: Complete fragrance information with AI categorizations
- **Collection**: User's personal fragrance collections
- **CollectionItem**: Individual fragrances in collections with personal ratings
- **Battle**: Blind testing battles between fragrances
- **BattleItem**: Individual fragrances in battles with vote counts
- **AICategorFeedback**: User feedback for improving AI accuracy

## 🤖 AI Integration

The application uses OpenAI GPT-4 for intelligent fragrance categorization:

### Features
- **Seasonal Categorization**: Spring, Summer, Fall, Winter appropriateness
- **Occasion Mapping**: Daily, Evening, Formal, Casual, Date, Work suitability
- **Mood Classification**: Fresh, Confident, Sophisticated, Playful, Romantic, Energetic
- **Confidence Scoring**: AI provides confidence levels for categorizations
- **User Feedback Loop**: Community corrections improve future categorizations

### Implementation
- Sophisticated prompt engineering for accurate categorizations
- Batch processing capabilities for large datasets
- Rate limiting to respect OpenAI API limits
- Caching to reduce redundant API calls
- Fallback handling for API unavailability

## 📊 Key Features Detail

### Collection Management
- Create multiple collections (e.g., "Daily Drivers", "Special Occasions")
- Add fragrances with personal ratings (1-10 scale)
- Personal notes and bottle size tracking
- Search and filter within collections

### Blind Testing Battles
- Create battles with 2-10 fragrances
- Hide fragrance names during voting
- Track vote counts and determine winners
- Public battles for community participation
- Battle history and analytics

### AI Categorization
- Analyze fragrance notes to determine seasonal appropriateness
- Map fragrances to appropriate occasions and moods
- Learn from user feedback to improve accuracy
- Batch categorization for existing collections

### Analytics Dashboard
- Personal fragrance statistics
- Favorite seasons, occasions, and brands
- Battle win rates and popularity scores
- Collection growth over time

## 🔒 Security

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive validation on all endpoints
- **CORS Configuration**: Proper cross-origin resource sharing
- **Helmet Security**: Security headers and protection middleware

## 🚀 Deployment

### Production Build
```bash
# Build all packages
npm run build

# Backend will be in apps/api/dist/
# Frontend will be in apps/web/dist/
```

### Environment Configuration
- Set `NODE_ENV=production`
- Configure production database URL
- Set secure JWT secret
- Configure CORS for production domain
- Set up SSL certificates

### Database
- Run migrations: `npm run db:migrate`
- Set up connection pooling
- Configure backup strategy
- Optimize indexes for production load

## 🔄 Future Enhancements

### Planned Features
- **Mobile App**: React Native application
- **Social Features**: Follow users, share collections
- **Advanced Analytics**: ML-powered preference prediction
- **Fragrance Recommendations**: AI-powered discovery engine
- **Community Reviews**: User-generated fragrance reviews
- **Price Tracking**: Monitor fragrance prices across retailers

### Technical Improvements
- **Search Enhancement**: Elasticsearch for advanced search
- **Image Upload**: Fragrance bottle photo storage
- **Real-time Features**: WebSocket for live battles
- **API Versioning**: Backward-compatible API evolution
- **Microservices**: Service decomposition for scalability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 API powering the AI categorization
- **Fragrantica** community for fragrance data inspiration
- **React** and **TypeScript** communities for excellent tooling
- **Prisma** team for type-safe database operations

---

**Built with ❤️ for fragrance enthusiasts who want better AI-powered categorization and discovery tools.**
