import { Valet } from '../../../domain/entities/Valet';
import { IValetRepository } from '../../../domain/interfaces/IValetRepository';
import { ValetStatus } from '../../../domain/value-objects/ValetStatus';

/**
 * Assignment Type
 */
export enum AssignmentType {
    PARKING = 'PARKING',
    RETRIEVAL = 'RETRIEVAL',
}

/**
 * Use Case: Assign Valet Round-Robin
 * 
 * Implements the fair, automatic valet assignment algorithm.
 * Ensures all valets get equal opportunity (±1-2 vehicles).
 * 
 * Algorithm:
 * 1. Get all active valets in shift
 * 2. Filter by status (FREE)
 * 3. Sort by assignment_sequence (lowest first)
 * 4. Pick the first one
 * 5. Increment their sequence
 * 6. Update their status to BUSY
 */
export class AssignValetRoundRobinUseCase {
    constructor(private valetRepository: IValetRepository) { }

    async execute(assignmentType: AssignmentType): Promise<Valet> {
        // Step 1: Get all active valets
        const allValets = await this.valetRepository.findActive();

        if (allValets.length === 0) {
            throw new Error('No active valets available');
        }

        // Step 2: Filter valets who can be assigned
        const availableValets = allValets.filter((valet) => valet.canBeAssigned());

        if (availableValets.length === 0) {
            throw this.createNoAvailableValetsError(allValets);
        }

        // Step 3: Sort by assignment sequence (lowest first for fairness)
        availableValets.sort((a, b) => a.assignmentSequence - b.assignmentSequence);

        // If multiple valets have the same sequence, sort by todayCount
        // This handles edge cases where sequences are equal
        const lowestSequence = availableValets[0].assignmentSequence;
        const candidateValets = availableValets.filter(
            (v) => v.assignmentSequence === lowestSequence
        );

        if (candidateValets.length > 1) {
            candidateValets.sort((a, b) => a.todayCount - b.todayCount);
        }

        // Step 4: Pick the first valet (fairest choice)
        const selectedValet = candidateValets[0];

        // Step 5: Assign the task (updates sequence, count, status)
        selectedValet.assignTask();

        // Step 6: Persist changes
        await this.valetRepository.update(selectedValet);

        // Log for monitoring
        this.logAssignment(selectedValet, assignmentType, availableValets.length);

        return selectedValet;
    }

    /**
     * Get assignment statistics for monitoring/dashboard
     */
    async getAssignmentStats(): Promise<ValetAssignmentStats> {
        const allValets = await this.valetRepository.findActive();

        const totalValets = allValets.length;
        const freeValets = allValets.filter((v) => v.status === ValetStatus.FREE).length;
        const busyValets = allValets.filter((v) => v.status === ValetStatus.BUSY).length;
        const onBreak = allValets.filter((v) => v.status === ValetStatus.BREAK).length;

        const todayCounts = allValets.map((v) => v.todayCount);
        const avgCount = todayCounts.reduce((a, b) => a + b, 0) / totalValets;
        const minCount = Math.min(...todayCounts);
        const maxCount = Math.max(...todayCounts);
        const variance = maxCount - minCount;

        return {
            totalValets,
            freeValets,
            busyValets,
            onBreak,
            avgCount: Math.round(avgCount * 10) / 10,
            minCount,
            maxCount,
            variance,
            isBalanced: variance <= 2, // ±2 vehicle threshold
        };
    }

    /**
     * Reset daily counters for all valets (called at shift start)
     */
    async resetDailyCounters(): Promise<void> {
        const allValets = await this.valetRepository.findAll();

        for (const valet of allValets) {
            valet.resetDailyCounters();
            await this.valetRepository.update(valet);
        }

        console.log(`Daily counters reset for ${allValets.length} valets`);
    }

    /**
     * Force reassign if a valet becomes unavailable
     */
    async reassignFromValet(valetId: string, assignmentType: AssignmentType): Promise<Valet> {
        // Get the current valet to see their workload
        const currentValet = await this.valetRepository.findById(valetId);

        if (currentValet) {
            // Decrement their count since task is being reassigned
            currentValet.todayCount = Math.max(0, currentValet.todayCount - 1);
            currentValet.assignmentSequence = Math.max(0, currentValet.assignmentSequence - 1);
            await this.valetRepository.update(currentValet);
        }

        // Assign to next available valet
        return this.execute(assignmentType);
    }

    /**
     * Create detailed error when no valets available
     */
    private createNoAvailableValetsError(allValets: Valet[]): Error {
        const statusBreakdown = {
            FREE: allValets.filter((v) => v.status === ValetStatus.FREE).length,
            BUSY: allValets.filter((v) => v.status === ValetStatus.BUSY).length,
            BREAK: allValets.filter((v) => v.status === ValetStatus.BREAK).length,
            OFF_DUTY: allValets.filter((v) => v.status === ValetStatus.OFF_DUTY).length,
        };

        const outOfShift = allValets.filter((v) => !v.isInShift()).length;

        return new Error(
            `No available valets for assignment. ` +
            `Status breakdown: ${JSON.stringify(statusBreakdown)}. ` +
            `Out of shift: ${outOfShift}. ` +
            `Please ensure at least one valet is FREE and in shift.`
        );
    }

    /**
     * Log assignment for monitoring
     */
    private logAssignment(
        valet: Valet,
        assignmentType: AssignmentType,
        availableCount: number
    ): void {
        console.log(
            `[VALET ASSIGNMENT] Type: ${assignmentType}, ` +
            `Assigned: ${valet.name} (ID: ${valet.id}), ` +
            `Sequence: ${valet.assignmentSequence}, ` +
            `Today Count: ${valet.todayCount}, ` +
            `Available Valets: ${availableCount}`
        );
    }
}

/**
 * Assignment Statistics Interface
 */
export interface ValetAssignmentStats {
    totalValets: number;
    freeValets: number;
    busyValets: number;
    onBreak: number;
    avgCount: number;
    minCount: number;
    maxCount: number;
    variance: number;
    isBalanced: boolean;
}
