# 🏢 VizinhAI - Condominium Management

A lightweight, mobile-first Progressive Web App (PWA) built with React and Firebase to simplify condominium management. VizinhAI allows administrators and residents to easily track quotas, approve expenses, share documents, and manage building fractions in a centralized, secure environment.

## ✨ Features
* **Role-Based Access:** Distinct views and capabilities for Backoffice, Administrators, and Residents.
* **Multi-Condo Support:** Backoffice users can manage multiple condominiums from a single dashboard.
* **Financial Tracking:** Monitor pending/paid quotas, annual budgets, and expenses with automated receipt PDF generation.
* **Document Hub:** Securely upload and access building documents like meeting minutes, invoices, and contracts.
* **Assembly Management:** Schedule assemblies, send convocations with procuration PDFs via email.
* **Email History:** Track all system-sent emails with status and attachment downloads.
* **Multi-Language:** Supports Portuguese, English, and French (react-i18next).
* **PWA Ready:** Installable on iOS (via Safari) and Android directly to the home screen for a native app experience.
* **Serverless Backend:** Powered completely by Firebase Authentication, Firestore, and Firebase Storage.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Build Tool | [Vite](https://vitejs.dev/) |
| UI | [React 18](https://react.dev/) (JavaScript) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite` |
| Backend | [Firebase 10](https://firebase.google.com/) (Auth, Firestore, Storage) |
| Icons | [Lucide React](https://lucide.dev/) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) |
| i18n | [react-i18next](https://react.i18next.com/) + [i18next](https://www.i18next.com/) |

## 📁 Project Structure

```
src/
├── main.jsx                    # Entry point: ReactDOM.createRoot
├── App.jsx                     # Root component (auth, condo selection, routing, sidebar)
├── index.css                   # Tailwind directives + custom styles
├── config/
│   └── firebase.js             # Firebase init (reads VITE_FIREBASE_CONFIG env var)
├── i18n/
│   ├── index.js                # i18next setup
│   └── locales/
│       ├── pt.json
│       ├── en.json
│       └── fr.json
├── components/
│   ├── NavItem.jsx
│   ├── StatCard.jsx
│   ├── AnnualQuotasTable.jsx
│   ├── LoginScreen.jsx
│   └── CondoSelectionScreen.jsx
└── pages/
    ├── AdminDashboard.jsx
    ├── UserDashboard.jsx
    ├── CondoPage.jsx
    ├── DocumentsPage.jsx
    ├── ExpensesPage.jsx
    ├── BudgetsPage.jsx
    ├── CurrentAccountPage.jsx
    ├── FractionsPage.jsx
    ├── SettingsPage.jsx
    ├── MailsPage.jsx
    ├── AssembleiasPage.jsx
    └── CondosPage.jsx
public/
├── logo.png
├── manifest.json
└── CNAME
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm

### Installation

```bash
npm install
```

### Development

Create a `.env.local` file with your Firebase config:

```env
VITE_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
```

Then run:

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

The output is in `dist/` — deploy to GitHub Pages or any static host.

### Deployment (GitHub Pages)

The project is deployed to `vizinhai.snackk-media.com` via GitHub Actions. The workflow:

1. Sets `VITE_FIREBASE_CONFIG` from a GitHub Actions secret
2. Runs `npm run build`
3. Deploys `dist/` to GitHub Pages

The `CNAME` file in `public/` ensures the custom domain is preserved across deploys.

## 🔐 Firebase Security Rules

To ensure that residents can only see what they are supposed to and cannot maliciously edit data, you must apply the following security rules in your Firebase Console.

### 🗄️ Firestore Database Rules
Go to **Firestore Database** -> **Rules** and paste the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if the user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Helper: Check if user is Backoffice
    function isBackoffice() {
      return isAuth() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'backoffice';
    }

    // Helper: Check if the user is an Admin of a specific condo
    function isAdmin(condoId) {
      return isAuth() && (
        isBackoffice() || 
        get(/databases/$(database)/documents/condos/$(condoId)/users/$(request.auth.uid)).data.role == 'admin'
      );
    }

    // Helper: Check if user belongs to a condo
    function isMember(condoId) {
      return isAuth() && (
        isBackoffice() || 
        exists(/databases/$(database)/documents/condos/$(condoId)/users/$(request.auth.uid))
      );
    }

    // Global Users collection
    match /users/{userId} {
      allow read: if isAuth();
      allow update: if request.auth.uid == userId || isBackoffice();
      allow create, delete: if isBackoffice();
    }

    // Global Condos collection
    match /condos/{condoId} {
      allow read: if isMember(condoId);
      allow list: if isBackoffice();
      allow create, delete: if isBackoffice();
      allow update: if isAdmin(condoId);

      // Sub-collections per condo
      match /{collection}/{id} {
        allow read: if isMember(condoId);
        allow write: if isAdmin(condoId);
      }
      
      // Expenses: specific rule to allow creation by any member
      match /expenses/{expenseId} {
        allow create: if isMember(condoId);
      }
    }

    // Trigger Email Extension Collection
    match /mail/{mailId} {
      allow create: if isAuth();
      allow read: if isBackoffice() || (isAuth() && isAdmin(resource.data.condoId));
      allow update, delete: if false;
    }
  }
}
```

### 📁 Firebase Storage Rules
Go to Storage -> Rules and paste the following:

```JavaScript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    function isAuth() {
      return request.auth != null;
    }

    function isBackoffice() {
      return isAuth() && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'backoffice';
    }

    function isAdmin(condoId) {
      return isAuth() && (
        isBackoffice() || 
        firestore.get(/databases/(default)/documents/condos/$(condoId)/users/$(request.auth.uid)).data.role == 'admin'
      );
    }

    function isMember(condoId) {
      return isAuth() && (
        isBackoffice() || 
        firestore.exists(/databases/(default)/documents/condos/$(condoId)/users/$(request.auth.uid))
      );
    }

    // Protect documents per condo
    match /condos/{condoId}/documents/{fileName} {
      allow read: if isMember(condoId);
      allow write: if isAdmin(condoId)
                   && request.resource.size < 10 * 1024 * 1024 
                   && request.resource.contentType.matches('application/pdf|image/.*|application/zip');
    }
  }
}
```

### 👨‍💻 Setting up the First Backoffice User
Since the system now depends on a Backoffice role for top-level management, you must create the first Backoffice user manually.

1. Create a user in Firebase Auth.
2. In Firestore, create a document in the `users` collection with the User's UID as the Document ID.
3. Add the following fields:
   - `name`: "Super Admin"
   - `email`: "admin@example.com"
   - `role`: "backoffice"
   - `condoIds`: [] (empty array)

From there, the Backoffice user can login and create the first Condominiums and associate other users.
