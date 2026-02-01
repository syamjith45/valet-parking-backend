import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env'; // Use our env config

const supabase = createClient(
    env.SUPABASE_URL!,
    env.SUPABASE_KEY!
);

const prisma = new PrismaClient();

/**
 * User information attached to request
 */
export interface AuthUser {
    id: string;              // Staff/Valet ID from our database
    authUserId: string;      // Supabase auth user ID
    name: string;
    phone: string;
    role: string;            // Staff role or Valet status
    userType: 'STAFF' | 'VALET'; // Distinguish between staff and valet
    isActive: boolean;
}

/**
 * Extend Express Request type
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

/**
 * Authentication Middleware
 * 
 * Verifies JWT token with Supabase and attaches user info to request.
 * 
 * Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token with Supabase
 * 3. Get user details from Supabase
 * 4. Look up user in Staff OR Valet table
 * 5. Check if user is active
 * 6. Attach user info to request
 */
export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Extract token from header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No authorization header provided',
            });
            return;
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided',
            });
            return;
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token',
                details: error?.message,
            });
            return;
        }

        // 1. Try to find staff
        const staff = await prisma.staff.findUnique({
            where: { authUserId: user.id },
        });

        if (staff) {
            if (!staff.is_active) {
                res.status(403).json({ error: 'Forbidden', message: 'Account deactivated' });
                return;
            }

            // Update last login (fire and forget)
            prisma.staff.update({
                where: { id: staff.id },
                data: { last_login_at: new Date() }
            }).catch(console.error);

            req.user = {
                id: staff.id,
                authUserId: staff.authUserId,
                name: staff.name,
                phone: staff.phone,
                role: staff.role,
                userType: 'STAFF',
                isActive: staff.is_active,
            };
            next();
            return;
        }

        // 2. Try to find valet
        const valet = await prisma.valets.findUnique({
            where: { authUserId: user.id },
        });

        if (valet) {
            if (!valet.is_active) {
                res.status(403).json({ error: 'Forbidden', message: 'Account deactivated' });
                return;
            }

            // Update last login (fire and forget)
            prisma.valets.update({
                where: { id: valet.id },
                data: { last_login_at: new Date() }
            }).catch(console.error);

            req.user = {
                id: valet.id,
                authUserId: valet.authUserId!, // Should be non-null if found by it
                name: valet.name,
                phone: valet.phone,
                role: valet.status, // Use status as role for Valet
                userType: 'VALET',
                isActive: valet.is_active,
            };
            next();
            return;
        }

        // User authenticated in Supabase but not found in our DB
        res.status(403).json({
            error: 'Forbidden',
            message: 'User profile not found. Please contact administrator.',
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed',
        });
    }
}

/**
 * Optional Authentication Middleware
 * 
 * Attaches user if token is valid, but doesn't fail if no token.
 * Useful for public endpoints that change behavior when authenticated.
 */
export async function optionalAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            next();
            return;
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            next();
            return;
        }

        // Verify token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            next();
            return;
        }

        // Look up staff
        const staff = await prisma.staff.findUnique({
            where: { authUserId: user.id },
        });

        if (staff && staff.is_active) {
            req.user = {
                id: staff.id,
                authUserId: user.id,
                name: staff.name,
                phone: staff.phone,
                role: staff.role,
                userType: 'STAFF',
                isActive: staff.is_active,
            };
            next();
            return;
        }

        // Look up valet
        const valet = await prisma.valets.findUnique({
            where: { authUserId: user.id },
        });

        if (valet && valet.is_active) {
            req.user = {
                id: valet.id,
                authUserId: user.id,
                name: valet.name,
                phone: valet.phone,
                role: valet.status,
                userType: 'VALET',
                isActive: valet.is_active,
            };
        }

        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        next(); // Continue even if error
    }
}

/**
 * Role-based Access Control Middleware Factory
 * 
 * Creates middleware that checks if user has required role.
 * 
 * Usage:
 *   router.post('/vehicle/entry', requireRole(['ENTRY', 'SUPERVISOR']), handler);
 */
export function requireRole(allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
                userRole: req.user.role,
            });
            return;
        }

        next();
    };
}

/**
 * Permission-based Access Control Middleware Factory
 * 
 * Creates middleware that checks if user has required permission.
 * More granular than role-based access control.
 * 
 * Usage:
 *   router.post('/vehicle/entry', requirePermission('vehicle.create'), handler);
 */
export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
            return;
        }

        // Check permission based on role
        // This should match the StaffPermissions logic from domain layer
        const hasPermission = checkPermission(req.user.role, permission);

        if (!hasPermission) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required permission: ${permission}`,
                userRole: req.user.role,
            });
            return;
        }

        next();
    };
}

/**
 * Helper function to check permissions
 * (Should ideally import from domain layer, but included here for completeness)
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
        SUPERVISOR: new Set(['*']), // Wildcard for all permissions
        BILLING: new Set(['vehicle.view', 'markout.trigger']),
    };

    const permissions = rolePermissions[role];

    if (!permissions) return false;

    // Check for wildcard permission
    if (permissions.has('*')) return true;

    // Check for exact permission
    if (permissions.has(permission)) return true;

    // Check for wildcard permission (e.g., 'vehicle.*')
    const [resource] = permission.split('.');
    if (permissions.has(`${resource}.*`)) return true;

    return false;
}
