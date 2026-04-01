# Pabbly Roadmap - Project Phases

## Phase 1: MVP (Core Functionality)
**Duration:** 6-8 weeks  
**Status:** In Progress

### Backend Tasks
- [ ] Authentication (Register, Login, JWT, Refresh Token)
- [ ] Password Management (Change Password, Forget Password)
- [ ] User Profiles (View, Update)
- [ ] Boards CRUD (Create, Read, Update, Delete, Reorder)
- [ ] Board Member Management (Assign/Remove Managers)
- [ ] Board Access Links (Generate, Revoke, Track Usage)
- [ ] Posts CRUD (Create, Read, Update, Delete)
- [ ] Post Status Management (Under Review, Planned, In Progress, Live, Closed, Hold)
- [ ] Voting System (Upvote, Remove Vote, Vote on Behalf)
- [ ] Comments (Add, Edit, Delete, Nested Replies, Official Response)
- [ ] Tags (Create, Edit, Delete - Board Scoped)
- [ ] Roadmap (Kanban View by Status)
- [ ] Search & Filtering (Full-text, Board, Status, Type, Tags)
- [ ] Admin Dashboard (Stats, Analytics, Activity Log)
- [ ] User Management (View, Ban/Unban)
- [ ] Quick Response Templates
- [ ] Activity Audit Log

### Frontend Tasks
- [ ] Authentication Pages (Login, Register)
- [ ] User Profile Page
- [ ] Board Listing & Detail Pages
- [ ] Post Creation & Detail Pages
- [ ] Voting UI & Voters List
- [ ] Comment System
- [ ] Roadmap Kanban View
- [ ] Admin Dashboard
- [ ] Admin Board Management
- [ ] Admin User Management
- [ ] Admin Invite Links Page
- [ ] Admin Quick Responses
- [ ] Admin Activity Log
- [ ] Search & Filter UI
- [ ] Theme System (Light/Dark Mode)

### Database Schema
- [ ] Users Table
- [ ] Boards Table
- [ ] Board Members Table
- [ ] Invite Links Table
- [ ] Posts Table
- [ ] Votes Table
- [ ] Comments Table
- [ ] Tags Table
- [ ] Post Tags Table
- [ ] Activity Log Table
- [ ] Quick Responses Table

---

## Phase 2: Post-MVP Enhancements
**Duration:** 4-6 weeks  
**Priority:** Email & File Features

### Features
- [ ] Email Verification (Registration)
- [ ] Forgot Password / Reset (Email-based)
- [ ] Email Notifications (Status changes, New comments)
- [ ] File Attachments (Upload images/files to posts)
- [ ] Post Assignment (Assign to board managers)
- [ ] Roadmap Drag & Drop (Drag posts between columns)
- [ ] Export to CSV (Board data export)
- [ ] Webhook Integrations (Slack, Discord)
- [ ] Two-Factor Authentication (TOTP, QR code)
- [ ] Advanced Analytics (Trends, Engagement graphs)
- [ ] Duplicate Detection & Merge Posts

### Backend Tasks
- [ ] Email Service Integration (SMTP/SendGrid)
- [ ] Verification Token System
- [ ] Password Reset Workflow
- [ ] File Upload Service (S3/Storage)
- [ ] Webhook Queue (Background jobs)
- [ ] 2FA Implementation
- [ ] Analytics & Reporting APIs
- [ ] Duplicate Detection Algorithm

### Frontend Tasks
- [ ] Email Verification Flow
- [ ] Forgot Password Page
- [ ] File Upload Component
- [ ] Drag & Drop Kanban
- [ ] Analytics Dashboard
- [ ] 2FA Setup Page
- [ ] Export Feature UI

---

## Phase 3: Advanced Features
**Duration:** 4+ weeks  
**Priority:** Integrations & Customization

### Features
- [ ] OAuth / SSO (Google, GitHub Login)
- [ ] Custom Branding (Logo, Colors, Domain)
- [ ] Public Changelog (Auto-generate from Live posts)
- [ ] Embeddable Widget (JS widget for external sites)
- [ ] Multi-language Support (i18n)
- [ ] Advanced Role Management
- [ ] Team Collaboration (Mentions, @Notifications)
- [ ] Post Templates
- [ ] Bulk Actions (Bulk status update, Bulk delete)
- [ ] Custom Fields (Per-board custom metadata)

### Backend Tasks
- [ ] OAuth Integration
- [ ] Custom Branding System
- [ ] Changelog Generation
- [ ] Widget API
- [ ] i18n Framework
- [ ] Advanced Permissions System
- [ ] Webhook Delivery System
- [ ] Custom Fields Schema

### Frontend Tasks
- [ ] OAuth Login Buttons
- [ ] Branding Settings Page
- [ ] Public Changelog View
- [ ] Widget Configuration
- [ ] i18n Integration
- [ ] Advanced Filtering UI
- [ ] Bulk Actions UI

---

## Current Status
**Phase 1 - Frontend Progress:**
- ✅ Authentication (Login, Register Pages)
- ✅ Navbar (Light/Dark Mode Toggle)
- ✅ Theme System Implementation
- ⏳ Admin Dashboard (In Progress)
- ⏳ Admin Layout & Sidebar
- ⏳ Board Management
- ⏳ Posts & Comments
- ⏳ Voting System
- ⏳ Tags Management
- ⏳ Roadmap View

**Phase 1 - Backend Progress:**
- ✅ Authentication APIs (Register, Login, JWT)
- ⏳ Board Management APIs
- ⏳ Posts & Comments APIs
- ⏳ Voting APIs
- ⏳ Tags APIs
- ⏳ Admin Dashboard APIs

---

## Success Criteria (MVP)
- [ ] All Phase 1 core features implemented
- [ ] 95% API test coverage
- [ ] 90% component test coverage
- [ ] Performance: Load time < 2s
- [ ] Security: OWASP Top 10 compliant
- [ ] Database: Optimized queries, proper indexing
- [ ] Accessibility: WCAG 2.1 AA compliance
- [ ] Mobile Responsive: Works on all devices
