import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import express from 'express';
import http from 'http';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import logger from '../../shared/utils/logger';
import { errorHandler } from '../middleware/error.middleware';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { createGraphQLContext, UseCases } from './context';

export async function startApolloServer(
    typeDefs: string,
    resolvers: any,
    prisma: PrismaClient,
    useCases: UseCases
) {
    const app = express();
    const httpServer = http.createServer(app);

    // Basic middleware
    app.use(express.json());

    // Auth middleware
    app.use(optionalAuthMiddleware);

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
        context: ({ req }) => createGraphQLContext(req, prisma, useCases),
        formatError: (err) => {
            logger.error(`GraphQL Error: ${err.message}`, err);
            return err;
        },
    });

    await server.start();
    server.applyMiddleware({ app });

    // Global Error Handler
    app.use(errorHandler);

    await new Promise<void>(resolve => httpServer.listen({ port: env.PORT }, resolve));
    logger.info(`🚀 Server ready at http://localhost:${env.PORT}${server.graphqlPath}`);
}
