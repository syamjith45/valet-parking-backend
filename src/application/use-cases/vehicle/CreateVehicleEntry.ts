import { Vehicle } from '../../../domain/entities/Vehicle';
import { IVehicleRepository } from '../../../domain/interfaces/IVehicleRepository';
import { IParkingZoneRepository } from '../../../domain/interfaces/IParkingZoneRepository';
import { AssignValetRoundRobinUseCase, AssignmentType } from '../valet/AssignValetRoundRobin';
import { WhatsAppService } from '../../../infrastructure/external-services/whatsapp/WhatsAppService';
import { StateTransitionService } from '../../services/StateTransitionService';
import { VehicleState } from '../../../domain/value-objects/VehicleState';
import * as crypto from 'crypto';

/**
 * DTO for creating vehicle entry
 */
export interface CreateVehicleEntryDTO {
    vehicleNumber: string;
    customerPhone: string;
    customerType?: string;
    entryOperatorId: string;
}

/**
 * Response DTO
 */
export interface VehicleEntryResponse {
    vehicle: Vehicle;
    token: string;
    zone: string;
    slot: string;
    assignedValet: {
        id: string;
        name: string;
    };
}

/**
 * Use Case: Create Vehicle Entry
 * 
 * This is the entry point of the entire valet parking flow.
 * 
 * Workflow:
 * 1. Validate input
 * 2. Find available parking zone
 * 3. Assign parking valet (round-robin)
 * 4. Generate unique token
 * 5. Create vehicle record
 * 6. Send WhatsApp token message
 * 7. Log state transition
 * 8. Return result
 */
export class CreateVehicleEntryUseCase {
    constructor(
        private vehicleRepository: IVehicleRepository,
        private parkingZoneRepository: IParkingZoneRepository,
        private assignValetUseCase: AssignValetRoundRobinUseCase,
        private whatsAppService: WhatsAppService,
        private stateTransitionService: StateTransitionService
    ) { }

    async execute(dto: CreateVehicleEntryDTO): Promise<VehicleEntryResponse> {
        // Step 1: Validate input
        this.validateInput(dto);

        // Step 2: Check for duplicate entry (same vehicle already inside)
        await this.checkDuplicateEntry(dto.vehicleNumber);

        // Step 3: Find available parking zone (prioritized by priority field)
        const zone = await this.parkingZoneRepository.findAvailableZone();
        if (!zone) {
            throw new Error('No parking slots available. All zones are full.');
        }

        // Step 4: Assign parking valet using round-robin
        const valet = await this.assignValetUseCase.execute(AssignmentType.PARKING);

        // Step 5: Generate unique token
        const token = this.generateToken();

        // Step 6: Allocate specific slot in zone (simplified - could be more sophisticated)
        const slot = this.allocateSlot(zone.zoneCode);

        // Step 7: Create vehicle entity
        const vehicle = new Vehicle(
            crypto.randomUUID(), // Generate UUID
            token,
            this.normalizeVehicleNumber(dto.vehicleNumber),
            this.normalizePhoneNumber(dto.customerPhone),
            zone.zoneCode,
            slot,
            VehicleState.PARKING,
            dto.customerType,
            new Date(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            dto.entryOperatorId,
            valet.id,
            undefined
        );

        // Step 8: Persist vehicle
        const savedVehicle = await this.vehicleRepository.create(vehicle);

        // Step 9: Update zone availability
        await this.parkingZoneRepository.decrementAvailableSlots(zone.id);

        // Step 10: Send WhatsApp token message
        try {
            await this.whatsAppService.sendTokenMessage({
                phoneNumber: dto.customerPhone,
                token,
                vehicleNumber: this.normalizeVehicleNumber(dto.vehicleNumber),
                zone: zone.zoneCode, // zone.zoneName might not exist on entity yet, safe fallback
                slot,
            });
        } catch (error) {
            // Log error but don't fail the entire operation
            console.error('Failed to send WhatsApp token message:', error);
            // TODO: Add to retry queue
        }

        // Step 11: Log state transition
        await this.stateTransitionService.logTransition({
            vehicleId: savedVehicle.id,
            fromState: null,
            toState: VehicleState.PARKING,
            triggeredBy: 'OPERATOR',
            triggeredById: dto.entryOperatorId,
            metadata: {
                zone: zone.zoneCode,
                slot,
                valetId: valet.id,
                valetName: valet.name,
            },
        });

        // Step 12: Return response
        return {
            vehicle: savedVehicle,
            token,
            zone: zone.zoneCode,
            slot,
            assignedValet: {
                id: valet.id,
                name: valet.name,
            },
        };
    }

    /**
     * Validate input data
     */
    private validateInput(dto: CreateVehicleEntryDTO): void {
        if (!dto.vehicleNumber || dto.vehicleNumber.trim().length === 0) {
            throw new Error('Vehicle number is required');
        }

        if (!dto.customerPhone || dto.customerPhone.trim().length === 0) {
            throw new Error('Customer phone is required');
        }

        // Validate Indian phone number format
        const phoneRegex = /^[6-9]\d{9}$/;
        const cleanPhone = dto.customerPhone.replace(/\D/g, '');

        if (!phoneRegex.test(cleanPhone)) {
            throw new Error('Invalid phone number. Must be a valid 10-digit Indian mobile number.');
        }

        if (!dto.entryOperatorId) {
            throw new Error('Entry operator ID is required');
        }
    }

    /**
     * Check if vehicle is already parked (duplicate entry prevention)
     */
    private async checkDuplicateEntry(vehicleNumber: string): Promise<void> {
        const normalizedNumber = this.normalizeVehicleNumber(vehicleNumber);
        const existingVehicle = await this.vehicleRepository.findActiveByVehicleNumber(
            normalizedNumber
        );

        if (existingVehicle) {
            throw new Error(
                `Vehicle ${normalizedNumber} is already parked. ` +
                `Token: ${existingVehicle.token}, State: ${existingVehicle.state}`
            );
        }
    }

    /**
     * Generate unique token (VLT-XXXX format)
     */
    private generateToken(): string {
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `VLT-${timestamp}${random}`.slice(0, 12); // Ensure max 12 chars
    }

    /**
     * Allocate slot in zone
     * (Simplified - in production, track individual slots in database)
     */
    private allocateSlot(zoneCode: string): string {
        const slotNumber = Math.floor(Math.random() * 100) + 1; // Simplified
        return `${slotNumber}`;
    }

    /**
     * Normalize vehicle number (remove spaces, uppercase)
     */
    private normalizeVehicleNumber(vehicleNumber: string): string {
        return vehicleNumber
            .replace(/\s+/g, '')
            .toUpperCase()
            .trim();
    }

    /**
     * Normalize phone number (remove country code, spaces, hyphens)
     */
    private normalizePhoneNumber(phone: string): string {
        let cleaned = phone.replace(/\D/g, ''); // Remove all non-digits

        // Remove country code if present (+91 or 91)
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            cleaned = cleaned.slice(2);
        }

        return cleaned;
    }

    /**
     * Get statistics for monitoring
     */
    async getEntryStats(date?: Date): Promise<EntryStats> {
        const targetDate = date || new Date();
        const vehicles = await this.vehicleRepository.findByDate(targetDate);

        return {
            totalEntries: vehicles.length,
            parkedCount: vehicles.filter((v) => v.state === VehicleState.PARKED).length,
            parkingCount: vehicles.filter((v) => v.state === VehicleState.PARKING).length,
            peakHours: this.calculatePeakHours(vehicles),
        };
    }

    /**
     * Calculate peak hours (simplified)
     */
    private calculatePeakHours(vehicles: Vehicle[]): string {
        const hourCounts: Record<number, number> = {};

        vehicles.forEach((v) => {
            const hour = v.arrivedAt.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(hourCounts));
        const peakHours = Object.entries(hourCounts)
            .filter(([_, count]) => count === maxCount)
            .map(([hour]) => `${hour}:00`);

        return peakHours.join(', ');
    }
}

/**
 * Entry Statistics Interface
 */
export interface EntryStats {
    totalEntries: number;
    parkedCount: number;
    parkingCount: number;
    peakHours: string;
}
