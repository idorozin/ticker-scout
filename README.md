# Ticker Scout 🔍

A modern stock screening application that uses semantic search to find companies based on natural language descriptions.

## Features

- 🔎 Semantic search powered by OpenAI embeddings
- 📊 S&P 500 company data
- 🎯 Filter by sector and market cap
- ⚡ Fast vector similarity search using sqlite-vec
- 🎨 Modern UI with Tailwind CSS

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key for semantic search functionality

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ticker-scout.git
   cd ticker-scout
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your OpenAI API key:
   ```
   DATABASE_URL="file:./dev.db"
   OPENAI_API_KEY="your-api-key-here"
   ```

4. Initialize the database and generate embeddings:
   ```bash
   npm run db:setup
   ```
   This will:
   - Create SQLite database
   - Load S&P 500 company data
   - Generate embeddings for company descriptions

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
ticker-scout/
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── scripts/             # Utility scripts
│   ├── seed.ts         # Database seeding
│   └── generate-embeddings.ts  # Vector embedding generation
├── src/
│   ├── app/            # Next.js app router pages
│   │   ├── api/       # API routes
│   │   └── page.tsx   # Main page
│   └── components/     # React components
└── .env                # Environment variables (not in git)
```

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed the database with S&P 500 data
- `npm run db:setup` - Full setup (schema + seed + embeddings)

## Technical Details

- **Framework**: Next.js 14 with App Router
- **Database**: SQLite with Prisma ORM
- **Vector Search**: sqlite-vec extension
- **Embeddings**: OpenAI text-embedding-3-small
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## License

MIT License - feel free to use this project for any purpose.
