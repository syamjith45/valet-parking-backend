import { GraphQLContext } from './context';

export const resolvers = {
    Query: {
        hello: () => 'Hello Valet Parking!',
        me: (_: any, __: any, context: GraphQLContext) => context.user || null,

        // Dashboard Stats
        dashboardStats: async (_: any, __: any, context: GraphQLContext) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [
                totalVehiclesInside,
                parkedCount,
                scheduledCount,
                onTheWayCount,
                deliveredToday,
                valets
            ] = await Promise.all([
                context.prisma.vehicles.count({ where: { state: { not: 'CLOSED' } } }),
                context.prisma.vehicles.count({ where: { state: 'PARKED' } }),
                context.prisma.vehicles.count({ where: { state: 'SCHEDULED' } }),
                context.prisma.vehicles.count({ where: { state: 'ON_THE_WAY' } }),
                context.prisma.vehicles.count({
                    where: {
                        state: 'CLOSED',
                        updated_at: { gte: today }
                    }
                }),
                context.prisma.valets.findMany() // Fetch all valets for stats calc
            ]);

            // Calculate valet stats
            const totalValets = valets.length;
            const freeValets = valets.filter((v: any) => v.status === 'FREE').length;
            const busyValets = valets.filter((v: any) => v.status === 'BUSY').length;
            const onBreak = valets.filter((v: any) => v.status === 'BREAK').length;

            const counts = valets.map((v: any) => v.today_count);
            const sum = counts.reduce((a: number, b: number) => a + b, 0);
            const avg = totalValets > 0 ? sum / totalValets : 0;
            const min = Math.min(...counts, 0);
            const max = Math.max(...counts, 0);

            return {
                totalVehiclesInside,
                parkedCount,
                scheduledCount,
                onTheWayCount,
                deliveredToday,
                avgExitTime: 15.0, // Placeholder calculation
                valetStats: {
                    totalValets,
                    freeValets,
                    busyValets,
                    onBreak,
                    avgCount: avg,
                    minCount: min,
                    maxCount: max,
                    variance: 0, // Placeholder
                    isBalanced: true // Placeholder
                }
            };
        },

        // Vehicle Queries
        vehicle: (_: any, { id }: { id: string }, context: GraphQLContext) => {
            return context.prisma.vehicles.findUnique({ where: { id } });
        },
        vehicles: async (_: any, { state, limit = 50, offset = 0 }: any, context: GraphQLContext) => {
            return context.prisma.vehicles.findMany({
                where: state ? { state } : undefined,
                take: limit,
                skip: offset,
                orderBy: { updated_at: 'desc' }
            });
        },
        searchVehicle: async (_: any, { input }: any, context: GraphQLContext) => {
            const { token, vehicleNumber, customerPhone } = input;
            return context.prisma.vehicles.findFirst({
                where: {
                    OR: [
                        { token },
                        { vehicle_number: vehicleNumber }, // Map from input to DB field
                        { customer_phone: customerPhone }
                    ]
                }
            });
        },

        // Valet Queries
        valet: (_: any, { id }: { id: string }, context: GraphQLContext) => {
            return context.prisma.valets.findUnique({ where: { id } });
        },
        valets: (_: any, { status }: { status?: any }, context: GraphQLContext) => {
            return context.prisma.valets.findMany({
                where: status ? { status } : undefined,
                orderBy: { name: 'asc' }
            });
        },
        valetAssignmentStats: async (_: any, __: any, context: GraphQLContext) => {
            // Re-using the same logic as dashboardStats ideally, 
            // but strictly implementing what's needed here to pass the query
            const valets = await context.prisma.valets.findMany();
            const counts = valets.map((v: any) => v.today_count);
            const sum = counts.reduce((a: number, b: number) => a + b, 0);

            return {
                totalValets: valets.length,
                freeValets: valets.filter((v: any) => v.status === 'FREE').length,
                busyValets: valets.filter((v: any) => v.status === 'BUSY').length,
                onBreak: valets.filter((v: any) => v.status === 'BREAK').length,
                avgCount: valets.length ? sum / valets.length : 0,
                minCount: Math.min(...counts, 0),
                maxCount: Math.max(...counts, 0),
                variance: 0,
                isBalanced: true
            };
        },

        // Zone Queries
        parkingZones: (_: any, __: any, context: GraphQLContext) => {
            return context.prisma.parking_zones.findMany({
                // orderBy: { priority: 'asc' } // priority is not in schema? Check schema.
            });
        },
        availableZone: (_: any, __: any, context: GraphQLContext) => {
            return context.prisma.parking_zones.findFirst({
                where: { available_slots: { gt: 0 } },
                // orderBy: { priority: 'asc' } 
            });
        }
    },

    Mutation: {
        createVehicleEntry: async (_: any, { input }: any, context: GraphQLContext) => {
            return context.useCases.createVehicleEntry.execute({
                ...input,
                entryOperatorId: context.user?.id || 'SYSTEM'
            });
        },
        markVehicleParked: async (_: any, { input }: any, context: GraphQLContext) => {
            return context.useCases.markVehicleParked.execute({
                vehicleId: input.vehicleId,
                valetId: context.user?.userType === 'VALET' ? context.user.id : undefined
            });
        },
        requestMarkOut: async (_: any, { input }: any, context: GraphQLContext) => {
            // Placeholder: Call use case or direct implementation
            // Assuming direct implementation for now as use case might be missing
            const vehicle = await context.prisma.vehicles.update({
                where: { id: input.vehicleId },
                data: {
                    state: 'WAITING_MARKOUT',
                    markout_requested_at: new Date(),
                    scheduled_at: input.selectedMinutes > 0
                        ? new Date(Date.now() + input.selectedMinutes * 60000)
                        : new Date()
                }
            });
            return vehicle;
        },
        startRetrieval: async (_: any, { input }: any, context: GraphQLContext) => {
            // Placeholder logic
            return context.prisma.vehicles.update({
                where: { id: input.vehicleId },
                data: {
                    state: 'ON_THE_WAY',
                    retrieval_started_at: new Date()
                }
            });
        },
        markVehicleDelivered: async (_: any, { input }: any, context: GraphQLContext) => {
            // Placeholder logic
            return context.prisma.vehicles.update({
                where: { id: input.vehicleId },
                data: {
                    state: 'DELIVERED',
                    delivered_at: new Date()
                }
            });
        },
        updateValetStatus: async (_: any, { input }: any, context: GraphQLContext) => {
            return context.prisma.valets.update({
                where: { id: input.valetId },
                data: { status: input.status }
            });
        },
        resetDailyCounters: async (_: any, __: any, context: GraphQLContext) => {
            // Simplified logic
            await context.prisma.valets.updateMany({ data: { today_count: 0 } });
            return true;
        },
        expediteRetrieval: async (_: any, { vehicleId }: any, context: GraphQLContext) => {
            // Placeholder
            return context.prisma.vehicles.findUnique({ where: { id: vehicleId } });
        }
    },

    // Type Resolvers
    Vehicle: {
        entryOperator: (parent: any, _: any, { loaders }: GraphQLContext) =>
            null, // No entry_operator_id in DB schema (checked schema.prisma)
        parkingValet: (parent: any, _: any, { loaders }: GraphQLContext) =>
            parent.parking_valet_id ? loaders.valetLoader.load(parent.parking_valet_id) : null,
        retrievalValet: (parent: any, _: any, { loaders }: GraphQLContext) =>
            parent.retrieval_valet_id ? loaders.valetLoader.load(parent.retrieval_valet_id) : null,
        arrivedAt: (parent: any) => parent.created_at, // Use created_at as arrived_at
        parkedAt: (parent: any) => parent.updated_at, // Proxy
        markoutRequestedAt: (parent: any) => parent.scheduled_at, // Proxy
        scheduledAt: (parent: any) => parent.scheduled_at,
        retrievalStartedAt: (parent: any) => parent.updated_at, // Proxy
        deliveredAt: (parent: any) => parent.updated_at, // Proxy
        closedAt: (parent: any) => parent.updated_at, // Proxy
        createdAt: (parent: any) => parent.created_at,
        updatedAt: (parent: any) => parent.updated_at,
        vehicleNumber: (parent: any) => parent.vehicle_number, // Map snake_case to camelCase
        customerPhone: (parent: any) => parent.customer_phone,
    },
    Valet: {
        employeeId: (parent: any) => parent.id, // Use ID as employeeId
        assignmentSequence: (parent: any) => parent.assignment_sequence,
        todayCount: (parent: any) => parent.today_count,
        totalCount: (parent: any) => parent.total_count,
        shiftStart: (parent: any) => '09:00', // Mock
        shiftEnd: (parent: any) => '18:00', // Mock
        isActive: (parent: any) => parent.is_active,
        createdAt: (parent: any) => parent.created_at,
        updatedAt: (parent: any) => parent.updated_at,
        canBeAssigned: (parent: any) => parent.status === 'FREE' && parent.is_active,
        isInShift: () => true // Placeholder
    },
    ParkingZone: {
        zoneCode: (parent: any) => parent.zone_code,
        // zoneName: (parent: any) => parent.zone_code, // DB schema doesn't have zone_name
        // zoneDescription: (parent: any) => '', // DB schema doesn't have zone_description
        totalSlots: (parent: any) => parent.total_slots,
        availableSlots: (parent: any) => parent.available_slots,
        isActive: (parent: any) => parent.is_active,
        createdAt: (parent: any) => parent.created_at,
        occupancyRate: (parent: any) => {
            if (parent.total_slots === 0) return 0;
            return ((parent.total_slots - parent.available_slots) / parent.total_slots) * 100;
        }
    }
};
