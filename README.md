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

    // Helper: Check if the user is an Admin
    function isAdmin(appId) {
      return isAuth() && 
        get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Apply rules to the specific VizinhAI data structure
    match /artifacts/{appId}/public/data {
      
      // Users Collection
      match /users/{userId} {
        allow read: if isAuth();
        allow create: if isAdmin(appId);
        allow update: if isAdmin(appId) || request.auth.uid == userId; // Users can update their own profile
        allow delete: if isAdmin(appId);
      }

      // Quotas Collection
      match /quotas/{quotaId} {
        allow read: if isAuth();
        allow write: if isAdmin(appId); // Only admins can create/update quotas
      }

      // Expenses Collection
      match /expenses/{expenseId} {
        allow read: if isAuth();
        allow create: if isAuth(); // Any resident can submit an expense
        allow update, delete: if isAdmin(appId); // Only admins can approve or delete
      }

      // Budgets Collection
      match /budgets/{budgetId} {
        allow read: if isAuth();
        allow write: if isAdmin(appId);
      }

      // Documents Metadata Collection
      match /documents/{docId} {
        allow read: if isAuth();
        allow write: if isAdmin(appId);
      }

      // Condominium Details
      match /condo/info {
        allow read: if isAuth();
        allow write: if isAdmin(appId);
      }
    }
  }
}
```

### 📁 Firebase Storage Rules
Go to Storage -> Rules and paste the following to protect your PDF and image uploads:

```JavaScript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Protect the VizinhAI documents folder
    match /artifacts/{appId}/public/documents/{fileName} {
      
      // Any authenticated resident can download/view documents
      allow read: if request.auth != null;
      
      // Only authenticated users can upload, restricted to PDFs/Images under 10MB
      allow write: if request.auth != null 
                   && request.resource.size < 10 * 1024 * 1024 
                   && request.resource.contentType.matches('application/pdf|image/.*');
    }
  }
}
```

### 👨‍💻 Setting up the First Admin User
Because the app relies on Firebase Authentication, you cannot create the very first Administrator through the app's interface. You must create it manually in the Firebase Console to bootstrap the system.

Follow these exact steps:
- Go to the Firebase Console.
- Navigate to Authentication -> Users tab.
- Click Add user and create an account with an email (e.g., admin@vizinhai.com) and a password.
- Copy the User UID generated for this new user.
- Create the Firestore Profile:
- Navigate to Firestore Database.
- Go to the exact path used by the app: artifacts -> vizinhai-app -> public -> data -> users.
- Click Add document.
- Crucial: For the Document ID, paste the User UID you copied in Step 1.
- Add the following fields to the document:
- - id (string): Paste the User UID again
- - email (string): admin@vizinhai.com
- - name (string): Administrator
- - fraction (string): Backoffice
- - role (string): admin
- - Click Save.
