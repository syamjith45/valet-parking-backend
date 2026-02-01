/**
 * Valet Status Value Object
 * 
 * Represents the current availability status of a valet driver.
 */

export enum ValetStatus {
    FREE = 'FREE',           // Available for assignment
    BUSY = 'BUSY',           // Currently handling a task
    BREAK = 'BREAK',         // On break, do not assign
    OFF_DUTY = 'OFF_DUTY',   // Not in shift
}

/**
 * Business rules for valet status
 */
export class ValetStatusRules {
    /**
     * Check if valet can be assigned a task
     */
    static canBeAssigned(status: ValetStatus): boolean {
        return status === ValetStatus.FREE;
    }

    /**
     * Get all statuses that allow assignment
     */
    static getAssignableStatuses(): ValetStatus[] {
        return [ValetStatus.FREE];
    }

    /**
     * Validate status transition
     */
    static isValidTransition(from: ValetStatus, to: ValetStatus): boolean {
        // All transitions are valid, but we track them for audit
        return true;
    }

    /**
     * Get next status after task assignment
     */
    static getStatusAfterAssignment(): ValetStatus {
        return ValetStatus.BUSY;
    }

    /**
     * Get next status after task completion
     */
    static getStatusAfterCompletion(): ValetStatus {
        return ValetStatus.FREE;
    }
}
