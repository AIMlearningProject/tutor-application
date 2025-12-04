# COPSA Tutor Application - Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [System Components](#system-components)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Scalability Considerations](#scalability-considerations)
8. [Deployment Architecture](#deployment-architecture)

## System Overview

The COPSA Tutor Application is a full-stack web application built to manage tutor session logging and administrative review workflows. The system follows a traditional MVC (Model-View-Controller) pattern with additional middleware layers for security, logging, and error handling.

### Key Features

- **Authentication**: Google OAuth 2.0 integration
- **Session Management**: CRUD operations for tutor sessions
- **Admin Workflow**: Review, approve, and reject sessions
- **Internationalization**: Full English and Finnish support
- **Security**: Multiple layers including Helmet, rate limiting, input sanitization
- **Logging**: Structured logging with Winston
- **Email Notifications**: Nodemailer integration

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │  Mobile Web  │  │   Desktop    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY MIDDLEWARE                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Helmet  │  │   CORS   │  │   Rate   │  │  Input   │       │
│  │          │  │          │  │ Limiting │  │Sanitize  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    Express.js                           │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │  Passport.js │  │   Session    │  │     i18n     │ │    │
│  │  │   (OAuth)    │  │  Management  │  │              │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                     ROUTES                             │     │
│  │                                                         │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │     │
│  │  │   Auth   │  │  Tutor   │  │  Admin   │            │     │
│  │  │  Routes  │  │  Routes  │  │  Routes  │            │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │     │
│  └───────┼─────────────┼─────────────┼───────────────────┘     │
│          │             │             │                           │
│          ▼             ▼             ▼                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   MIDDLEWARE                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │   Auth   │  │Validation│  │   HTTP   │            │    │
│  │  │          │  │          │  │  Logger  │            │    │
│  │  └──────────┘  └──────────┘  └──────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   SERVICES                              │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │  Email   │  │  Logger  │  │  Error   │            │    │
│  │  │ Service  │  │ (Winston)│  │ Handler  │            │    │
│  │  └──────────┘  └──────────┘  └──────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Mongoose ODM                          │    │
│  │                                                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │    │
│  │  │   User   │  │  Tutor   │  │  Admin   │            │    │
│  │  │  Model   │  │ Session  │  │  Review  │            │    │
│  │  │          │  │  Model   │  │   Log    │            │    │
│  │  └──────────┘  └──────────┘  └──────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
│                                                                   │
│                    ┌──────────────────┐                          │
│                    │   MongoDB 7.x    │                          │
│                    │                  │                          │
│                    │  ┌────────────┐  │                          │
│                    │  │ users      │  │                          │
│                    │  ├────────────┤  │                          │
│                    │  │ sessions   │  │                          │
│                    │  ├────────────┤  │                          │
│                    │  │reviewlogs  │  │                          │
│                    │  └────────────┘  │                          │
│                    └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.21.1
- **Database**: MongoDB 7.x with Mongoose ODM 8.8.3
- **Authentication**: Passport.js with Google OAuth 2.0
- **Session Management**: express-session
- **View Engine**: EJS 3.1.10

### Security

- **Helmet**: Security headers
- **express-rate-limit**: DDoS protection
- **express-mongo-sanitize**: NoSQL injection prevention
- **hpp**: HTTP Parameter Pollution protection

### Logging & Monitoring

- **Winston**: Structured logging with daily rotation
- **HTTP Logger**: Request/response logging middleware

### Email

- **Nodemailer**: Email notifications via Gmail SMTP

### Testing

- **Jest**: Test framework
- **Supertest**: HTTP assertions
- **MongoDB Memory Server**: In-memory database for testing

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

### Deployment

- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## System Components

### 1. Authentication Layer

```
┌─────────────────────────────────────┐
│      Google OAuth 2.0 Flow          │
├─────────────────────────────────────┤
│ 1. User clicks "Login with Google"  │
│ 2. Redirect to Google consent       │
│ 3. Google callback with auth code   │
│ 4. Exchange code for user profile   │
│ 5. Create/update user in DB         │
│ 6. Create session                   │
│ 7. Redirect to dashboard            │
└─────────────────────────────────────┘
```

**Features**:

- Automatic admin role assignment based on email
- Session persistence
- CSRF protection
- Secure cookie configuration

### 2. Authorization Layer

```
┌─────────────────────────────────────┐
│       Role-Based Access Control     │
├─────────────────────────────────────┤
│ Roles:                              │
│ - Tutor (default)                   │
│ - Admin (configurable via .env)     │
│                                      │
│ Middleware:                          │
│ - isAuthenticated()                 │
│ - isAdmin()                         │
│ - isTutor()                         │
│ - attachUserRole()                  │
└─────────────────────────────────────┘
```

### 3. Session Management Workflow

```
┌─────────────────────────────────────┐
│   Tutor Session Lifecycle           │
├─────────────────────────────────────┤
│                                      │
│  DRAFT → SUBMITTED → APPROVED       │
│            ↓                         │
│         REJECTED                     │
│            ↓                         │
│          DRAFT                       │
│                                      │
│ State Transitions:                  │
│ - Draft: Editable by tutor          │
│ - Submitted: Locked, pending review │
│ - Approved: Final, counted in stats │
│ - Rejected: Editable again by tutor │
└─────────────────────────────────────┘
```

### 4. Data Models

#### User Model

```javascript
{
  googleId: String (unique),
  name: String,
  email: String (unique, lowercase),
  role: Enum['tutor', 'admin'],
  language_preference: Enum['en', 'fi'],
  created_at: Date,
  updated_at: Date
}
```

#### TutorSession Model

```javascript
{
  user_id: ObjectId (ref: User),
  date: Date (not future),
  location: String (2-200 chars),
  description: String (10-2000 chars),
  hours: Number (0.5-24, step 0.5),
  status: Enum['draft', 'submitted', 'approved', 'rejected'],
  admin_review_notes: String (max 1000 chars),
  reviewed_by: ObjectId (ref: User),
  reviewed_at: Date,
  created_at: Date,
  updated_at: Date
}
```

#### AdminReviewLog Model

```javascript
{
  session_id: ObjectId (ref: TutorSession),
  admin_id: ObjectId (ref: User),
  action: Enum['approved', 'rejected'],
  notes: String,
  timestamp: Date
}
```

## Data Flow

### Tutor Session Creation

```
User → POST /tutor/session
  ↓
Input Validation Middleware
  ↓
Sanitization Middleware
  ↓
Authentication Check
  ↓
Create TutorSession (status: draft)
  ↓
Save to MongoDB
  ↓
Redirect to Dashboard
```

### Session Submission & Email Notification

```
User → POST /tutor/session/:id/submit
  ↓
Verify session ownership
  ↓
Verify status === 'draft'
  ↓
Update status to 'submitted'
  ↓
Log session submission
  ↓
Send email to admin (Nodemailer)
  ↓
Redirect to Dashboard
```

### Admin Review Process

```
Admin → POST /admin/session/:id/approve
  ↓
Verify admin role
  ↓
Verify status === 'submitted'
  ↓
Update session: status, review_notes
  ↓
Create AdminReviewLog entry
  ↓
Log admin action
  ↓
Redirect to Admin Dashboard
```

## Security Architecture

### Defense in Depth

#### Layer 1: Network Security

- HTTPS enforcement in production
- HSTS headers
- Rate limiting (configurable)

#### Layer 2: Application Security

- Helmet.js security headers
- CORS configuration
- CSP (Content Security Policy)
- XSS protection headers
- Frame-Options: DENY

#### Layer 3: Input Validation

- Schema validation (Mongoose)
- Input sanitization (trim, sanitize)
- NoSQL injection prevention
- HPP (HTTP Parameter Pollution) protection

#### Layer 4: Authentication & Authorization

- OAuth 2.0 (Google)
- Session-based authentication
- Secure session cookies (httpOnly, secure)
- Role-based access control

#### Layer 5: Data Security

- Environment variables for secrets
- Password-free authentication (OAuth)
- Audit logging for admin actions

### Security Configuration

```javascript
// Helmet Configuration
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
});

// Rate Limiting
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
```

## Scalability Considerations

### Current Architecture

- **Concurrent Users**: ~100-1000 users
- **Request Rate**: ~100 req/min
- **Database**: Single MongoDB instance

### Horizontal Scaling Strategy

```
┌─────────────────────────────────────────────────────┐
│                Load Balancer                         │
│                  (Nginx/HAProxy)                     │
└────────┬────────────────┬───────────────┬───────────┘
         │                │               │
         ▼                ▼               ▼
   ┌─────────┐      ┌─────────┐    ┌─────────┐
   │  App    │      │  App    │    │  App    │
   │Instance │      │Instance │    │Instance │
   │    1    │      │    2    │    │    3    │
   └────┬────┘      └────┬────┘    └────┬────┘
        │                │               │
        └────────────────┴───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   MongoDB Replica    │
              │        Set           │
              │                      │
              │  ┌────────────────┐  │
              │  │   Primary      │  │
              │  ├────────────────┤  │
              │  │  Secondary 1   │  │
              │  ├────────────────┤  │
              │  │  Secondary 2   │  │
              │  └────────────────┘  │
              └──────────────────────┘
```

### Scaling Recommendations

1. **Application Layer**
   - Stateless application design (sessions in Redis/MongoDB)
   - Docker containers for easy replication
   - Load balancer (Nginx/AWS ELB)

2. **Database Layer**
   - MongoDB replica set (1 primary + 2 secondaries)
   - Read preference: secondaryPreferred for read-heavy operations
   - Sharding for >10M documents

3. **Session Storage**
   - Move to Redis for session storage
   - Session replication across instances

4. **File Storage**
   - Use S3/Cloud Storage for attachments
   - CDN for static assets

5. **Caching**
   - Redis for frequently accessed data
   - Cache session statistics
   - Cache user profiles

6. **Monitoring**
   - Application Performance Monitoring (APM)
   - Log aggregation (ELK stack)
   - Metrics (Prometheus + Grafana)

### Performance Optimization

1. **Database Indexes**

   ```javascript
   // Existing indexes
   User: { googleId: 1 }, { email: 1 }
   TutorSession: { user_id: 1 }, { status: 1 }, { date: -1 }
   AdminReviewLog: { session_id: 1 }, { admin_id: 1 }

   // Recommended compound indexes
   TutorSession: { user_id: 1, status: 1, date: -1 }
   TutorSession: { status: 1, reviewed_at: -1 }
   ```

2. **Query Optimization**
   - Use lean() for read-only queries
   - Select only needed fields
   - Pagination for large result sets

3. **Connection Pooling**
   - MongoDB connection pool: 10-100 connections
   - Keep-alive for database connections

## Deployment Architecture

### Docker Deployment

```
┌─────────────────────────────────────────────────────┐
│               Docker Compose Stack                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────┐        ┌──────────────────┐   │
│  │  App Container  │        │ MongoDB Container│   │
│  │                 │◄──────►│                  │   │
│  │  Node.js App    │        │   MongoDB 7.x    │   │
│  │  Port: 3000     │        │   Port: 27017    │   │
│  └─────────────────┘        └──────────────────┘   │
│                                                       │
│  Shared Network: app-network                         │
│  Volumes: mongodb_data, mongodb_config, logs        │
└─────────────────────────────────────────────────────┘
```

### Cloud Deployment Options

#### 1. Railway/Render (Recommended for MVP)

```
Application ─────► Railway/Render Platform
                   │
                   ├─► Auto-scaling
                   ├─► HTTPS
                   ├─► Environment variables
                   └─► Health checks

MongoDB ─────────► MongoDB Atlas (Managed)
```

#### 2. AWS Deployment

```
┌──────────────────────────────────────────┐
│              AWS VPC                      │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │     Application Load Balancer      │  │
│  └───────────┬────────────────────────┘  │
│              │                            │
│  ┌───────────┴────────────┐              │
│  │                        │              │
│  ▼                        ▼              │
│ ┌──────────┐        ┌──────────┐        │
│ │  ECS/EC2 │        │  ECS/EC2 │        │
│ │ Instance │        │ Instance │        │
│ └────┬─────┘        └────┬─────┘        │
│      │                   │              │
│      └───────────┬───────┘              │
│                  │                       │
│                  ▼                       │
│         ┌─────────────────┐             │
│         │  MongoDB Atlas  │             │
│         │  or DocumentDB  │             │
│         └─────────────────┘             │
└──────────────────────────────────────────┘
```

### Health Checks & Monitoring

#### Health Check Endpoint

```javascript
GET /health
Response: {
  uptime: 12345,
  message: "OK",
  timestamp: 1234567890,
  database: "connected"
}
```

#### Logging Strategy

- **Application Logs**: Winston with daily rotation
- **Access Logs**: HTTP request logging
- **Error Logs**: Separate error log files
- **Audit Logs**: Admin actions logged to database

#### Log Retention

- Application logs: 14 days
- Error logs: 30 days
- Audit logs: Permanent (database)

## Assumptions & Limitations

### Assumptions

1. User base < 10,000 users
2. <100 concurrent sessions
3. English/Finnish language support only
4. Google OAuth is acceptable for all users
5. Email notifications via Gmail SMTP

### Current Limitations

1. Single database instance (no replication)
2. No file upload functionality
3. No real-time updates (polling required)
4. No mobile apps (mobile web only)
5. No API versioning

### Future Enhancements

1. Real-time updates via WebSockets
2. File attachment support
3. Multi-factor authentication
4. Advanced reporting and analytics
5. Mobile applications (React Native)
6. API documentation (Swagger/OpenAPI)
7. GraphQL API
8. Microservices architecture for large scale
