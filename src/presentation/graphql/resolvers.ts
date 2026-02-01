import { GraphQLContext } from './context';

export const resolvers = {
    Query: {
        hello: () => 'Hello Valet Parking!',
        me: (_: any, __: any, context: GraphQLContext) => context.user || null,
        dashboardStats: () => ({
            totalVehiclesInside: 10,
            parkedCount: 5,
            scheduledCount: 2,
            onTheWayCount: 1,
            deliveredToday: 20,
            avgExitTime: 12.5,
            valetStats: {
                totalValets: 5,
                freeValets: 2,
                busyValets: 2,
                onBreak: 1,
                avgCount: 4.0,
                minCount: 3,
                maxCount: 5,
                variance: 2,
                isBalanced: true
            }
        }),
        vehicles: async (_: any, args: any, context: GraphQLContext) => {
            // Placeholder
            return [];
        }
    },
    Mutation: {
        createVehicleEntry: async (_: any, { input }: any, context: GraphQLContext) => {
            // Implement using context.useCases.createVehicleEntry
            return context.useCases.createVehicleEntry.execute({
                ...input,
                entryOperatorId: context.user?.id || 'SYSTEM' // Fallback for now
            });
        }
    }
};
