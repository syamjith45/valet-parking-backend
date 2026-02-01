import { Valet } from '../entities/Valet';

export interface IValetRepository {
    /**
     * Find a valet by ID
     */
    findById(id: string): Promise<Valet | null>;

    /**
     * Find all valets who are marked as active (employed)
     */
    findActive(): Promise<Valet[]>;

    /**
     * Find all valets (including inactive)
     */
    findAll(): Promise<Valet[]>;

    /**
     * Update a valet's state (status, counts, etc.)
     */
    update(valet: Valet): Promise<Valet>;

    /**
     * Create a new valet
     */
    create(valet: Valet): Promise<Valet>;
}
