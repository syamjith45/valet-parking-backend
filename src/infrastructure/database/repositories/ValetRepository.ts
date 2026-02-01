import { PrismaClient } from '@prisma/client';
import { IValetRepository } from '../../../domain/interfaces/IValetRepository';
import { Valet } from '../../../domain/entities/Valet';
import { ValetStatus } from '../../../domain/value-objects/ValetStatus';

export class ValetRepository implements IValetRepository {
    constructor(private prisma: PrismaClient) { }

    async findById(id: string): Promise<Valet | null> {
        const valet = await this.prisma.valet.findUnique({
            where: { id },
        });
        return valet ? this.toDomain(valet) : null;
    }

    async findActive(): Promise<Valet[]> {
        const valets = await this.prisma.valet.findMany({
            where: { is_active: true },
            orderBy: { assignment_sequence: 'asc' },
        });
        return valets.map(v => this.toDomain(v));
    }

    async findAll(): Promise<Valet[]> {
        const valets = await this.prisma.valet.findMany({
            orderBy: { name: 'asc' }
        });
        return valets.map(v => this.toDomain(v));
    }

    async update(valet: Valet): Promise<Valet> {
        const updated = await this.prisma.valet.update({
            where: { id: valet.id },
            data: {
                status: valet.status,
                assignment_sequence: valet.assignmentSequence,
                today_count: valet.todayCount,
                total_count: valet.totalCount,
                updated_at: new Date(),
            },
        });
        return this.toDomain(updated);
    }

    async create(valet: Valet): Promise<Valet> {
        const created = await this.prisma.valet.create({
            data: {
                id: valet.id,
                name: valet.name,
                phone: valet.phone,
                employee_id: 'V' + Math.floor(Math.random() * 1000), // Simplified
                status: valet.status,
                assignment_sequence: valet.assignmentSequence,
                today_count: valet.todayCount,
                total_count: valet.totalCount,
                is_active: valet.isActive,
            },
        });
        return this.toDomain(created);
    }

    private toDomain(dbValet: any): Valet {
        return new Valet(
            dbValet.id,
            dbValet.name,
            dbValet.phone,
            dbValet.status as ValetStatus,
            dbValet.assignment_sequence,
            dbValet.today_count,
            dbValet.total_count,
            dbValet.employee_id,
            dbValet.shift_start,
            dbValet.shift_end,
            dbValet.is_active,
            dbValet.created_at,
            dbValet.updated_at
        );
    }
}
