import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';
import { AuthUser } from '../middleware/auth.middleware';

/**
 * GraphQL Context
 * 
 * Contains all dependencies needed by resolvers:
 * - User info (from auth middleware)
 * - Database client
 * - DataLoaders (for N+1 prevention)
 * - Use case instances (dependency injection)
 */
export interface GraphQLContext {
    user?: AuthUser;
    prisma: PrismaClient;
    loaders: DataLoaders;
    useCases: UseCases;
}

/**
 * DataLoaders for efficient data fetching
 * Prevents N+1 query problem
 */
export interface DataLoaders {
    valetLoader: DataLoader<string, any>;
    staffLoader: DataLoader<string, any>;
    zoneLoader: DataLoader<string, any>;
    vehicleLoader: DataLoader<string, any>;
}

/**
 * Use Cases (injected via DI container)
 */
export interface UseCases {
    createVehicleEntry: any;
    markVehicleParked: any;
    requestMarkOut: any;
    assignValetRoundRobin: any;
    // Add more as needed
}

/**
 * Create GraphQL Context
 * 
 * Called for each GraphQL request to set up context.
 */
export async function createGraphQLContext(
    req: Request,
    prisma: PrismaClient,
    useCases: UseCases
): Promise<GraphQLContext> {
    return {
        user: req.user, // Attached by auth middleware
        prisma,
        loaders: createDataLoaders(prisma),
        useCases,
    };
}

/**
 * Create DataLoaders for efficient batching
 * 
 * DataLoader batches multiple individual load calls into a single database query.
 * This solves the N+1 query problem.
 */
function createDataLoaders(prisma: PrismaClient): DataLoaders {
    return {
        // Valet Loader
        valetLoader: new DataLoader<string, any>(
            async (ids: readonly string[]) => {
                const valets = await prisma.valets.findMany({
                    where: { id: { in: [...ids] } },
                });

                // DataLoader requires results in same order as input IDs
                const valetMap = new Map(valets.map((v) => [v.id, v]));
                return ids.map((id) => valetMap.get(id) || null);
            },
            {
                // Cache results for the duration of the request
                cache: true,
                // Batch multiple loads within 10ms into single query
                batchScheduleFn: (callback) => setTimeout(callback, 10),
            }
        ),

        // Staff Loader
        staffLoader: new DataLoader<string, any>(
            async (ids: readonly string[]) => {
                const staff = await prisma.staff.findMany({
                    where: { id: { in: [...ids] } },
                });

                const staffMap = new Map(staff.map((s) => [s.id, s]));
                return ids.map((id) => staffMap.get(id) || null);
            },
            { cache: true }
        ),

        // Parking Zone Loader
        zoneLoader: new DataLoader<string, any>(
            async (ids: readonly string[]) => {
                const zones = await prisma.parking_zones.findMany({
                    where: { id: { in: [...ids] } },
                });

                const zoneMap = new Map(zones.map((z) => [z.id, z]));
                return ids.map((id) => zoneMap.get(id) || null);
            },
            { cache: true }
        ),

        // Vehicle Loader
        vehicleLoader: new DataLoader<string, any>(
            async (ids: readonly string[]) => {
                const vehicles = await prisma.vehicles.findMany({
                    where: { id: { in: [...ids] } },
                });

                const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
                return ids.map((id) => vehicleMap.get(id) || null);
            },
            { cache: true }
        ),
    };
}

/**
 * Helper: Check if user is authenticated
 */
export function requireAuth(context: GraphQLContext): AuthUser {
    if (!context.user) {
        throw new Error('Authentication required');
    }
    return context.user;
}

/**
 * Helper: Check if user has specific role
 */
export function requireRole(context: GraphQLContext, allowedRoles: string[]): AuthUser {
    const user = requireAuth(context);

    if (!allowedRoles.includes(user.role)) {
        throw new Error(
            `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${user.role}`
        );
    }

    return user;
}

/**
 * Helper: Check if user has permission
 */
export function requirePermission(context: GraphQLContext, permission: string): AuthUser {
    const user = requireAuth(context);

    // Permission checking logic (should match auth.middleware.ts)
    const hasPermission = checkPermission(user.role, permission);

    if (!hasPermission) {
        throw new Error(
            `Access denied. Required permission: ${permission}. Your role: ${user.role}`
        );
    }

    return user;
}

/**
 * Helper: Check permission based on role
 */
function checkPermission(role: string, permission: string): boolean {
    const rolePermissions: Record<string, Set<string>> = {
        ENTRY: new Set(['vehicle.create', 'vehicle.view', 'zone.view', 'valet.view']),
        EXIT: new Set([
            'vehicle.view',
            'vehicle.search',
            'vehicle.markDelivered',
            'vehicle.expedite',
            'markout.override',
        ]),
        SUPERVISOR: new Set(['*']),
        BILLING: new Set(['vehicle.view', 'markout.trigger']),
    };

    const permissions = rolePermissions[role];
    if (!permissions) return false;
    if (permissions.has('*')) return true;
    if (permissions.has(permission)) return true;

    const [resource] = permission.split('.');
    if (permissions.has(`${resource}.*`)) return true;

    return false;
}
