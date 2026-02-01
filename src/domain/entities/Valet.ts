import { ValetStatus, ValetStatusRules } from '../value-objects/ValetStatus';

/**
 * Valet Entity
 * 
 * Represents a valet driver in the parking system.
 * Contains business logic for assignment and task management.
 */
export class Valet {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly phone: string,
        public status: ValetStatus,
        public assignmentSequence: number = 0,
        public todayCount: number = 0,
        public totalCount: number = 0,
        public readonly employeeId?: string,
        public readonly shiftStart?: Date,
        public readonly shiftEnd?: Date,
        public readonly isActive: boolean = true,
        public readonly createdAt: Date = new Date(),
        public updatedAt: Date = new Date(),
    ) { }

    /**
     * Business Logic: Check if valet can be assigned
     */
    canBeAssigned(): boolean {
        return (
            this.isActive &&
            ValetStatusRules.canBeAssigned(this.status) &&
            this.isInShift()
        );
    }

    /**
     * Business Logic: Check if valet is in their shift time
     */
    isInShift(): boolean {
        if (!this.shiftStart || !this.shiftEnd) {
            return true; // No shift restrictions
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

        const shiftStartMinutes = this.shiftStart.getHours() * 60 + this.shiftStart.getMinutes();
        const shiftEndMinutes = this.shiftEnd.getHours() * 60 + this.shiftEnd.getMinutes();

        // Handle overnight shifts
        if (shiftEndMinutes < shiftStartMinutes) {
            return currentTime >= shiftStartMinutes || currentTime <= shiftEndMinutes;
        }

        return currentTime >= shiftStartMinutes && currentTime <= shiftEndMinutes;
    }

    /**
     * Business Logic: Assign task to valet
     */
    assignTask(): void {
        if (!this.canBeAssigned()) {
            throw new Error(`Valet ${this.name} cannot be assigned. Status: ${this.status}`);
        }

        this.status = ValetStatusRules.getStatusAfterAssignment();
        this.assignmentSequence += 1;
        this.todayCount += 1;
        this.totalCount += 1;
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Complete task and mark valet as free
     */
    completeTask(): void {
        if (this.status !== ValetStatus.BUSY) {
            throw new Error(`Cannot complete task. Valet status: ${this.status}`);
        }

        this.status = ValetStatusRules.getStatusAfterCompletion();
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Put valet on break
     */
    takeBreak(): void {
        if (this.status === ValetStatus.BUSY) {
            throw new Error('Cannot take break while busy with a task');
        }

        this.status = ValetStatus.BREAK;
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Return from break
     */
    returnFromBreak(): void {
        if (this.status !== ValetStatus.BREAK) {
            throw new Error(`Valet is not on break. Current status: ${this.status}`);
        }

        this.status = ValetStatus.FREE;
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Mark as off duty
     */
    goOffDuty(): void {
        if (this.status === ValetStatus.BUSY) {
            throw new Error('Cannot go off duty while busy with a task');
        }

        this.status = ValetStatus.OFF_DUTY;
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Start duty
     */
    startDuty(): void {
        if (this.status !== ValetStatus.OFF_DUTY) {
            throw new Error(`Valet is not off duty. Current status: ${this.status}`);
        }

        this.status = ValetStatus.FREE;
        this.updatedAt = new Date();
    }

    /**
     * Business Logic: Reset daily counters (called at shift start/day start)
     */
    resetDailyCounters(): void {
        this.assignmentSequence = 0;
        this.todayCount = 0;
        this.updatedAt = new Date();
    }

    /**
     * Get workload score for fair assignment (lower is better)
     */
    getWorkloadScore(): number {
        return this.assignmentSequence;
    }

    /**
     * Check if valet is overworked compared to others
     */
    isOverworked(averageCount: number, threshold: number = 2): boolean {
        return this.todayCount > averageCount + threshold;
    }
}
