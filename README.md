# 🏢 VizinhAI - Condominium Management

A lightweight, mobile-first Progressive Web App (PWA) built with React and Firebase to simplify condominium management. VizinhAI allows administrators and residents to easily track quotas, approve expenses, share documents, and manage building fractions in a centralized, secure environment.

## ✨ Features
* **Role-Based Access:** Distinct views and capabilities for Administrators and Residents.
* **Financial Tracking:** Monitor pending/paid quotas, annual budgets, and pending expenses.
* **Document Hub:** Securely upload and access building documents like meeting minutes, invoices, and contracts.
* **PWA Ready:** Installable on iOS (via Safari) and Android directly to the home screen for a native app experience.
* **Serverless Backend:** Powered completely by Firebase Authentication, Firestore, and Firebase Storage.

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
      allow read, update, delete: if false;
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
