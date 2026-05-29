# 🏢 VizinhAI — Project Context for AI Agents

## Overview

**VizinhAI** is a mobile-first Progressive Web App (PWA) for condominium management. It enables building administrators and residents to track quotas, manage expenses, share documents, schedule assemblies, and handle financial operations — all in a centralized, serverless environment powered by Firebase.

- **Domain**: `vizinhai.snackk-media.com` (deployed via GitHub Pages)
- **Language**: Portuguese-first (UI strings), with i18n support for English and French
- **Version**: 1.0.0

---

## Tech Stack

| Layer        | Technology                                                   |
|--------------|--------------------------------------------------------------|
| Build Tool   | Vite 5.4 (ES Modules)                                       |
| UI Framework | React 18.2 (JSX, functional components, hooks)              |
| Styling      | Tailwind CSS v4 via `@tailwindcss/vite` plugin               |
| Backend      | Firebase 10.8 (Authentication, Firestore, Storage)           |
| Icons        | Lucide React 0.292                                           |
| PDF          | jsPDF 2.5                                                    |
| i18n         | react-i18next 14.1 + i18next 23.10                          |
| Dev Server   | Vite dev server (`npm run dev`)                              |

---

## Project Structure

```
/
├── index.html                      # HTML shell, loads /src/main.jsx
├── manifest.json                   # PWA manifest (standalone, theme #d0bcff)
├── package.json                    # Dependencies & scripts
├── vite.config.js                  # Vite config with React + Tailwind plugins
├── public/
│   ├── CNAME                       # Custom domain for GitHub Pages
│   ├── logo.png                    # 512x512 app icon
│   └── manifest.json               # Duplicate PWA manifest served from /public
└── src/
    ├── main.jsx                    # ReactDOM.createRoot entry point, imports i18n
    ├── App.jsx                     # Root component: auth, routing, sidebar, data subscriptions
    ├── index.css                   # Tailwind directives + custom CSS (safe-area, PWA styles)
    ├── config/
    │   └── firebase.js             # Firebase init from VITE_FIREBASE_CONFIG env var
    ├── i18n/
    │   ├── index.js                # i18next configuration (pt/en/fr, fallback: pt)
    │   └── locales/
    │       ├── pt.json             # Portuguese translations (primary)
    │       ├── en.json             # English translations
    │       └── fr.json             # French translations
    ├── components/
    │   ├── NavItem.jsx             # Sidebar navigation item (icon + label + active state)
    │   ├── StatCard.jsx            # Dashboard statistic card (icon, value, subtitle)
    │   ├── AnnualQuotasTable.jsx   # Yearly quotas grid showing paid/unpaid months per user
    │   ├── LoginScreen.jsx         # Firebase Auth login form + password reset flow
    │   └── CondoSelectionScreen.jsx# Multi-condo picker shown when user has access to >1 condos
    └── pages/
        ├── AdminDashboard.jsx      # Admin summary: collected fund, overdue quotas, pending expenses
        ├── UserDashboard.jsx       # Resident summary: personal debt, monthly quota, payment status
        ├── CondoPage.jsx           # View/edit condo details (name, address, NIF, IBAN, admin info)
        ├── CondosPage.jsx          # Backoffice: CRUD for all condominiums
        ├── DocumentsPage.jsx       # Upload/manage documents with custom doc types, Firebase Storage
        ├── ExpensesPage.jsx        # Track expenses (date, rubric, amount), grouped by month
        ├── BudgetsPage.jsx         # Annual budgets with rubrics, reserve fund %, date range
        ├── CurrentAccountPage.jsx  # Admin: mark quotas paid, generate PDF receipts, send via email
        ├── FractionsPage.jsx       # Manage residents/fractions (create Firebase Auth users, permilagem)
        ├── SettingsPage.jsx        # User profile: name, phone, NIF, language preference
        ├── MailsPage.jsx           # View sent system emails (status, attachments, search/filter)
        └── AssembleiasPage.jsx     # Schedule assemblies, manage agenda, generate convocation PDFs
```

---

## Environment Variables

| Variable              | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `VITE_FIREBASE_CONFIG`| JSON string with full Firebase config (apiKey, authDomain, projectId, etc.) |
| `VITE_APP_ID`         | Optional app identifier, defaults to `"vizinhai-app"`                       |

---

## Firebase Data Model (Firestore)

### Top-Level Collections

| Collection | Description                                      |
|------------|--------------------------------------------------|
| `users`    | Global user profiles (uid as doc ID)             |
| `condos`   | Condominium records                              |
| `mail`     | Emails sent via Firebase Trigger Email extension |

### User Document (`/users/{uid}`)

| Field      | Type     | Description                                    |
|------------|----------|------------------------------------------------|
| `name`     | string   | Display name                                   |
| `email`    | string   | User email                                     |
| `role`     | string   | `"backoffice"`, `"admin"`, or `"user"`         |
| `condoIds` | string[] | Array of condo IDs the user belongs to         |
| `language` | string   | Preferred language (`pt`, `en`, `fr`)          |
| `phone`    | string   | Phone number                                   |
| `nif`      | number   | Tax identification number (NIF)                |

### Condo Document (`/condos/{condoId}`)

| Field     | Type   | Description          |
|-----------|--------|----------------------|
| `name`    | string | Condo name           |
| `address` | string | Physical address     |
| `nif`     | string | Condo tax ID         |
| `iban`    | string | Bank account IBAN    |

### Condo Sub-Collections (`/condos/{condoId}/...`)

| Sub-Collection | Description                                                       |
|----------------|-------------------------------------------------------------------|
| `users`        | Condo-scoped user profiles (fraction, permilagem, role)           |
| `quotas`       | Monthly quota payment records (doc ID: `{userId}_{year}-{month}`) |
| `expenses`     | Expense entries (date, rubric, amount, createdBy)                 |
| `budgets`      | Annual budgets (startDate, endDate, rubrics[], totalAmount, reserveFundPercentage) |
| `documents`    | Uploaded documents (title, type, url, fileName)                   |
| `docTypes`     | Custom document type definitions                                  |
| `assembleias`  | Assembly records (date, time, type, agenda items, invitees)       |

### Mail Document (`/mail/{mailId}`)

| Field      | Type   | Description                                      |
|------------|--------|--------------------------------------------------|
| `to`       | string | Recipient email                                  |
| `message`  | object | `{ subject, html, attachments[] }`               |
| `condoId`  | string | Associated condo (for access control)            |
| `delivery` | object | Auto-populated by Firebase extension (state, endTime) |

---

## User Roles & Permissions

| Role        | Capabilities                                                                                  |
|-------------|-----------------------------------------------------------------------------------------------|
| `backoffice`| Full system access. Can manage all condos, create/delete condos, view all emails, manage users globally. |
| `admin`     | Per-condo administrator. Can manage expenses, budgets, documents, fractions, mark payments, send emails, schedule assemblies. |
| `user`      | Resident. Can view dashboard, documents, expenses, budgets, own quotas. Can submit new expenses. |

---

## Key Features & Business Logic

### Quota Management
- Quotas are calculated from: `(budget.totalAmount / 12) * (user.permilagem / 1000) * (1 + reserveFundPercentage / 100)`
- Each month's payment is tracked via a document ID pattern: `{userId}_{year}-{month}`
- Payment cannot be reverted once marked (receipt already emailed)

### PDF Generation (jsPDF)
- **Receipts**: Generated when admin marks a quota as paid, sent via email with base64 PDF attachment
- **Convocations**: Assembly convocation letters with procuration section, generated per invitee

### Email System
- Uses Firebase "Trigger Email" extension (writes to `/mail` collection)
- Tracks delivery status (SUCCESS/ERROR)
- Supports base64 PDF attachments
- Searchable/filterable in MailsPage

### Assemblies
- Types: `geral` (General) or `extraordinaria` (Extraordinary)
- Agenda items (pontos de ordem) as array of strings
- Invitees selected from condo users
- On creation: generates PDF convocation per user and sends via email

### Documents
- Stored in Firebase Storage at path: `condos/{condoId}/documents/{timestamp}_{filename}`
- Supported types: PDF, images, ZIP (max 10MB per Storage rules)
- Organized by custom document types (managed via `docTypes` sub-collection)

### Multi-Condo Architecture
- Users can belong to multiple condos (`condoIds` array)
- Backoffice users see all condos
- Condo selection screen shown when user has access to >1 condos
- All data is scoped under `/condos/{condoId}/` sub-collections

---

## Authentication

- Firebase Authentication (email/password)
- Password reset flow via `sendPasswordResetEmail`
- New users created programmatically in FractionsPage using a secondary Firebase app instance (to avoid signing out the admin)
- After user creation, a password reset email is sent automatically

---

## Internationalization (i18n)

- Default language: `pt` (Portuguese)
- Supported: `pt`, `en`, `fr`
- User preference stored in Firestore and applied on login
- Translation keys cover: navigation, forms, dashboard labels, months, error messages, assembly terms

---

## Deployment

- **Host**: GitHub Pages with custom domain (`vizinhai.snackk-media.com`)
- **CI/CD**: GitHub Actions workflow
  1. Injects `VITE_FIREBASE_CONFIG` from GitHub Secrets
  2. Runs `npm run build`
  3. Deploys `dist/` to GitHub Pages
- **CNAME**: `public/CNAME` preserves custom domain across deploys

---

## PWA Configuration

- `manifest.json` at root and `/public/manifest.json`
- Display: standalone
- Theme color: `#d0bcff`
- Background color: `#1c1b1f`
- Icon: 512x512 `logo.png`
- Installable on iOS (Safari) and Android

---

## Firebase Security Rules

### Firestore
- `isBackoffice()`: checks `/users/{uid}.role == 'backoffice'`
- `isAdmin(condoId)`: backoffice OR `/condos/{condoId}/users/{uid}.role == 'admin'`
- `isMember(condoId)`: backoffice OR user exists in `/condos/{condoId}/users/{uid}`
- Residents can read all condo sub-collections but only create expenses
- Mail documents: create by any auth user, read by backoffice or condo admin, no update/delete

### Storage
- Path: `/condos/{condoId}/documents/{fileName}`
- Read: condo members
- Write: condo admins, max 10MB, only PDF/images/ZIP

---

## Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start Vite dev server    |
| `npm run build` | Production build to dist |
| `npm run preview`| Preview production build |

---

## UI/UX Patterns

- **Styling**: Tailwind CSS v4 utility classes, rounded-3xl cards, slate color palette, blue-600 accent
- **Layout**: Sidebar (desktop) + hamburger menu (mobile), responsive with `lg:` breakpoints
- **Forms**: Modal-style overlays with rounded inputs, loading states on submit
- **Lists**: Collapsible/expandable sections (ChevronDown/ChevronUp), grouped by month or type
- **Safe areas**: CSS `env(safe-area-inset-*)` for PWA on notched devices
- **Mobile header**: Blue gradient bar with condo name and condo switcher button

