import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar Time

  # Vehicle Types
  type Vehicle {
    id: ID!
    token: String!
    vehicleNumber: String!
    customerPhone: String!
    customerType: String
    zone: String!
    slot: String!
    state: VehicleState!
    arrivedAt: DateTime!
    parkedAt: DateTime
    markoutRequestedAt: DateTime
    scheduledAt: DateTime
    retrievalStartedAt: DateTime
    deliveredAt: DateTime
    closedAt: DateTime
    
    # Relations
    entryOperator: Staff
    parkingValet: Valet
    retrievalValet: Valet
    markoutRequests: [MarkOutRequest!]!
    
    # Computed fields
    totalDuration: Int
    retrievalDuration: Int
    isOverdue: Boolean!
    
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum VehicleState {
    PARKING
    PARKED
    WAITING_MARKOUT
    SCHEDULED
    RETRIEVAL_ASSIGNED
    ON_THE_WAY
    DELIVERED
    CLOSED
  }

  # Valet Types
  type Valet {
    id: ID!
    name: String!
    phone: String!
    employeeId: String
    status: ValetStatus!
    assignmentSequence: Int!
    todayCount: Int!
    totalCount: Int!
    shiftStart: Time
    shiftEnd: Time
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Relations
    currentAssignments: [Vehicle!]!
    
    # Computed
    canBeAssigned: Boolean!
    isInShift: Boolean!
  }

  enum ValetStatus {
    FREE
    BUSY
    BREAK
    OFF_DUTY
  }

  # Staff Types
  type Staff {
    id: ID!
    name: String!
    phone: String!
    email: String
    role: StaffRole!
    isActive: Boolean!
    lastLoginAt: DateTime
    createdAt: DateTime!
  }

  enum StaffRole {
    ENTRY
    EXIT
    SUPERVISOR
    BILLING
  }

  # Parking Zone Types
  type ParkingZone {
    id: ID!
    zoneCode: String!
    zoneName: String
    zoneDescription: String
    totalSlots: Int!
    availableSlots: Int!
    priority: Int!
    isActive: Boolean!
    createdAt: DateTime!
    
    # Computed
    occupancyRate: Float!
  }

  # Mark-Out Request Types
  type MarkOutRequest {
    id: ID!
    vehicleId: ID!
    selectedMinutes: Int!
    retrieveAt: DateTime!
    source: MarkOutSource!
    isActive: Boolean!
    requestedAt: DateTime!
    
    # Relations
    vehicle: Vehicle!
  }

  enum MarkOutSource {
    WHATSAPP
    OPERATOR
    DEFAULT
  }

  # Input Types
  input CreateVehicleEntryInput {
    vehicleNumber: String!
    customerPhone: String!
    customerType: String
  }

  input MarkVehicleParkedInput {
    vehicleId: ID!
  }

  input RequestMarkOutInput {
    vehicleId: ID
    token: String
    customerPhone: String
    selectedMinutes: Int!
  }

  input StartRetrievalInput {
    vehicleId: ID!
  }

  input MarkVehicleDeliveredInput {
    vehicleId: ID!
  }

  input UpdateValetStatusInput {
    valetId: ID!
    status: ValetStatus!
  }

  input SearchVehicleInput {
    token: String
    vehicleNumber: String
    customerPhone: String
  }

  # Response Types
  type VehicleEntryResponse {
    vehicle: Vehicle!
    token: String!
    zone: String!
    slot: String!
    assignedValet: ValetInfo!
  }

  type ValetInfo {
    id: ID!
    name: String!
  }

  type ValetAssignmentStats {
    totalValets: Int!
    freeValets: Int!
    busyValets: Int!
    onBreak: Int!
    avgCount: Float!
    minCount: Int!
    maxCount: Int!
    variance: Int!
    isBalanced: Boolean!
  }

  type DashboardStats {
    totalVehiclesInside: Int!
    parkedCount: Int!
    scheduledCount: Int!
    onTheWayCount: Int!
    deliveredToday: Int!
    avgExitTime: Float!
    valetStats: ValetAssignmentStats!
  }

  # Queries
  type Query {
    # Vehicle queries
    vehicle(id: ID!): Vehicle
    vehicles(
      state: VehicleState
      limit: Int
      offset: Int
    ): [Vehicle!]!
    searchVehicle(input: SearchVehicleInput!): Vehicle
    
    # Valet queries
    valet(id: ID!): Valet
    valets(status: ValetStatus): [Valet!]!
    valetAssignmentStats: ValetAssignmentStats!
    
    # Zone queries
    parkingZones: [ParkingZone!]!
    availableZone: ParkingZone
    
    # Dashboard
    dashboardStats: DashboardStats!
    
    # Me (current user)
    me: Staff!
  }

  # Mutations
  type Mutation {
    # Vehicle operations
    createVehicleEntry(input: CreateVehicleEntryInput!): VehicleEntryResponse!
    markVehicleParked(input: MarkVehicleParkedInput!): Vehicle!
    requestMarkOut(input: RequestMarkOutInput!): Vehicle!
    startRetrieval(input: StartRetrievalInput!): Vehicle!
    markVehicleDelivered(input: MarkVehicleDeliveredInput!): Vehicle!
    
    # Valet operations
    updateValetStatus(input: UpdateValetStatusInput!): Valet!
    
    # Emergency operations (Supervisor only)
    resetDailyCounters: Boolean!
    expediteRetrieval(vehicleId: ID!): Vehicle!
  }

  # Subscriptions (for real-time updates)
  type Subscription {
    vehicleStateChanged(token: String): Vehicle!
    dashboardUpdated: DashboardStats!
    valetAssigned(valetId: ID): Valet!
  }
`;
