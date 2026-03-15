import type { FileFormat } from "@/types";

export interface Template {
  id: string;
  title: string;
  description: string;
  category: "document" | "diagram" | "data" | "sql" | "report";
  icon: string;
  format: FileFormat;
  content: string;
}

export const TEMPLATES: Template[] = [
  // ── Documents ────────────────────────────────────────────────────────────
  {
    id: "readme",
    title: "Professional README",
    description: "GitHub-ready project README",
    category: "document",
    icon: "📄",
    format: "md",
    content: `# :rocket: Project Name

> One-line description of your project

![Badge](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## :bookmark_tabs: Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)

## Overview

A brief description of what this project does and why it exists.
This section should explain the **problem it solves** and the **value it provides**.

## :sparkles: Features

- :white_check_mark: Feature one — short description
- :white_check_mark: Feature two — short description
- :white_check_mark: Feature three — short description

## :wrench: Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

\`\`\`bash
git clone https://github.com/username/project-name.git
cd project-name
npm install
npm run dev
\`\`\`

## :gear: Usage

\`\`\`typescript
import { MyModule } from 'project-name';

const result = MyModule.doSomething({ option: true });
console.log(result);
\`\`\`

## :handshake: Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## :memo: License

[MIT](LICENSE)
`,
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Structured meeting minutes template",
    category: "document",
    icon: "📝",
    format: "md",
    content: `# :busts_in_silhouette: Meeting Notes

**Date:** 2026-03-15
**Time:** 10:00 AM – 11:00 AM
**Location:** Conference Room B / Zoom

## :bust_in_silhouette: Attendees

| Name | Role | Present |
|------|------|---------|
| Alice Johnson | Product Manager | :white_check_mark: |
| Bob Smith | Engineering Lead | :white_check_mark: |
| Carol White | Designer | :x: |

## :pushpin: Agenda

1. Sprint review & retrospective
2. Upcoming feature prioritisation
3. Blocker discussion
4. AOB

## :notepad_spiral: Discussion Notes

### Sprint Review

- Completed: user authentication, dashboard UI, API integration
- Velocity: 42 story points (target was 45)

### Feature Prioritisation

- **P1** – Dark mode toggle (design ready)
- **P2** – Export to CSV feature
- **P3** – Notification system (deprioritised)

### Blockers

- :warning: Bob: Waiting on design approval for onboarding flow
- :warning: Alice: Need legal sign-off on data processing policy

## :white_check_mark: Action Items

| # | Task | Owner | Due Date |
|---|------|-------|----------|
| 1 | Finalise dark mode design | Carol | 2026-03-18 |
| 2 | Legal review follow-up | Alice | 2026-03-17 |
| 3 | Set up staging environment | Bob | 2026-03-20 |

## :calendar: Next Meeting

**Date:** 2026-03-22 @ 10:00 AM
`,
  },
  {
    id: "project-proposal",
    title: "Project Proposal",
    description: "Formal project proposal document",
    category: "document",
    icon: "📋",
    format: "md",
    content: `# :briefcase: Project Proposal: [Project Name]

**Submitted by:** [Your Name]
**Date:** 2026-03-15
**Status:** Draft

---

## :mag: Executive Summary

Provide a concise 2–3 sentence overview of the project, the problem it addresses, and the proposed solution.

## :dart: Problem Statement

Describe the current pain points or gaps in the existing system:

- **Issue 1:** Users cannot export data in bulk, resulting in 3+ hours of manual work weekly
- **Issue 2:** No audit trail for configuration changes, causing compliance risk
- **Issue 3:** Integration with legacy system requires manual CSV mapping

## :bulb: Proposed Solution

Describe the solution at a high level:

> Build a self-service data pipeline tool that automates exports, logs all configuration changes to an immutable audit trail, and provides a visual mapping interface for legacy integrations.

## :clipboard: Scope

### In Scope
- Automated bulk export (CSV, JSON, PDF)
- Audit logging dashboard
- Visual field-mapping interface

### Out of Scope
- Mobile app support
- Third-party marketplace integrations

## :clock1: Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| Discovery | Requirements gathering, stakeholder interviews | 2 weeks |
| Design | UX wireframes, API contracts | 3 weeks |
| Development | Build & unit tests | 8 weeks |
| QA & UAT | Testing, bug fixes | 2 weeks |
| Rollout | Staged deployment | 1 week |

**Total estimated duration: 16 weeks**

## :moneybag: Budget Estimate

| Item | Cost |
|------|------|
| Engineering (160h × $120/h) | $19,200 |
| Design (40h × $90/h) | $3,600 |
| Infrastructure | $600/month |
| **Total Year 1** | **$30,000** |

## :chart_with_upwards_trend: Success Metrics

1. Reduce manual export time by **> 90%**
2. Achieve **100%** audit coverage for config changes
3. Onboard legacy integration in **< 30 min** (vs. 4h today)

## :warning: Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Legacy API instability | Medium | High | Adapter layer with fallback |
| Scope creep | High | Medium | Strict change-control process |

## :pencil: Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Sponsor | | | |
| Tech Lead | | | |
`,
  },

  // ── Diagrams ─────────────────────────────────────────────────────────────
  {
    id: "flowchart",
    title: "Process Flowchart",
    description: "User login & authentication flow",
    category: "diagram",
    icon: "🔷",
    format: "mermaid",
    content: `flowchart TD
    A([User visits login page]) --> B{Has account?}
    B -->|No| C[/Sign Up Form/]
    B -->|Yes| D[/Login Form/]
    C --> E[Validate email & password]
    E -->|Invalid| C
    E -->|Valid| F[(Create user in DB)]
    F --> G[Send verification email]
    G --> H{Email verified?}
    H -->|No| I[Resend link]
    I --> H
    H -->|Yes| J
    D --> K[Validate credentials]
    K -->|Failed| L[Show error + lockout?]
    L -->|3rd attempt| M[[Account locked 30min]]
    L -->|< 3 attempts| D
    K -->|Success| J
    J[Generate JWT token] --> N[Set session cookie]
    N --> O([Redirect to dashboard])

    style A fill:#4ade80,color:#000
    style O fill:#4ade80,color:#000
    style M fill:#f87171,color:#000
`,
  },
  {
    id: "sequence",
    title: "API Sequence Diagram",
    description: "REST API request/response flow",
    category: "diagram",
    icon: "↔️",
    format: "mermaid",
    content: `sequenceDiagram
    participant U as Browser
    participant A as API Gateway
    participant S as Auth Service
    participant DB as Database
    participant C as Cache

    U->>A: POST /api/data (Bearer token)
    A->>S: Validate JWT
    S-->>A: 200 OK (user: alice)
    A->>C: GET cache:alice:data
    alt Cache hit
        C-->>A: Cached result
        A-->>U: 200 OK (cached)
    else Cache miss
        A->>DB: SELECT * FROM data WHERE user='alice'
        DB-->>A: Rows (12 records)
        A->>C: SET cache:alice:data TTL=300
        A-->>U: 200 OK (fresh data)
    end

    Note over U,C: Total p95 latency < 50ms
`,
  },
  {
    id: "erd",
    title: "Entity Relationship Diagram",
    description: "E-commerce database schema",
    category: "diagram",
    icon: "🗂️",
    format: "mermaid",
    content: `erDiagram
    CUSTOMER {
        uuid id PK
        string email UK
        string name
        string phone
        timestamp created_at
    }
    ADDRESS {
        uuid id PK
        uuid customer_id FK
        string line1
        string city
        string postcode
        string country
        bool is_default
    }
    PRODUCT {
        uuid id PK
        string sku UK
        string name
        text description
        decimal price
        int stock
        string category
    }
    ORDER {
        uuid id PK
        uuid customer_id FK
        uuid address_id FK
        string status
        decimal total
        timestamp placed_at
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }

    CUSTOMER ||--o{ ADDRESS : "has"
    CUSTOMER ||--o{ ORDER : "places"
    ORDER }o--|| ADDRESS : "ships to"
    ORDER ||--|{ ORDER_ITEM : "contains"
    PRODUCT ||--o{ ORDER_ITEM : "included in"
`,
  },

  // ── Data ─────────────────────────────────────────────────────────────────
  {
    id: "json-api",
    title: "JSON API Response",
    description: "Paginated REST API response",
    category: "data",
    icon: "{ }",
    format: "json",
    content: `{
  "status": "success",
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 47,
    "total_pages": 5
  },
  "data": [
    {
      "id": "usr_01HZXY",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "admin",
      "avatar_url": "https://api.example.com/avatars/alice.png",
      "created_at": "2025-11-03T09:41:22Z",
      "last_login": "2026-03-14T18:55:00Z",
      "preferences": {
        "theme": "dark",
        "notifications": true,
        "language": "en-US"
      }
    },
    {
      "id": "usr_02ABCD",
      "name": "Bob Smith",
      "email": "bob@example.com",
      "role": "editor",
      "avatar_url": "https://api.example.com/avatars/bob.png",
      "created_at": "2025-12-19T14:22:00Z",
      "last_login": "2026-03-13T10:10:00Z",
      "preferences": {
        "theme": "light",
        "notifications": false,
        "language": "en-GB"
      }
    }
  ],
  "links": {
    "self": "/api/v1/users?page=1",
    "next": "/api/v1/users?page=2",
    "last": "/api/v1/users?page=5"
  }
}`,
  },
  {
    id: "csv-sales",
    title: "Sales Data CSV",
    description: "Monthly sales with product breakdown",
    category: "data",
    icon: "📊",
    format: "csv",
    content: `Month,Product,Region,Units Sold,Unit Price,Revenue,YoY Change (%)
January,Widget Pro,North America,1240,49.99,61987.60,+12.4
January,Widget Pro,Europe,980,54.99,53890.20,+8.1
January,Widget Lite,North America,3450,19.99,68965.50,+22.7
January,Widget Lite,Europe,2100,21.99,46179.00,+18.3
February,Widget Pro,North America,1380,49.99,68986.20,+15.0
February,Widget Pro,Europe,1050,54.99,57739.50,+11.2
February,Widget Lite,North America,3820,19.99,76361.80,+28.1
February,Widget Lite,Europe,2340,21.99,51455.40,+25.0
March,Widget Pro,North America,1590,49.99,79484.10,+18.3
March,Widget Pro,Europe,1180,54.99,64888.20,+14.5
March,Widget Lite,North America,4120,19.99,82358.80,+31.5
March,Widget Lite,Europe,2680,21.99,58933.20,+29.4
`,
  },
  {
    id: "yaml-config",
    title: "App Configuration (YAML)",
    description: "Production application config",
    category: "data",
    icon: "⚙️",
    format: "yaml",
    content: `# Application Configuration
# Environment: production

app:
  name: "MyApp"
  version: "2.4.1"
  environment: production
  debug: false
  port: 8080
  base_url: "https://app.example.com"

database:
  host: "db.example.com"
  port: 5432
  name: "myapp_prod"
  pool:
    min: 5
    max: 20
    idle_timeout: 30000
  ssl:
    enabled: true
    ca_cert: "/etc/ssl/certs/db-ca.pem"

cache:
  provider: redis
  host: "cache.example.com"
  port: 6379
  ttl: 300
  max_keys: 100000

auth:
  jwt_secret: "\${JWT_SECRET}"
  token_expiry: "15m"
  refresh_expiry: "7d"
  rate_limit:
    window: "15m"
    max_attempts: 5

logging:
  level: info
  format: json
  destinations:
    - type: stdout
    - type: file
      path: "/var/log/myapp/app.log"
      max_size_mb: 100
      retain_days: 30

features:
  dark_mode: true
  beta_dashboard: false
  new_export: true
`,
  },

  // ── SQL ──────────────────────────────────────────────────────────────────
  {
    id: "sql-create",
    title: "SQL Schema (CREATE TABLE)",
    description: "E-commerce database tables",
    category: "sql",
    icon: "🗄️",
    format: "pgsql",
    content: `-- E-Commerce Database Schema (PostgreSQL)
-- Created: 2026-03-15

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Customers
CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    phone       VARCHAR(30),
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers (email);

-- Products
CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(300) NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category    VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku      ON products (sku);
CREATE INDEX idx_products_category ON products (category);

-- Orders
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
    status      VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
    total       NUMERIC(12, 2) NOT NULL,
    placed_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status   ON orders (status);

-- Order Items
CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10, 2) NOT NULL
);

-- Trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    id: "api-docs",
    title: "API Documentation",
    description: "REST API endpoint reference",
    category: "report",
    icon: "📡",
    format: "md",
    content: `# :satellite: API Reference

**Base URL:** \`https://api.example.com/v1\`
**Auth:** Bearer token in \`Authorization\` header

---

## :busts_in_silhouette: Users

### \`GET /users\`

Returns a paginated list of users.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| \`page\` | integer | 1 | Page number |
| \`per_page\` | integer | 10 | Items per page (max 100) |
| \`role\` | string | — | Filter by role: \`admin\`, \`editor\`, \`viewer\` |

**Response \`200 OK\`**

\`\`\`json
{
  "data": [
    { "id": "usr_01", "name": "Alice", "email": "alice@ex.com", "role": "admin" }
  ],
  "meta": { "page": 1, "total": 47 }
}
\`\`\`

---

### \`POST /users\`

Creates a new user.

**Request Body**

\`\`\`json
{
  "name": "Bob Smith",
  "email": "bob@example.com",
  "password": "Str0ng!Pass",
  "role": "editor"
}
\`\`\`

**Response \`201 Created\`**

\`\`\`json
{
  "id": "usr_02",
  "name": "Bob Smith",
  "email": "bob@example.com",
  "role": "editor",
  "created_at": "2026-03-15T10:00:00Z"
}
\`\`\`

---

### \`DELETE /users/:id\`

Deletes a user. Requires \`admin\` role.

**Response \`204 No Content\`** on success

**Errors**

| Code | Message |
|------|---------|
| 401 | Unauthorised — missing or invalid token |
| 403 | Forbidden — insufficient role |
| 404 | User not found |

---

## :shield: Rate Limits

| Plan | Requests / minute |
|------|------------------|
| Free | 60 |
| Pro | 600 |
| Enterprise | Unlimited |

Rate limit headers are returned on every response:
\`\`\`
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 43
X-RateLimit-Reset: 1742035200
\`\`\`
`,
  },
  {
    id: "release-notes",
    title: "Release Notes",
    description: "Software release changelog",
    category: "report",
    icon: "🚀",
    format: "md",
    content: `# :rocket: Release Notes — v2.4.0

**Released:** 2026-03-15
**Type:** Minor release

---

## :new: New Features

### :art: Dark Mode Support
System-wide dark mode is now available. Toggle from the top-right menu or let the app follow your OS preference.

### :inbox_tray: Bulk Export
Export up to 500 records at once as CSV, JSON, or XLSX. Progress is shown in a live download panel.

### :bell: Smart Notifications
New notification centre aggregates system alerts, mentions, and task updates in one place. Supports email and Slack webhook delivery.

---

## :wrench: Improvements

- **Performance:** Dashboard load time reduced by 40% through query optimisation and edge caching
- **Accessibility:** Full WCAG 2.1 AA compliance for all form components
- **Search:** Boolean operators (\`AND\`, \`OR\`, \`NOT\`) now supported in global search

---

## :bug: Bug Fixes

| # | Description | Severity |
|---|-------------|----------|
| #2341 | CSV export truncated rows > 10,000 | High |
| #2387 | Date picker showed wrong timezone in Safari | Medium |
| #2401 | Avatar upload failed for files > 2 MB | Medium |
| #2419 | Password reset email not sent for SSO accounts | Low |

---

## :warning: Breaking Changes

- The \`/api/v1/export\` endpoint now requires the \`export:write\` scope. Update your API tokens before upgrading.

---

## :arrow_up: Upgrade Guide

\`\`\`bash
npm install myapp@2.4.0
npx myapp migrate
npm run build
\`\`\`

Full upgrade guide: [docs.example.com/upgrade/2.4](https://docs.example.com/upgrade/2.4)

---

## :calendar: What's Next (v2.5.0)

- :construction: Real-time collaborative editing
- :construction: Mobile app (iOS & Android)
- :construction: AI-assisted report generation
`,
  },
];

export const TEMPLATE_CATEGORIES = [
  { key: "document", label: "Documents", icon: "📄" },
  { key: "diagram", label: "Diagrams", icon: "🔷" },
  { key: "data", label: "Data", icon: "📊" },
  { key: "sql", label: "SQL", icon: "🗄️" },
  { key: "report", label: "Reports", icon: "📡" },
] as const;
