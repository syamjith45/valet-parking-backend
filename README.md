# valet-parking-backend

# Valet Parking Backend - Complete Architecture & Implementation Guide

## 📋 Overview

A production-ready backend system for valet parking management at high-footfall wedding collection cloth shops. Built with **Clean Architecture**, **GraphQL**, and **Node.js/TypeScript**.

### Key Features
- 🎯 **Round-Robin Valet Assignment** - Fair, automatic task distribution
- 📱 **WhatsApp Integration** - Customer communication via WhatsApp Business API
- ⏰ **Smart Mark-Out System** - Car called 5-7 minutes before billing ends
- 🔐 **Supabase Authentication** - Phone OTP-based auth with JWT
- 🔄 **Real-time Updates** - Socket.io for live dashboard
- 📊 **Complete Audit Trail** - Every state change logged
- 🏗️ **Clean Architecture** - Scalable, testable, maintainable

---

## 📚 Documentation Index

This package contains:

1. **SYSTEM_DESIGN.md** - High-level architecture, workflows, and data flow
2. **PROJECT_STRUCTURE.md** - Complete folder structure with design patterns
3. **2_DAY_IMPLEMENTATION_GUIDE.md** - Step-by-step implementation plan
4. **valet-parking-backend/** - Complete codebase with all files

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (Supabase recommended)
- Twilio account (for WhatsApp)
- Supabase project

### Installation

```bash
# 1. Navigate to project
cd valet-parking-backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 4. Setup database
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
```

Server will start at `http://localhost:4000`

---

## 🏗️ Architecture Overview

### Layers (Clean Architecture)

```
Presentation Layer (API)
    ↓
Application Layer (Use Cases)
    ↓
Domain Layer (Business Logic)
    ↓
Infrastructure Layer (Database, External Services)
```

### Key Design Principles

1. **Dependency Injection** - All use cases receive dependencies
2. **Repository Pattern** - Abstract database operations
3. **Domain Entities** - Business logic in entity methods
4. **Value Objects** - Immutable, validated data structures
5. **DataLoader** - Prevents N+1 query problem in GraphQL

---

## 🔑 Authentication Flow

### 1. Login (Phone OTP)
```http
POST /api/auth/login
{
  "phone": "+919876543210"
}
```

### 2. Verify OTP
```http
POST /api/auth/verify
{
  "phone": "+919876543210",
  "otp": "123456"
}

Response:
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "role": "ENTRY"
  }
}
```

### 3. Use Token
```http
POST /graphql
Headers:
  Authorization: Bearer eyJhbG...

Body:
{
  "query": "query { me { name role } }"
}
```

---

## 📊 Core Workflows

### 1. Vehicle Entry Flow

```graphql
mutation CreateVehicleEntry {
  createVehicleEntry(input: {
    vehicleNumber: "KL07AB1234"
    customerPhone: "9876543210"
    customerType: "BRIDE"
  }) {
    vehicle {
      id
      token
      state
    }
    zone
    slot
    assignedValet {
      id
      name
    }
  }
}
```

**What Happens**:
1. System finds available parking zone
2. Assigns valet using round-robin algorithm
3. Generates unique token
4. Sends WhatsApp message to customer
5. Logs state transition

### 2. Mark Vehicle Parked

```graphql
mutation MarkParked {
  markVehicleParked(input: {
    vehicleId: "uuid"
  }) {
    id
    state
    parkedAt
  }
}
```

**What Happens**:
1. Updates vehicle state to PARKED
2. Frees up valet
3. Logs transition

### 3. Mark-Out Request (Critical!)

```graphql
mutation RequestMarkOut {
  requestMarkOut(input: {
    token: "VLT-0234"
    selectedMinutes: 5
  }) {
    id
    state
    scheduledAt
    retrievalValet {
      id
      name
    }
  }
}
```

**What Happens**:
1. Schedules retrieval (NOW + 5 minutes)
2. Assigns retrieval valet (round-robin)
3. Updates state to SCHEDULED
4. Notifies valet in advance

### 4. Start Retrieval

```graphql
mutation StartRetrieval {
  startRetrieval(input: {
    vehicleId: "uuid"
  }) {
    id
    state
    retrievalStartedAt
  }
}
```

**What Happens**:
1. Updates state to ON_THE_WAY
2. Sends WhatsApp "car on the way"
3. Starts retrieval timer

### 5. Mark Delivered

```graphql
mutation MarkDelivered {
  markVehicleDelivered(input: {
    vehicleId: "uuid"
  }) {
    id
    state
    deliveredAt
    totalDuration
  }
}
```

**What Happens**:
1. Updates state to DELIVERED
2. Sends WhatsApp confirmation request
3. Logs completion

---

## 🎯 Round-Robin Assignment Algorithm

### How It Works

```typescript
// 1. Get all active valets in shift
const valets = await getActiveValets();

// 2. Filter by status (FREE)
const available = valets.filter(v => v.status === 'FREE');

// 3. Sort by assignment_sequence (lowest first)
available.sort((a, b) => a.assignmentSequence - b.assignmentSequence);

// 4. Pick the first one (fairest)
const selectedValet = available[0];

// 5. Increment their sequence
selectedValet.assignmentSequence += 1;
selectedValet.todayCount += 1;
selectedValet.status = 'BUSY';

// 6. Save changes
await updateValet(selectedValet);
```

### Fairness Guarantee
- All valets get ±1-2 vehicle variance
- Automatic skip if on BREAK or OFF_DUTY
- Transparent dashboard shows distribution
- Daily reset at shift start

---

## 🔒 Role-Based Access Control

| Role       | Permissions                                    |
|------------|------------------------------------------------|
| ENTRY      | Create vehicle entries, view zones             |
| EXIT       | Search vehicles, mark delivered, override      |
| VALET      | View assigned tasks, update status             |
| SUPERVISOR | Full access, reports, configuration            |
| BILLING    | Trigger mark-out requests                      |

### Permission Check in Resolvers

```typescript
const resolver = {
  Mutation: {
    createVehicleEntry: async (_: any, { input }, context) => {
      // Check authentication
      requireAuth(context);
      
      // Check role
      requireRole(context, ['ENTRY', 'SUPERVISOR']);
      
      // Execute use case
      return context.useCases.createVehicleEntry.execute(input);
    },
  },
};
```

---

## 📡 WhatsApp Integration

### Message Templates

1. **Token Message** (Entry)
```
🚗 Valet Parking – Wedding Centre

Your vehicle has been parked safely.

🧾 Token: VLT-0234
🚘 Vehicle: KL 07 AB 1234
📍 Zone: B | Slot: 18

Please keep this message for vehicle retrieval.
```

2. **Mark-Out Request** (Before Billing)
```
🚗 Valet Parking – Wedding Centre

You are nearing billing.
When should we bring your vehicle?

[5 Minutes] [7 Minutes] [10 Minutes]
```

3. **On The Way** (Retrieval Started)
```
🚗 Your vehicle is on the way!

🧾 Token: VLT-0234
⏳ ETA: 2–3 minutes

Please wait near the valet exit.
```

4. **Thank You** (After Delivery)
```
✅ Vehicle delivered successfully.

Thank you for using our valet service 🙏
We wish you a safe and pleasant journey.
```

---

## 🧪 Testing

### Manual Testing with Apollo Studio

1. Start server: `npm run dev`
2. Open: `http://localhost:4000/graphql`
3. Login to get JWT token
4. Set Authorization header
5. Run mutations

### Example Test Flow

```graphql
# 1. Check authentication
query {
  me {
    id
    name
    role
  }
}

# 2. Create vehicle entry
mutation {
  createVehicleEntry(input: {
    vehicleNumber: "KL07AB1234"
    customerPhone: "9876543210"
  }) {
    vehicle { id token }
    assignedValet { name }
  }
}

# 3. Check valet assignment
query {
  valets {
    name
    status
    todayCount
    assignmentSequence
  }
}

# 4. Mark vehicle parked
mutation {
  markVehicleParked(input: {
    vehicleId: "uuid-from-step-2"
  }) {
    state
    parkedAt
  }
}
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check Supabase connection
npx prisma studio

# Regenerate client
npx prisma generate
```

### Authentication Not Working
```bash
# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Check staff record has auth_user_id
```

### WhatsApp Messages Not Sending
```bash
# Check Twilio credentials
echo $TWILIO_ACCOUNT_SID

# Test with Twilio console first
```

---

## 📈 Monitoring & Metrics

### Key Metrics to Track

1. **Operational**:
   - Average exit time
   - Peak hours
   - Vehicles inside (current)

2. **Valet Performance**:
   - Task distribution (variance)
   - Average retrieval time
   - Completion rate

3. **System Health**:
   - API response times
   - WhatsApp delivery rate
   - Error rate by endpoint

### Dashboard Stats Query

```graphql
query DashboardStats {
  dashboardStats {
    totalVehiclesInside
    parkedCount
    scheduledCount
    onTheWayCount
    deliveredToday
    avgExitTime
    valetStats {
      totalValets
      freeValets
      busyValets
      isBalanced
      variance
    }
  }
}
```

---

## 🚢 Deployment

### Environment-specific Configuration

**Development**:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

**Production**:
```bash
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://your-domain.com
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
```

### Deploy to Railway/Render

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

---

## 🔐 Security Checklist

- [x] All endpoints require JWT authentication
- [x] Role-based access control implemented
- [x] Input validation on all mutations
- [x] SQL injection prevention (Prisma ORM)
- [x] Rate limiting on webhooks
- [x] HTTPS only in production
- [x] Environment variables for secrets
- [x] Audit logs for state changes

---

## 📝 API Documentation

Full GraphQL schema available at `/graphql` when server is running.

### Common Queries

```graphql
# Get all vehicles
query {
  vehicles(limit: 50) {
    token
    vehicleNumber
    state
    zone
    slot
  }
}

# Search vehicle
query {
  searchVehicle(input: {
    token: "VLT-0234"
  }) {
    id
    customerPhone
    state
  }
}

# Get valet stats
query {
  valetAssignmentStats {
    avgCount
    variance
    isBalanced
  }
}
```

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Real-time**: Socket.io
- **Messaging**: Twilio WhatsApp API

---

## 📖 Further Reading

1. **SYSTEM_DESIGN.md** - Detailed architecture documentation
2. **PROJECT_STRUCTURE.md** - Code organization guide
3. **2_DAY_IMPLEMENTATION_GUIDE.md** - Step-by-step implementation

---

## 🤝 Support

For issues or questions:
1. Check documentation files
2. Review implementation guide
3. Test with Prisma Studio
4. Verify environment variables

---

## 📄 License

MIT License - Free to use and modify

---

**Built with Clean Architecture principles for maximum maintainability and scalability.**
