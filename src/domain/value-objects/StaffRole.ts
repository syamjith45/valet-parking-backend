/**
 * Staff Role Value Object
 * 
 * Represents different staff roles with their permissions.
 */

export enum StaffRole {
    ENTRY = 'ENTRY',           // Entry gate staff - creates vehicle entries
    EXIT = 'EXIT',             // Exit gate staff - handles deliveries
    SUPERVISOR = 'SUPERVISOR', // Full access - manages operations
    BILLING = 'BILLING',       // Billing counter - triggers mark-outs
}

/**
 * Permission matrix for staff roles
 */
export class StaffPermissions {
    private static readonly PERMISSIONS: Record<StaffRole, Set<string>> = {
        [StaffRole.ENTRY]: new Set([
            'vehicle.create',
            'vehicle.view',
            'zone.view',
            'valet.view',
        ]),
        [StaffRole.EXIT]: new Set([
            'vehicle.view',
            'vehicle.search',
            'vehicle.markDelivered',
            'vehicle.expedite',
            'markout.override',
        ]),
        [StaffRole.SUPERVISOR]: new Set([
            'vehicle.*',
            'valet.*',
            'zone.*',
            'staff.*',
            'reports.*',
            'markout.*',
        ]),
        [StaffRole.BILLING]: new Set([
            'vehicle.view',
            'markout.trigger',
        ]),
    };

    /**
     * Check if role has specific permission
     */
    static hasPermission(role: StaffRole, permission: string): boolean {
        const rolePermissions = this.PERMISSIONS[role];

        // Check for wildcard permissions (e.g., 'vehicle.*')
        const [resource, action] = permission.split('.');
        const wildcardPermission = `${resource}.*`;

        return (
            rolePermissions.has(permission) ||
            rolePermissions.has(wildcardPermission)
        );
    }

    /**
     * Get all permissions for a role
     */
    static getPermissions(role: StaffRole): string[] {
        return Array.from(this.PERMISSIONS[role]);
    }

    /**
     * Check if role can create vehicle entries
     */
    static canCreateVehicleEntry(role: StaffRole): boolean {
        return this.hasPermission(role, 'vehicle.create');
    }

    /**
     * Check if role can mark vehicle as delivered
     */
    static canMarkDelivered(role: StaffRole): boolean {
        return this.hasPermission(role, 'vehicle.markDelivered');
    }

    /**
     * Check if role can trigger mark-out requests
     */
    static canTriggerMarkOut(role: StaffRole): boolean {
        return this.hasPermission(role, 'markout.trigger');
    }

    /**
     * Check if role can access reports
     */
    static canAccessReports(role: StaffRole): boolean {
        return this.hasPermission(role, 'reports.*');
    }

    /**
     * Check if role is supervisor (full access)
     */
    static isSupervisor(role: StaffRole): boolean {
        return role === StaffRole.SUPERVISOR;
    }
}
