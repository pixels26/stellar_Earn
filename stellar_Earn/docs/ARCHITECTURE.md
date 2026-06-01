# Architecture Diagram

## System Overview

This document provides an architectural overview of the Stellar Earn application, focusing on the core modules and their interactions.

## Module Architecture

```mermaid
graph TB
    subgraph "Core Modules"
        SUB[Submissions Module]
        USR[Users Module]
        QST[Quests Module]
        PAY[Payouts Module]
        MOD[Moderation Module]
        NOT[Notifications Module]
        STL[Stellar Module]
    end

    subgraph "Supporting Modules"
        AUT[Auth Module]
        CH[Cache Module]
        JOB[Jobs Module]
        ANL[Analytics Module]
        EML[Email Module]
        WS[WebSocket Module]
        WH[Webhooks Module]
    end

    subgraph "Infrastructure"
        EVT[Event System]
        DB[(Database)]
        CFG[Config]
    end

    %% Core Module Relationships
    SUB --> USR
    SUB --> QST
    SUB --> NOT
    USR --> CH
    USR --> JOB
    USR --> PAY
    QST --> CH
    QST --> MOD
    PAY --> STL
    MOD --> NOT

    %% Supporting Module Relationships
    AUT --> USR
    ANL --> USR
    ANL --> QST
    ANL --> SUB
    EML --> NOT
    WS --> USR
    WS --> SUB
    WH --> USR
    WH --> SUB

    %% Event System Integration
    SUB --> EVT
    USR --> EVT
    QST --> EVT
    PAY --> EVT
    MOD --> EVT

    %% Database
    SUB --> DB
    USR --> DB
    QST --> DB
    PAY --> DB
    MOD --> DB
    NOT --> DB
    STL --> DB

    %% Config
    AUT --> CFG
    STL --> CFG
    CH --> CFG

    style SUB fill:#e1f5ff
    style USR fill:#fff4e1
    style QST fill:#e1ffe1
    style PAY fill:#ffe1f5
    style MOD fill:#f5e1ff
    style NOT fill:#e1ffff
    style STL fill:#ffe1e1
```

## Entity Relationships

```mermaid
erDiagram
    USER ||--o{ SUBMISSION : "submits"
    USER ||--o{ QUEST : "creates"
    USER ||--o{ PAYOUT : "receives"
    USER ||--o{ MODERATION_ITEM : "reports"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ DATA_EXPORT : "requests"

    QUEST ||--o{ SUBMISSION : "has"
    QUEST ||--o{ PAYOUT : "generates"

    SUBMISSION ||--|| USER : "belongs to"
    SUBMISSION ||--|| QUEST : "for"
    SUBMISSION ||--o| MODERATION_ITEM : "may be flagged"

    PAYOUT ||--|| USER : "paid to"
    PAYOUT ||--|| SUBMISSION : "for"

    MODERATION_ITEM ||--|| USER : "reported by"
    MODERATION_ITEM ||--|| SUBMISSION : "references"
    MODERATION_ITEM ||--o{ MODERATION_APPEAL : "has appeals"

    NOTIFICATION ||--|| USER : "sent to"

    USER {
        uuid id PK
        string stellarAddress UK
        string username
        string email UK
        enum role
        int xp "Reputation points"
        int level "Calculated from XP"
        int questsCompleted
        int failedQuests
        decimal successRate
        bigint totalEarned
        string[] badges
        jsonb socialLinks
        enum privacyLevel
        timestamp lastActiveAt
    }

    SUBMISSION {
        uuid id PK
        uuid questId FK
        uuid userId FK
        json proof
        enum status "PENDING, APPROVED, REJECTED, UNDER_REVIEW, PAID"
        string approvedBy
        timestamp approvedAt
        string rejectedBy
        timestamp rejectedAt
        string rejectionReason
        string verifierNotes
    }

    QUEST {
        uuid id PK
        string title
        string description
        string contractTaskId
        string rewardAsset
        decimal rewardAmount
        timestamp deadline
        enum status
        string verifierType
        json verifierConfig
        uuid createdBy FK
        int currentCompletions
        int maxCompletions
        timestamp startDate
        timestamp endDate
    }

    PAYOUT {
        uuid id PK
        uuid userId FK
        uuid submissionId FK
        string asset
        decimal amount
        enum status
        string transactionHash
        timestamp processedAt
    }

    MODERATION_ITEM {
        uuid id PK
        uuid userId FK "reporter"
        uuid submissionId FK
        enum itemType
        enum status
        string reason
        timestamp reviewedAt
        string reviewedBy
    }

    NOTIFICATION {
        uuid id PK
        uuid userId FK
        string type
        string title
        string message
        json metadata
        enum status "SENT, DELIVERED, READ"
        timestamp createdAt
    }
```

## Reputation System Architecture

```mermaid
graph LR
    subgraph "Reputation Calculation Flow"
        A[Quest Completion] --> B[Submission Approval]
        B --> C[ReputationChangedEvent]
        C --> D[User Experience Listener]
        D --> E[Update XP]
        E --> F[Calculate Level]
        F --> G[Update Statistics]
        G --> H[Update Badges]
    end

    subgraph "Reputation Factors"
        XP[Experience Points]
        LVL[Level]
        COMP[Quests Completed]
        FAIL[Failed Quests]
        RATE[Success Rate]
        EARN[Total Earned]
        BADGES[Badges]
    end

    E --> XP
    F --> LVL
    G --> COMP
    G --> FAIL
    G --> RATE
    G --> EARN
    H --> BADGES

    style C fill:#ffe1e1
    style D fill:#e1f5ff
```

## Module Data Flow

### Submission Flow

```mermaid
sequenceDiagram
    participant User
    participant Submissions
    participant Quests
    participant Moderation
    participant Notifications
    participant Payouts
    participant Stellar

    User->>Submissions: Create Submission
    Submissions->>Quests: Validate Quest
    Submissions->>Submissions: Save Submission (PENDING)
    Submissions->>Notifications: Notify Verifiers

    Moderation->>Submissions: Review Submission
    alt Approved
        Submissions->>Submissions: Update Status (APPROVED)
        Submissions->>Notifications: Notify User
        Submissions->>Payouts: Trigger Payout
        Payouts->>Stellar: Process Transaction
        Stellar->>Payouts: Transaction Complete
        Payouts->>Submissions: Update Status (PAID)
        Submissions->>User: Emit ReputationChangedEvent
    else Rejected
        Submissions->>Submissions: Update Status (REJECTED)
        Submissions->>Notifications: Notify User with Reason
    end
```

### User Reputation Flow

```mermaid
sequenceDiagram
    participant Submission
    participant EventSystem
    participant UserListener
    participant UserService
    participant Cache
    participant Analytics

    Submission->>EventSystem: Emit ReputationChangedEvent
    EventSystem->>UserListener: Handle Event
    UserListener->>UserService: Update User XP
    UserService->>UserService: Calculate Level
    UserService->>UserService: Update Statistics
    UserService->>UserService: Check Badge Eligibility
    UserService->>Cache: Invalidate User Cache
    UserService->>Analytics: Track Reputation Change
```

## Module Responsibilities

### Core Modules

| Module            | Responsibility                                   | Key Entities                                           |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------ |
| **Submissions**   | Manage quest submissions, verification workflow  | Submission, SubmissionStatus                           |
| **Users**         | User management, reputation system, gamification | User, DataExport, PrivacyLevel                         |
| **Quests**        | Quest creation, management, verification config  | Quest, QuestStatus                                     |
| **Payouts**       | Payment processing, Stellar integration          | Payout                                                 |
| **Moderation**    | Content moderation, appeals system               | ModerationItem, ModerationAppeal                       |
| **Notifications** | Multi-channel notification delivery              | Notification, NotificationLog, NotificationPreference  |
| **Stellar**       | Blockchain operations, multisig wallets          | MultisigWallet, MultisigTransaction, MultisigSignature |

### Supporting Modules

| Module        | Responsibility                             |
| ------------- | ------------------------------------------ |
| **Auth**      | Authentication, authorization, JWT tokens  |
| **Cache**     | Caching layer, cache strategies            |
| **Jobs**      | Background job processing, scheduled tasks |
| **Analytics** | Reporting, data aggregation, snapshots     |
| **Email**     | Email delivery, templates                  |
| **WebSocket** | Real-time communication                    |
| **Webhooks**  | External webhook delivery                  |

## Common Layer

The common layer provides shared functionality across modules:

```mermaid
graph TB
    subgraph "Common Layer"
        DEC[Decorators]
        EXC[Exceptions]
        FIL[Filters]
        GUA[Guards]
        INT[Interceptors]
        MID[Middleware]
        PIP[Pipes]
        LOG[Logger]
        TRC[Tracing]
        UTIL[Utils]
        SER[Services]
        ENUM[Enums]
    end

    DEC --> GUA
    EXC --> FIL
    LOG --> TRC
    UTIL --> SER

    style DEC fill:#f0f0f0
    style EXC fill:#f0f0f0
    style FIL fill:#f0f0f0
    style GUA fill:#f0f0f0
    style INT fill:#f0f0f0
    style MID fill:#f0f0f0
    style PIP fill:#f0f0f0
    style LOG fill:#f0f0f0
    style TRC fill:#f0f0f0
    style UTIL fill:#f0f0f0
    style SER fill:#f0f0f0
    style ENUM fill:#f0f0f0
```

## Event-Driven Architecture

The system uses an event-driven architecture for decoupled communication:

```mermaid
graph LR
    subgraph "Event Producers"
        S1[Submissions]
        S2[Users]
        S3[Quests]
        S4[Payouts]
    end

    subgraph "Event Bus"
        EVT[Event Store]
    end

    subgraph "Event Consumers"
        C1[User Experience Listener]
        C2[Quest Notifications Listener]
        C3[Notification Processor]
        C4[Analytics Aggregator]
    end

    S1 --> EVT
    S2 --> EVT
    S3 --> EVT
    S4 --> EVT

    EVT --> C1
    EVT --> C2
    EVT --> C3
    EVT --> C4

    style EVT fill:#ffe1e1
```

### Key Events

- **ReputationChangedEvent**: Fired when user reputation changes
- **QuestCreatedEvent**: Fired when a new quest is created
- **SubmissionStatusChangedEvent**: Fired when submission status changes
- **PayoutProcessedEvent**: Fired when a payout is completed

## Technology Stack

- **Backend Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Blockchain**: Stellar
- **Cache**: Redis
- **Queue**: Bull (Redis-based)
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        JWT[JWT Authentication]
        GUA[Role-based Guards]
        DEC[Custom Decorators]
        FIL[Input Validation]
        MID[Rate Limiting]
    end

    subgraph "Protected Resources"
        API[API Endpoints]
        SRV[Services]
        DB[(Database)]
    end

    JWT --> GUA
    GUA --> DEC
    DEC --> FIL
    FIL --> MID
    MID --> API
    API --> SRV
    SRV --> DB

    style JWT fill:#ffe1e1
    style GUA fill:#fff4e1
    style DEC fill:#e1f5ff
    style FIL fill:#e1ffe1
    style MID fill:#f5e1ff
```

## Scalability Considerations

1. **Horizontal Scaling**: Stateless services allow horizontal scaling
2. **Caching**: Redis cache reduces database load
3. **Queue System**: Background jobs processed asynchronously
4. **Event-Driven**: Decoupled modules via event system
5. **Database Indexing**: Strategic indexes on frequently queried fields
6. **Pagination**: All list endpoints support pagination

## Monitoring & Observability

- **Logging**: Structured logging with Winston
- **Tracing**: Distributed tracing support
- **Health Checks**: Health module for monitoring
- **Analytics**: Analytics module for business metrics
