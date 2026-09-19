# Vast ERP

Vast ERP is a modern, serverless Enterprise Resource Planning application built with React, Vite, and Firebase. It provides a lightweight yet powerful suite of tools for managing core business operations, featuring an accounting module with strict ledger management and journal entry tracking.

## Key Features

* **Core Accounting:** Manage financial accounts (Ledgers) and record transactions (Journal Entries).

* **Double-Entry System:** Enforces double-entry bookkeeping principles (Debits = Credits).

* **Real-time Synchronization:** Powered by Firebase Firestore for real-time data updates across clients.

* **AI Integration:** Built-in hooks for Gemini API to assist with intelligent business insights (see Security notes).

* **User Profiles:** Manage user access and profile settings.

* **Modern UI:** Fast, responsive frontend built with React and Vite.

## Tech Stack

* **Frontend:** React, TypeScript, Vite

* **Backend/Database:** Firebase (Authentication, Firestore)

* **AI Capabilities:** Google Gemini API (@google/genai)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* Node.js (v18 or higher recommended)

* npm or yarn

* A Firebase project

* A Google Gemini API Key

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/JustEvoo/Finance-Accounting-Web.git
   cd Finance-Accounting-Web
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables:**
   Copy the example environment file and fill in your Firebase configuration and API keys.

   ```bash
   cp .env.example .env.local
   ```

   *Update .env.local with your credentials:*

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   # IMPORTANT: Read the security section before deploying Gemini keys
   GEMINI_API_KEY=your_gemini_key 
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Security & Architecture Considerations (Important)

Vast ERP utilizes a serverless Firebase architecture. Because the frontend client is inherently untrusted, please ensure the following backend safeguards are implemented before deploying to production:

* **Firestore Security Rules:** Client-side UI validation (like preventing the deletion of active ledgers or enforcing balanced journal entries) is easily bypassed. You must implement strict Firestore Security Rules to enforce these constraints at the database level.

* **API Key Protection:** Do not call the Gemini API directly from the React frontend in a production environment. Exposing GEMINI_API_KEY in the client bundle compromises your secret key. Route AI requests through Firebase Cloud Functions or a secure backend.

* **Data Sanitization:** Ensure strict content security policies (CSP) and sanitization for user-generated content, particularly regarding external URLs (e.g., profile photo URLs), to prevent XSS attacks.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page on GitHub.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
