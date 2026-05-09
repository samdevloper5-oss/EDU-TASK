# EDUTASK System Architecture

## Executive Summary

EDUTASK is a production-ready micro-task and volunteer marketplace designed for the Bangladesh student market. The platform enforces zero unpaid work and zero unfair payment through rule-based automation, escrow systems, and comprehensive audit trails. The architecture prioritizes scalability, security, fairness, and maintainability while accounting for mobile-first usage patterns and low bandwidth constraints.

## High-Level System Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web App    │  │  Mobile Web  │  │  Admin Panel │         │
│  │  (Next.js)   │  │  (Next.js)   │  │  (Next.js)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                    API GATEWAY LAYER                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Next.js API Routes                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│  │
│  │  │   Auth   │  │  Tasks   │  │  Wallet  │  │   Admin  ││  │
│  │  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  ││  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘│  │
│  └───────┼─────────────┼─────────────┼─────────────┼───────┘  │
└──────────┼─────────────┼─────────────┼─────────────┼──────────┘
           │             │             │             │
┌──────────┼─────────────┼─────────────┼─────────────┼──────────┐
│          │             │             │             │          │
│  ┌───────▼─────────────▼─────────────▼─────────────▼───────┐  │
│  │              SERVICE LAYER                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│  │
│  │  │   Auth   │  │   Task   │  │  Escrow  │  │  Review  ││  │
│  │  │  Service │  │  Service │  │  Service │  │  Service ││  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘│  │
│  │  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐│  │
│  │  │  Wallet │  │  Dispute │  │  Notify  │  │   Audit  ││  │
│  │  │ Service │  │  Service │  │  Service │  │  Service ││  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘│  │
│  └───────┼─────────────┼─────────────┼─────────────┼───────┘  │
│          │             │             │             │          │
└──────────┼─────────────┼─────────────┼─────────────┼──────────┘
           │             │             │             │
┌──────────┼─────────────┼─────────────┼─────────────┼──────────┐
│          │             │             │             │          │
│  ┌───────▼─────────────▼─────────────▼─────────────▼───────┐  │
│  │              DATA LAYER                                  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │         PostgreSQL Database                      │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │  │
│  │  │  │  Users   │  │  Tasks   │  │  Wallet │       │  │  │
│  │  │  │  Tables  │  │  Tables  │  │  Tables │       │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘       │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │  │
│  │  │  │  Audit   │  │  Dispute │  │  Messages│       │  │  │
│  │  │  │  Tables  │  │  Tables  │  │  Tables  │       │  │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘       │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              EXTERNAL SERVICES                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │  Google  │  │  Email   │  │  SMS     │              │  │
│  │  │   OAuth  │  │  Service │  │  Service │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘              │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Client Layer**
- Next.js App Router with Server-Side Rendering (SSR) and Static Site Generation (SSG)
- Progressive Web App (PWA) capabilities for mobile-first experience
- Responsive design optimized for low bandwidth
- Client-side state management for UI reactivity

**API Gateway Layer**
- Next.js API Routes acting as RESTful endpoints
- Request validation and sanitization
- Authentication middleware
- Rate limiting and DDoS protection
- Request/response logging

**Service Layer**
- Business logic encapsulation
- Transaction management
- Inter-service communication
- Background job processing
- Event-driven workflows

**Data Layer**
- PostgreSQL for ACID compliance
- Connection pooling
- Database migrations
- Backup and recovery strategies
- Read replicas for scaling (Phase 2)

**External Services**
- Google OAuth for authentication
- Email service for notifications
- SMS service for critical alerts (Phase 2)
- Payment gateway integration (Phase 2)

## Core Modules Breakdown

### 1. Authentication & Authorization Module

**Responsibility**
- User authentication via JWT and Google OAuth
- Session management
- Role-based access control (Student, Admin)
- Token refresh and revocation
- Password reset flow (if email-based auth added)
- Trust tier management and access control

**Key Functions**
- Issue and validate JWT tokens
- OAuth callback handling
- Role verification middleware
- Session timeout management
- Multi-device session tracking
- Trust tier assignment and validation

**Security Considerations**
- Tokens stored in HTTP-only cookies
- CSRF protection
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- Secure password hashing (bcrypt) if applicable

**Account Creation Model**

Any student can create an account using:
- Student ID (mandatory)
- Email address (mandatory)
- Phone number (mandatory)

No hard verification blocks account creation, reducing onboarding friction while maintaining platform security through trust tiers and access limits.

**Trust and Access Tier System**

The platform implements a trust-based access tier model that controls task limits and access rather than blocking account creation:

- **Basic Student (Default)**: Assigned immediately after signup
  - Can apply for tasks with low value limits
  - Can post tasks with standard limits
  - Full platform access with restricted transaction amounts

- **Verified Student**: Achieved through verification process
  - Higher task value limits for both posting and applying
  - Access to higher-paying tasks
  - Enhanced trust indicators on profile

- **Trusted Student**: Earned through platform history
  - Highest task value limits
  - Access to premium tasks
  - Based on completion history, ratings, and leaderboard score
  - Automatic promotion based on performance metrics

**Verification Benefits**
- Verification improves limits and trust, not basic access
- All students can participate regardless of verification status
- Trust tiers provide risk mitigation without creating barriers
- System encourages verification through increased opportunities

### 2. User & Profile Management Module

**Responsibility**
- User registration and profile creation
- Profile updates and verification
- Student verification (institution, student ID)
- Profile visibility and privacy settings
- User statistics and reputation tracking
- Trust tier management and promotion

**Key Functions**
- Create and update user profiles
- Verify student status (optional, improves trust tier)
- Track user activity metrics
- Manage profile images and documents
- Handle account deactivation
- Calculate and update trust tier based on performance
- Enforce trust tier-based access limits

**Data Entities**
- User accounts
- Profile information
- Verification documents (optional)
- Activity history
- Reputation scores
- Trust tier assignments
- Task limit configurations per tier

### 3. Task Management Module

**Responsibility**
- Task creation, editing, and deletion
- Task categorization and search
- Task status lifecycle management
- Task visibility and filtering
- Task metadata management

**Key Functions**
- Create paid and volunteer tasks
- Validate task requirements
- Manage task deadlines
- Handle task cancellation
- Track task views and engagement

**Task States**
- Draft
- Published
- Application Open
- Executor Selected
- In Progress
- Under Review
- Completed
- Cancelled
- Disputed

### 4. Application & Selection Engine Module

**Responsibility**
- Student application submission
- Application review and filtering
- Executor selection process
- Auto-rejection for volunteer tasks
- Application status notifications

**Key Functions**
- Submit applications with cover letters
- Filter applications by criteria
- Select single executor (paid tasks)
- Select multiple executors (volunteer tasks)
- Auto-reject excess applications
- Track application history

**Business Rules**
- Paid tasks: one application per user per task
- Volunteer tasks: one application per user per task
- Selection window: defined by poster
- Auto-rejection: immediate notification
- Application withdrawal: allowed before selection

### 5. Wallet & Escrow System Module

**Responsibility**
- Virtual wallet management
- Escrow deposit and release
- Transaction recording and audit
- Balance calculations
- Payment history tracking

**Key Functions**
- Create and manage wallets
- Deposit funds to escrow
- Release funds based on rules
- Handle refunds
- Generate transaction reports
- Prevent negative balances

### Escrow State Model (Schema-Derived)

Escrow state is derived from existing fields in `escrows`:
- `released_at IS NULL` => escrow is **locked**
- `released_at IS NOT NULL` => escrow is **released/refunded**
- `release_type` indicates outcome: `approval`, `auto_release`, `refund`, or `dispute_resolution`

No separate status column is used or required.

**Transaction Types**
- Deposit (external funding - Phase 2)
- Escrow Lock
- Escrow Release (approval)
- Escrow Release (auto-release)
- Escrow Refund (cancellation)
- Withdrawal (Phase 2)

**Escrow Rules**
- 100% deposit required before task start
- Funds locked until resolution
- Auto-release after review window expires
- Admin override for disputes
- No partial releases

**Phase 1 Payment Model (Internal Ledger System)**

In Phase 1, the wallet operates as an internal ledger system where funds exist as platform-recorded balances, not instant bank or mobile money transfers. This model is implemented for the following reasons:

- **Safety and Compliance**: Reduces risk during initial platform launch by maintaining full control over fund flows and ensuring regulatory compliance before integrating external payment gateways
- **Transparency**: All transactions are recorded in real-time with complete audit trails, providing users with immediate visibility into their balance changes
- **Trust Building**: Allows the platform to establish trust with users through consistent, rule-based fund management before introducing external payment complexities

**Withdrawal Process (Phase 1)**
- Withdrawal requests are submitted by users through the platform
- All withdrawal requests undergo admin review for security and fraud prevention
- Approved withdrawals are processed in batches (daily or weekly, configurable)
- Users receive clear communication that withdrawals are not instant and are subject to review and batch processing
- Withdrawal status is tracked and visible to users throughout the process

**Future Payment Gateway Integration (Phase 2)**
- Full automated payment gateway integration (bKash, Nagad, bank transfers) is planned for Phase 2
- Phase 1 internal ledger system is designed to seamlessly transition to external payment processing
- All transaction records and audit trails will be preserved during the migration

### 6. Submission & Review Engine Module

**Responsibility**
- Work submission handling
- Review window management
- Approval and revision workflows
- Auto-release triggers
- Evidence preservation

**Key Functions**
- Accept work submissions
- Validate submission format
- Manage review deadlines
- Process approvals
- Handle revision requests
- Trigger auto-release
- Archive all submissions

**Review Workflow**
- Submission deadline enforcement
- Review window countdown
- Revision limit enforcement
- Approval triggers immediate release
- Inactivity triggers auto-release
- All actions logged with timestamps

### 7. Dispute Resolution Module

**Responsibility**
- Dispute creation and tracking
- Evidence collection and preservation
- Automated dispute resolution via rules
- Admin arbitration workflow (edge cases only)
- Dispute resolution recording
- Communication logging during disputes

**Key Functions**
- Create disputes with evidence
- Auto-resolve disputes based on predefined rules
- Assign disputes to admins only when auto-resolution fails
- Track dispute status
- Record admin decisions
- Execute resolution actions
- Notify all parties
- Enforce dispute submission limits

**Dispute Resolution Philosophy**

Most disputes are resolved automatically via rule-based logic. Admin intervention is reserved only for edge cases that cannot be handled by automated rules. This approach ensures scalability and consistent outcomes.

**Allowed Dispute Types**

Disputes are limited to objective, verifiable issues:
- **Scope Mismatch**: Submission does not match task requirements as documented
- **Missing Submission**: No submission provided by deadline
- **Deadline Violation**: Submission provided after agreed deadline

**Dispute Restrictions**

Subjective quality disputes are NOT allowed:
- Work quality judgments (unless clearly violates stated requirements)
- Style preferences
- Personal satisfaction issues

**Automated Resolution Rules**

- Scope mismatch: System compares submission against task requirements, auto-resolves if clear mismatch
- Missing submission: Auto-resolves in favor of poster if no submission by deadline
- Deadline violation: Auto-resolves based on timestamp verification
- Auto-resolution timers: Disputes auto-resolve after defined period if no admin action

**Safeguards**

- Dispute submission limits per user (prevents abuse)
- Cooldown period between disputes for same user
- Auto-resolution timers prevent disputes from lingering
- Clear escalation boundaries defined in system rules
- Dispute history tracking to identify patterns

**Dispute States**
- Pending (awaiting auto-resolution or admin review)
- Auto-Resolved
- Under Review (admin intervention required)
- Resolved
- Escalated

**Evidence Requirements**
- Task description and requirements
- Submission content
- Communication logs
- Review history
- Timestamp records
- Automated rule evaluation results

### 8. Notification System Module

**Responsibility**
- Real-time and asynchronous notifications
- Email and in-app notifications
- Notification preferences
- Notification history
- Critical alert prioritization

**Key Functions**
- Send email notifications
- Create in-app notifications
- Manage notification queues
- Handle notification failures
- Track delivery status
- Respect user preferences

**Notification Types**
- Task application received
- Executor selected
- Work submitted
- Review required
- Payment released
- Dispute filed
- System alerts

### 9. Chat & Communication System Module

**Responsibility**
- Task-specific communication between parties
- Message immutability and auditability
- Evidence preservation for disputes
- Rate limiting and spam prevention
- Automatic archival after task completion

**Key Functions**
- Enable chat only after executor selection
- Send and receive text messages
- Handle limited file attachments for task evidence
- Enforce message immutability (no editing or deletion)
- Apply rate limiting to prevent spam
- Archive conversations automatically
- Provide chat logs for dispute resolution

**Chat Scope and Limitations**

Chat is NOT a general messaging system. It is strictly task-specific and serves as legal evidence during disputes:

- **Task-Specific Only**: Chat is enabled only after executor selection for a specific task
- **Limited Participants**: Only task poster and selected executor(s) can participate
- **No General Messaging**: Users cannot message each other outside of active tasks
- **Automatic Archival**: Chat is automatically archived when task is completed or cancelled
- **Evidence Purpose**: All messages serve as legal evidence in dispute resolution

**Message Safety Features**

- **Immutability**: Messages cannot be edited or deleted once sent
- **Auditability**: All messages are permanently logged with timestamps
- **Rate Limiting**: Prevents spam and abuse through message frequency limits
- **Content Validation**: Text messages validated for length and content
- **File Restrictions**: Limited file types allowed (documents, images for task evidence only)
- **File Size Limits**: Maximum file size enforced to prevent abuse

**Technical Implementation**

- Messages stored in immutable database records
- No soft delete or edit functionality
- Timestamps recorded at database level
- Rate limiting enforced at API and service layers
- Automatic archival triggered by task state changes
- Chat logs included in automatic evidence collection for disputes

### 10. Admin Control Panel Module

**Responsibility**
- Platform oversight and management
- User management and moderation
- Dispute arbitration
- System configuration
- Analytics and reporting

**Key Functions**
- View and manage users
- Arbitrate disputes
- Monitor transactions
- Generate reports
- Configure system settings
- Manage platform content
- Handle appeals

**Admin Capabilities**
- Override escrow releases
- Suspend or ban users
- Access audit logs
- View all communications
- Export data
- Configure business rules

### 11. Audit & Logging Layer Module

**Responsibility**
- Comprehensive activity logging
- Transaction audit trails
- Security event tracking
- Performance monitoring
- Compliance record keeping

**Key Functions**
- Log all user actions
- Record all transactions
- Track system events
- Monitor API usage
- Generate audit reports
- Preserve evidence

**Logged Events**
- Authentication events
- Task lifecycle changes
- Wallet transactions
- Review actions
- Dispute activities
- Admin actions
- System errors

## Data Flow Explanations

### Paid Task End-to-End Flow

**Phase 1: Task Creation**
1. Student (Poster) creates task with details
2. System validates task data
3. Task saved in Draft state
4. Poster deposits 100% payment to escrow
5. System validates escrow deposit
6. Task transitions to Published state
7. Notification sent to potential applicants

**Phase 2: Application & Selection**
1. Students view published task
2. Students submit applications
3. Applications stored with metadata
4. Poster reviews applications
5. Poster selects one executor
6. System locks task (no more applications)
7. All other applicants receive rejection notification
8. Selected executor receives acceptance notification
9. Chat enabled between poster and executor (task-specific, immutable)
10. Task transitions to In Progress state

**Phase 3: Work Submission**
1. Executor submits work before deadline
2. System validates submission format
3. Submission stored with timestamp
4. Task transitions to Under Review state
5. Review window countdown begins
6. Poster receives submission notification

**Phase 4: Review & Resolution**
1. Poster reviews submission within window
2. Three possible outcomes:
   - **Approve**: Funds released immediately, task marked Completed
   - **Request Revision**: Revision request sent, limited revisions enforced
   - **Inactivity**: After review window expires, auto-release triggered
3. All actions logged with timestamps
4. Executor notified of outcome
5. Transaction recorded in audit log

**Phase 5: Dispute (If Applicable)**
1. Either party files dispute with evidence
2. System creates dispute record
3. Task locked from further actions
4. Admin notified
5. Admin reviews evidence and communication logs
6. Admin makes decision
7. Funds released based on admin decision
8. All parties notified
9. Dispute resolution logged

### Volunteer Task End-to-End Flow

**Phase 1: Task Creation**
1. Student (Poster) creates volunteer task
2. Specifies required number of members
3. Defines duration and expected contribution
4. Task saved and published
5. No escrow required

**Phase 2: Application & Selection**
1. Students view volunteer task
2. Students submit applications
3. Applications stored
4. Poster reviews applications
5. Poster selects up to required number of members
6. System auto-rejects excess applications
7. Selected executors receive acceptance notification
8. Rejected applicants receive notification
9. Chat enabled for selected members (task-specific, immutable)
10. Task transitions to In Progress state

**Phase 3: Participation Tracking**
1. Executors log hours and contributions
2. System tracks participation metrics
3. Poster monitors progress
4. All activities logged

**Phase 4: Completion**
1. Task reaches completion criteria
2. Participation records finalized
3. Volunteer hours recorded in user profiles
4. Certificates generated (if eligible)
5. Task marked as Completed
6. All participants notified

### Escrow Funding to Release Flow

**Funding Process**
1. Poster initiates escrow deposit
2. System calculates required amount (100% of task budget)
3. Wallet balance checked (must be sufficient)
4. Funds moved from wallet to escrow account
5. Escrow record created with task linkage
6. Transaction logged
7. Task unlocked for applications

**Release Process - Approval Path**
1. Poster approves submission
2. System validates approval action
3. Escrow record retrieved
4. Funds moved from escrow to executor wallet
5. Transaction recorded
6. Escrow record marked as released
7. Audit log entry created
8. Notifications sent

**Release Process - Auto-Release Path**
1. Review window expires
2. Background job detects expired review window
3. System checks for inactivity (no review action)
4. Escrow record retrieved
5. Funds moved from escrow to executor wallet
6. Transaction recorded
7. Escrow record marked as auto-released
8. Audit log entry created
9. Notifications sent to both parties

**Release Process - Dispute Path**
1. Admin makes dispute resolution decision
2. System receives admin decision with fund allocation
3. Escrow record retrieved
4. Funds allocated based on admin decision
5. Multiple transactions if partial allocation
6. All transactions recorded
7. Escrow record marked as dispute-resolved
8. Audit log entry created
9. Notifications sent

### Dispute Handling Flow

**Dispute Initiation**
1. User (poster or executor) files dispute
2. System validates dispute eligibility
3. Dispute record created with status Pending
4. Evidence automatically collected:
   - Task description and requirements
   - Submission content
   - All communication logs
   - Review history with timestamps
   - Transaction records
5. Task locked from further actions
6. Other party notified
7. Other party can submit counter-evidence

**Admin Arbitration**
1. Admin accesses dispute dashboard
2. System presents all evidence chronologically
3. Admin reviews:
   - Original task requirements
   - Submission quality vs requirements
   - Communication history
   - Review timeline
   - Any rule violations
4. Admin makes decision:
   - Full release to executor
   - Full refund to poster
   - Partial allocation
   - Additional actions (warnings, suspensions)
5. Decision recorded with reasoning
6. Escrow release executed based on decision
7. All parties notified
8. Dispute marked as Resolved

**Post-Resolution**
1. Dispute resolution logged permanently
2. User reputation updated if applicable
3. Task marked as Completed or Cancelled
4. All evidence archived
5. No further actions allowed on task

## Folder & Codebase Structure

### Root Directory Structure

```
edutask/
├── .env.local                    # Environment variables (gitignored)
├── .env.example                  # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js
├── README.md
├── ARCHITECTURE.md               # This document
│
├── public/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   ├── (auth)/               # Auth routes group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── callback/
│   │   ├── (dashboard)/          # Protected routes group
│   │   │   ├── dashboard/
│   │   │   ├── tasks/
│   │   │   │   ├── create/
│   │   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   ├── applications/
│   │   │   ├── wallet/
│   │   │   ├── profile/
│   │   │   └── chat/
│   │   ├── admin/                # Admin routes
│   │   │   ├── dashboard/
│   │   │   ├── disputes/
│   │   │   ├── users/
│   │   │   └── analytics/
│   │   └── api/                  # API Routes
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   ├── logout/
│   │       │   ├── callback/
│   │       │   └── refresh/
│   │       ├── users/
│   │       │   ├── route.ts
│   │       │   ├── [id]/
│   │       │   └── profile/
│   │       ├── tasks/
│   │       │   ├── route.ts
│   │       │   ├── [id]/
│   │       │   ├── [id]/applications/
│   │       │   ├── [id]/select/
│   │       │   └── [id]/submit/
│   │       ├── applications/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       ├── wallet/
│   │       │   ├── route.ts
│   │       │   ├── escrow/
│   │       │   └── transactions/
│   │       ├── reviews/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       ├── disputes/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       ├── notifications/
│   │       │   └── route.ts
│   │       └── admin/
│   │           ├── disputes/
│   │           ├── users/
│   │           └── analytics/
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   └── ...
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Navigation.tsx
│   │   ├── tasks/                # Task-related components
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── TaskDetails.tsx
│   │   │   └── ApplicationList.tsx
│   │   ├── wallet/               # Wallet components
│   │   │   ├── WalletBalance.tsx
│   │   │   ├── TransactionHistory.tsx
│   │   │   └── EscrowStatus.tsx
│   │   ├── chat/                 # Chat components
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageList.tsx
│   │   └── admin/                # Admin components
│   │       ├── DisputePanel.tsx
│   │       └── UserManagement.tsx
│   │
│   ├── lib/                      # Core libraries and utilities
│   │   ├── db/                   # Database utilities
│   │   │   ├── connection.ts     # PostgreSQL connection pool
│   │   │   ├── migrations/       # Database migrations
│   │   │   └── seeds/            # Seed data (dev only)
│   │   ├── auth/                 # Authentication utilities
│   │   │   ├── jwt.ts            # JWT token handling
│   │   │   ├── oauth.ts          # Google OAuth
│   │   │   └── middleware.ts     # Auth middleware
│   │   ├── validation/           # Input validation
│   │   │   ├── schemas.ts        # Zod schemas
│   │   │   └── validators.ts
│   │   ├── utils/                # General utilities
│   │   │   ├── format.ts
│   │   │   ├── date.ts
│   │   │   └── errors.ts
│   │   └── constants/            # Constants
│   │       ├── roles.ts
│   │       ├── taskStatus.ts
│   │       └── config.ts
│   │
│   ├── services/                 # Business logic services
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── task.service.ts
│   │   ├── application.service.ts
│   │   ├── wallet.service.ts
│   │   ├── escrow.service.ts
│   │   ├── review.service.ts
│   │   ├── dispute.service.ts
│   │   ├── notification.service.ts
│   │   ├── chat.service.ts
│   │   └── admin.service.ts
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── user.types.ts
│   │   ├── task.types.ts
│   │   ├── wallet.types.ts
│   │   ├── application.types.ts
│   │   ├── dispute.types.ts
│   │   └── api.types.ts
│   │
│   ├── hooks/                    # React custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   ├── useWallet.ts
│   │   └── useNotifications.ts
│   │
│   ├── middleware.ts             # Next.js middleware
│   │
│   └── styles/                   # Global styles
│       └── globals.css
│
├── database/                     # Database-related files
│   ├── schema.sql                # Database schema
│   ├── migrations/               # Migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_indexes.sql
│   │   └── ...
│   └── seeds/                    # Seed data
│       └── dev_data.sql
│
├── scripts/                      # Utility scripts
│   ├── migrate.ts                # Run migrations
│   ├── seed.ts                   # Seed database
│   └── backup.ts                 # Database backup
│
└── tests/                        # Test files (Phase 2)
    ├── unit/
    ├── integration/
    └── e2e/
```

### Key File Descriptions

**API Routes Structure**
- Each API route is a separate file in `src/app/api/`
- Routes follow RESTful conventions
- All routes include authentication middleware
- Input validation on all endpoints
- Consistent error handling

**Services Structure**
- One service file per domain module
- Services contain pure business logic
- No direct database queries in API routes
- Services are testable in isolation
- Transaction management in services

**Database Structure**
- All tables defined in schema.sql
- Migrations for version control
- Indexes for performance
- Foreign key constraints for integrity
- Triggers for audit logging

**Component Structure**
- UI components are reusable and atomic
- Feature components are domain-specific
- Layout components handle page structure
- Components are client or server as needed

## Security Architecture

### Authentication Flow

**Initial Authentication**
1. User visits login page
2. User selects Google OAuth or email/password
3. For OAuth: redirect to Google, receive callback with code
4. System exchanges code for user info
5. System creates or updates user record
6. System generates JWT access token and refresh token
7. Tokens stored in HTTP-only, secure cookies
8. User redirected to dashboard

**Token Management**
- Access tokens: short-lived (15 minutes)
- Refresh tokens: long-lived (7 days), stored externally (not in the current schema); persistence is Phase 2
- Token rotation on refresh
- Token revocation on logout
- Multi-device session tracking

**Session Security**
- Sessions tied to user agent and IP (optional)
- Automatic logout on token expiration
- Manual logout invalidates refresh token
- Concurrent session limits (configurable)

### Role-Based Access Control (RBAC)

**Role Definitions**
- **Student**: Default role, can post and execute tasks
- **Admin**: Platform authority, can arbitrate and manage

**Permission Matrix**

| Action | Student | Admin |
|--------|---------|-------|
| Create task | Yes | Yes |
| Apply to task | Yes | Yes |
| Select executor | Yes (own tasks) | Yes |
| Submit work | Yes | Yes |
| Review submission | Yes (own tasks) | Yes |
| File dispute | Yes | Yes |
| Arbitrate dispute | No | Yes |
| Manage users | No | Yes |
| View audit logs | No | Yes |
| Override escrow | No | Yes |

**Implementation**
- Middleware checks role on protected routes
- Service layer enforces business rules
- Database constraints prevent privilege escalation
- All permission checks logged

### API Protection

**Request Validation**
- All inputs validated against schemas (Zod)
- Type checking and sanitization
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding
- CSRF tokens on state-changing operations

**Rate Limiting**
- Per-user rate limits on all endpoints
- Stricter limits on auth endpoints
- IP-based rate limiting for DDoS protection
- Progressive backoff on violations
- Rate limit headers in responses

**Input Sanitization**
- HTML sanitization for user-generated content
- File upload validation (type, size, content)
- URL validation for external links
- Email validation and normalization
- Phone number validation (if applicable)

**Output Security**
- No sensitive data in error messages
- User data filtered based on permissions
- PII redaction in logs
- Secure headers (CSP, HSTS, X-Frame-Options)

### Transaction Safety

**Database Transactions**
- All financial operations in transactions
- ACID compliance for wallet operations
- Rollback on any error
- Deadlock detection and retry logic
- Transaction isolation levels appropriate for operations

**Escrow Safety**
- Double-entry accounting principles
- Balance checks before operations
- Atomic fund transfers
- No negative balances allowed
- Immutable transaction records

**Concurrency Control**
- Optimistic locking on critical records
- Version numbers on task and wallet records
- Conflict detection and resolution
- Queue system for high-contention operations

### Evidence Preservation

**Immutable Logs**
- All actions logged with timestamps
- Logs stored in separate audit table
- No deletion or modification of audit records
- Cryptographic hashing of critical evidence
- Regular backup of audit data

**Data Retention**
- Task data retained for legal compliance period
- Communication logs preserved
- Transaction history permanent
- User data retention per privacy policy
- Secure deletion procedures for expired data

**Evidence Collection**
- Automatic evidence gathering on disputes
- Chronological event reconstruction
- Complete communication history
- Version control on submissions
- Timestamp verification

### Anti-Fraud Principles

**Account Security**
- Email verification required
- Student verification process
- Suspicious activity detection
- Account lockout mechanisms
- Password strength requirements (if applicable)

**Transaction Monitoring**
- Unusual transaction pattern detection
- Velocity checks (rapid transactions)
- Amount limits and validation
- Source of funds tracking (Phase 2)
- Automated fraud flagging

**Task Integrity**
- Duplicate task detection
- Plagiarism checking (Phase 2)
- Spam and abuse reporting
- Automated content moderation (Phase 2)
- Manual review queue for flagged content

**User Behavior**
- Reputation system tracking
- Pattern analysis for abuse
- Automated warnings and suspensions
- Appeal process for actions
- Graduated response system

## Scalability & Future-Proofing

### Scaling to 100k+ Users

**Database Scaling**
- Connection pooling (PgBouncer)
- Read replicas for query distribution
- Partitioning large tables (tasks, messages)
- Index optimization and maintenance
- Query performance monitoring
- Caching layer (Redis) for frequent queries

**Application Scaling**
- Stateless API design
- Horizontal scaling on Vercel
- Background job queue (Bull/BullMQ with Redis)
- CDN for static assets
- Image optimization and lazy loading
- API response caching

**Performance Optimizations**
- Database query optimization
- N+1 query prevention
- Pagination on all list endpoints
- Lazy loading of non-critical data
- Compression (gzip/brotli)
- Minimal JavaScript bundles

**Monitoring & Observability**
- Application performance monitoring (APM)
- Error tracking and alerting
- Database performance metrics
- User activity analytics
- Real-time dashboards
- Automated scaling triggers

### Phase 2 Deferred Features

**Payment Gateway Integration**
- External payment methods (bKash, Nagad, bank transfers)
- Withdrawal functionality
- Payment gateway webhooks
- Multi-currency support
- Payment method management

**Advanced Features**
- SMS notifications
- Mobile app (React Native)
- Advanced search and filtering
- Recommendation engine
- Analytics dashboard for users
- Bulk operations
- API for third-party integrations

**Enhanced Security**
- Two-factor authentication (2FA)
- Biometric authentication
- Advanced fraud detection (ML-based)
- Automated content moderation
- Enhanced encryption at rest

**Business Features**
- Subscription plans
- Premium features
- Referral program
- Loyalty points system
- Advanced reporting and analytics

### Loose Coupling Requirements

**Service Independence**
- Services communicate via well-defined interfaces
- No direct database access from API routes
- Event-driven architecture for async operations
- Message queue for inter-service communication
- API versioning strategy

**Database Abstraction**
- Repository pattern for data access
- Database-agnostic service layer
- Migration system for schema changes
- No raw SQL in business logic
- ORM/query builder abstraction

**External Service Integration**
- Abstract interfaces for external services
- Easy swapping of providers (email, SMS, payments)
- Fallback mechanisms for service failures
- Circuit breakers for resilience
- Configuration-driven service selection

**Frontend-Backend Separation**
- API-first design
- Clear contract definitions
- Versioned API endpoints
- Backward compatibility strategy
- Independent deployment capability

### Critical Non-Coupling Points

**Payment Processing**
- Payment logic isolated in service layer
- Easy integration of new payment methods
- No payment code in task or user services
- Payment events trigger business logic, not vice versa

**Notification System**
- Notification service independent of business logic
- Multiple notification channels supported
- Easy addition of new channels
- Notification preferences separate from core features

**Admin Functions**
- Admin capabilities isolated in admin service
- No admin logic in student-facing code
- Admin API routes separate
- Admin actions logged but not blocking

**Audit System**
- Audit logging non-blocking
- Audit service independent
- No business logic dependencies on audit
- Audit failures don't affect operations

### Technology Upgrade Path

**Framework Updates**
- Next.js version upgrades planned
- React version compatibility maintained
- TypeScript strict mode enabled
- Dependency update strategy

**Database Evolution**
- Migration system for schema changes
- Zero-downtime migration strategies
- Backward compatibility during transitions
- Data transformation pipelines

**Infrastructure Scaling**
- Vercel scaling handled automatically
- Railway database scaling procedures
- CDN configuration for global reach
- Load balancing strategies (if needed)

## Conclusion

This architecture provides a solid foundation for EDUTASK that prioritizes security, fairness, and scalability. The modular design allows for incremental development while maintaining clear boundaries between components. The emphasis on rule-based automation, comprehensive audit trails, and evidence preservation ensures the platform can handle real disputes and financial transactions with confidence.

The architecture is designed to scale from initial launch to 100k+ users through careful database design, caching strategies, and horizontal scaling capabilities. Critical features are implemented in Phase 1, while advanced features are deferred to Phase 2 without compromising the core functionality.

All security measures are built into the foundation, ensuring that financial transactions, user data, and platform integrity are protected from day one. The loose coupling between modules ensures that the system remains maintainable and adaptable as requirements evolve.

