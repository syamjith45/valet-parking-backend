import express, { Express } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

// Middleware
import { authMiddleware } from './presentation/middleware/auth.middleware';

// GraphQL
import { createGraphQLContext } from './presentation/graphql/context';
import { resolvers } from './presentation/graphql/resolvers';

// REST Routes
import webhookRoutes from './presentation/rest/routes/webhooks.routes';
import healthRoutes from './presentation/rest/routes/health.routes';
import { createVehicleRouter } from './presentation/rest/routes/vehicle.routes';

// Services
import { initializeDependencies } from './config/dependencies';

/**
 * Main Application Entry Point
 */
async function startServer() {
  // Initialize Express
  const app: Express = express();
  const httpServer = http.createServer(app);

  // Initialize Prisma
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Initialize dependencies (use cases, services, repositories)
  const useCases = initializeDependencies(prisma);

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // REST Routes (no auth required)
  app.use('/api/health', healthRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // REST Routes (with auth inside router)
  app.use('/api/vehicles', createVehicleRouter(useCases));

  // Load GraphQL Schema
  const typeDefs = readFileSync(
    join(__dirname, 'presentation/graphql/schema/schema.graphql'),
    'utf-8'
  );

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
    formatError: (error) => {
      console.error('GraphQL Error:', error);

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        return {
          message: error.message,
          code: (error.extensions?.code as string) || 'INTERNAL_SERVER_ERROR',
        };
      }

      return error;
    },
  });

  await apolloServer.start();

  // GraphQL endpoint (with authentication)
  app.use(
    '/graphql',
    authMiddleware, // Verify JWT
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        return createGraphQLContext(req, prisma, useCases);
      },
    })
  );

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message,
    });
  });

  // Start server
  const PORT = process.env.PORT || 4000;

  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => {
      resolve();
    });
  });

  console.log(`
🚀 Server ready!
📍 GraphQL endpoint: http://localhost:${PORT}/graphql
📍 Webhooks endpoint: http://localhost:${PORT}/api/webhooks
📍 Health check: http://localhost:${PORT}/api/health
🔐 Authentication: JWT via Supabase
🗄️  Database: PostgreSQL via Prisma
  `);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    await apolloServer.stop();
    await prisma.$disconnect();
    httpServer.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
