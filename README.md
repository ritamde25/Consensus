<div align="center">

<img src="apps/frontend/assets/trade-favicon.png" alt="Consensus Logo" width="120"/>

# Consensus

**A High-Performance Prediction Market Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-white)](https://bun.sh/)
[![Express](https://img.shields.io/badge/Express-5.2-green)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2e3e8e)](https://www.prisma.io/)

<!-- Screenshot placeholder -->
<!-- 
![Platform Screenshot](path/to/screenshot.png)
*A clean, intuitive interface for trading prediction markets*
-->

</div>

## 🎯 Overview

Consensus is a sophisticated prediction market platform featuring a high-performance order matching engine, real-time trade execution, and comprehensive portfolio management. The system is designed with a focus on backend architecture, financial integrity, and low-latency order processing.

### Key Features

- **High-Performance Matching Engine**: In-memory order book using heap-based data structures for O(1) order insertion and O(log n) retrieval
- **Binary Outcome Markets**: Trade YES/NO positions on prediction markets with price discovery mechanisms
- **Real-time Settlement**: Automated market resolution with instantaneous payout calculation
- **Position Management**: Advanced portfolio tracking with locked/unlocked share states
- **AI-Powered Analysis**: Integrated market analysis using Google's Gemini AI
- **Secure Authentication**: JWT-based authentication via Supabase

---

## 🏗️ System Architecture

### Backend Design Philosophy

The backend is built around several core architectural principles:

1. **Performance-First Design**: Critical trading operations are optimized for minimal latency
2. **Financial Integrity**: Strict transactional guarantees ensure no funds or shares are lost
3. **Scalability**: In-memory order books with database persistence for durability
4. **Modular Components**: Clean separation between matching, settlement, and authentication

### Core Components

<details>
<summary><b>🔧 Order Matching Engine</b></summary>

The heart of the system is the **Heap-based Matching Engine** (`apps/backend/src/lib/heapMatchingEngine.ts`) which implements:

- **In-Memory Order Books**: Uses binary heaps for O(log n) order matching operations
- **Price-Time Priority**: Orders are matched based on best price, then by creation time
- **Normalised Pricing**: Converts all orders to YES-equivalent prices for unified matching
- **Hot Path Optimization**: Matching happens in-memory before database persistence for minimal latency
- **Async Persistence**: Database writes happen after response to ensure fast user experience

Key Design Decisions:
- BUY YES and SELL NO are both treated as "BUY" operations on YES price
- SELL YES and BUY NO are both treated as "SELL" operations on YES price
- Partial fills are supported with automatic order status updates
- Maker updates happen asynchronously to avoid blocking trade execution

</details>

<details>
<summary><b>💰 Settlement Engine</b></summary>

The **Settlement Engine** (`apps/backend/src/lib/settlementEngine.ts`) handles market resolution:

- **Order Cancellation**: Automatically cancels all open orders when markets resolve
- **Collateral Release**: Returns locked funds and shares to users
- **Payout Calculation**: Distributes winnings based on final outcome (100 cents per winning share)
- **Transactional Safety**: All settlement operations happen in a single database transaction

Settlement Process:
1. Verify market exists and is unresolved
2. Cancel all OPEN/PARTIAL orders with collateral return
3. Calculate payouts for winning positions
4. Update user balances
5. Mark market as resolved

</details>

<details>
<summary><b>🔐 Authentication & Security</b></summary>

**JWT-Based Authentication** (`apps/backend/src/middlewares/auth.middleware.ts`):

- Uses Supabase JWT verification with JWKS (JSON Web Key Set)
- Automatic user provisioning on first login
- Transaction-safe user balance initialization
- User identification via `req.userId` in protected routes

Security Features:
- All protected routes require valid JWT tokens
- Database-level row locking for balance operations
- Atomic transactions prevent double-spending
- Separation of available vs locked balances

</details>

<details>
<summary><b>📊 Database Schema</b></summary>

**PostgreSQL with Prisma ORM** (`packages/db/prisma/schema.prisma`):

Core Models:
- **User**: Account balances (USD/locked), position tracking
- **Market**: Prediction markets with resolution deadlines
- **Order**: Order book entries with normalised pricing for matching
- **Trade**: Execution history with maker/taker details
- **Position**: User holdings per market with locked/unlocked states
- **MarketAnalysis**: AI-generated market insights with caching

Key Design Patterns:
- Normalised pricing for efficient order matching
- Separate locked/unlocked balances for pending orders
- Composite indexes for optimal query performance
- Transaction-safe status updates

</details>

---

## 🚀 API Architecture

### RESTful Endpoints

#### Market Operations
- `GET /markets` - List all markets
- `GET /markets/:id` - Get market details with order book and user positions
- `POST /markets/create` - Create new prediction market
- `GET /markets/:id/analysis` - Get AI-powered market analysis (cached)

#### Order Management
- `POST /orders/order` - Place limit orders (BUY/SELL YES/NO)
- `POST /orders/split` - Split position (buy equal YES/NO shares)
- `POST /orders/merge` - Merge position (sell equal YES/NO shares)

#### Portfolio Management
- `GET /portfolio/balance` - Get USD and locked balances
- `GET /portfolio/positions` - Get all user positions
- `GET /portfolio/history` - Get trade history
- `POST /portfolio/deposit` - Add funds to account
- `POST /portfolio/withdraw` - Withdraw funds

#### Administration
- `PATCH /admin/updateMarket/:id` - Update market details
- `DELETE /admin/updateMarket/:id` - Delete market
- `POST /admin/settleMarket/:id` - Resolve market with final outcome
- `GET /admin/settlementDetails/:id` - Get settlement breakdown

---

## 💻 Technology Stack

### Backend
- **Runtime**: Bun 1.3 (high-performance JavaScript runtime)
- **Framework**: Express 5.2 (REST API server)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase JWT + jose library
- **Validation**: Zod schemas for type-safe input validation
- **AI Integration**: Google Gemini 2.5 Flash for market analysis

### Frontend
- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth

### Development
- **Package Manager**: Bun workspaces
- **Build System**: Turborepo for monorepo management
- **Language**: TypeScript 5.9 (strict mode)
- **Code Quality**: ESLint, Prettier

---

## 📁 Project Structure

```
consensus/
├── apps/
│   ├── backend/              # Express API server
│   │   ├── src/
│   │   │   ├── controllers/  # Route handlers (market, orders, portfolio, admin)
│   │   │   ├── lib/          # Core business logic (matching, settlement engines)
│   │   │   ├── middlewares/  # Auth middleware
│   │   │   ├── orderbook/    # Heap-based order book implementation
│   │   │   ├── types/        # TypeScript types and Zod schemas
│   │   │   └── utils/        # Market analysis utilities
│   │   └── package.json
│   └── frontend/             # Next.js application
├── packages/
│   ├── db/                   # Prisma schema and client
│   ├── eslint-config/        # Shared ESLint configuration
│   ├── typescript-config/    # Shared TypeScript configuration
│   └── ui/                   # Shared React components
└── package.json              # Root package.json
```

---

## 🛠️ Development

### Prerequisites
- Bun 1.3+
- PostgreSQL database
- Supabase project (for authentication)
- Google Gemini API key (for market analysis)

### Setup

1. **Install dependencies**:
```bash
bun install
```

2. **Configure environment variables**:
Create `.env` file in `apps/backend/`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/consensus"
SUPABASE_URL="your-supabase-url"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
NODE_ENV="development"
```

3. **Set up database**:
```bash
cd packages/db
bun prisma migrate dev
bun prisma generate
```

4. **Run development servers**:
```bash
# Run both backend and frontend
bun dev

# Or run individually
cd apps/backend && bun dev
cd apps/frontend && bun dev
```

### Building for Production

```bash
# Build all packages
bun run build

# Start production server
bun start
```

---

## 🔍 Key Design Decisions

### Order Matching Strategy
**Why Heap-Based Order Books?**
- O(1) insertion for market orders
- O(log n) retrieval for best price execution
- Efficient price-time priority matching
- Memory-efficient for large order books

### Normalised Pricing
**Why Convert to YES-Equivalent Prices?**
- Unifies matching logic across all order types
- Simplifies price comparison (always looking for best YES price)
- Reduces edge cases in matching algorithm
- Enables efficient cross-outcome arbitrage detection

### Async Maker Updates
**Why Update Makers Asynchronously?**
- Minimizes latency for taker (active trader)
- Improves user experience with faster responses
- Maintains data integrity through database transactions
- Allows batch processing of multiple maker updates

### Transaction Safety
**Why Row-Level Locking?**
- Prevents race conditions in balance updates
- Ensures atomicity of complex operations
- Prevents double-spending and negative balances
- Serializable isolation for financial operations

---

## 🚧 Future Enhancements

- **Margin Trading**: Leverage positions with collateral requirements
- **Portfolio Risk Engine**: Real-time risk assessment across positions
- **Partial Netting**: Cross-market position netting for efficiency
- **WebSocket Integration**: Real-time order book updates
- **Advanced Order Types**: Limit orders, stop-loss, iceberg orders
- **Market Making Bot**: Automated liquidity provision
- **Performance Optimization**: Redis caching for frequently accessed data

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and architecture patterns when making changes.

---

**Built with ❤️ using TypeScript, Bun, and modern backend architecture principles**