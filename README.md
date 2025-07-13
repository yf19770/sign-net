
# Signet - Open Source Digital Signage



### 💖 Support The Project

If you find Signet useful and want to support its development, you can buy me a coffee! It's a small gesture that is greatly appreciated.

<a href="https://buymeacoffee.com/osfy">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="45">
</a>

Signet is a free, open-source, and self-hostable digital signage management system. Built entirely on the Firebase platform, it provides a powerful admin dashboard to manage content across multiple screens from anywhere.

![screenshot](https://firebasestorage.googleapis.com/v0/b/signet-osfy.firebasestorage.app/o/screenshot.png?alt=media&token=7ae6fc20-b9ca-4312-8bdb-685a07062243)

## Features

-   **Secure Authentication:** User login handled securely via Google Authentication.
-   **Media Library:** Upload, rename, and delete your image assets (PNG, JPG, GIF, SVG).
-   **Screen Management:** Add, edit, and delete screens. Each screen gets a unique, shareable URL.
-   **Powerful Scheduler:** A visual, timeline-based scheduler to queue content for specific screens at specific times.
-   **Live Dashboard:** Get a real-time overview of all your screens, their connection status, and what content they are currently displaying.
-   **Default & Fallback Content:** Set default images on a per-screen basis or a global fallback image for when no content is scheduled.
-   **Responsive & Modern UI:** A clean, responsive interface that works on desktop and mobile, with both light and dark themes.

## Tech Stack

-   **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
-   **Backend & Database:** Google Firebase
    -   **Authentication:** For user logins.
    -   **Firestore:** For storing all data (screens, media metadata, schedules).
    -   **Storage:** For hosting uploaded image files.
    -   **Realtime Database:** For tracking screen presence and live status.
    -   **Hosting:** For deploying the entire application.

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your own Firebase account for development and hosting.

### Prerequisites

-   A Google Firebase account (the free "Spark" plan is sufficient to start).
-   Node.js and npm installed on your local machine.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yf19770/sign-net.git
    cd signet
    ```

2.  **Create a Firebase Project:**
    -   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
    -   In your new project, enable the following services:
        -   **Authentication:** Go to the "Authentication" section, click "Get started", and enable **Google** as a Sign-in provider.
        -   **Firestore Database:** Create a new Firestore database. Start in **production mode**.
        -   **Storage:** Enable Cloud Storage.
        -   **Realtime Database:** Create a Realtime Database. Start in **locked mode**.

3.  **Get your Firebase Configuration:**
    -   In your Firebase project console, go to **Project Settings** (click the gear icon).
    -   In the "General" tab, scroll down to "Your apps".
    -   Click the web icon (`</>`) to create a new Web App.
    -   Give it a nickname (e.g., "Signet Dashboard") and register the app.
    -   Firebase will provide you with a `firebaseConfig` object. **Copy this entire object.**

4.  **Configure the Project:**
    -   In the project's root directory, you'll find a file named `firebase-config.js.example`.
    -   Create a copy of this file and name it `firebase-config.js`.
    -   Paste the `firebaseConfig` object you copied from the Firebase console into `firebase-config.js`.
    > **Note:** The `firebase-config.js` file is listed in `.gitignore` and should **never** be committed to your repository.

5.  **Install Firebase CLI & Initialize:**
    -   Install the Firebase command-line tools globally:
        ```bash
        npm install -g firebase-tools
        ```
    -   Log in to Firebase:
        ```bash
        firebase login
        ```
    -   Initialize Firebase in your project directory:
        ```bash
        firebase init
        ```
    -   When prompted:
        -   Choose to use an **existing project** and select the project you created.
        -   Select **Hosting** as the feature you want to set up.
        -   When asked for your public directory, type `.` and press Enter (to use the current root directory).
        -   Configure as a single-page app? Say **No (n)**.
        -   Set up automatic builds and deploys with GitHub? Say **No (n)** for now.

---

## 🔐 Security Rules - IMPORTANT!

By default, your Firebase databases and storage are locked down. You **must** apply security rules to allow the app to function correctly.

<details>
<summary><strong>Click to expand Firestore Security Rules</strong></summary>

Go to your **Firebase Console -> Firestore Database -> Rules** tab and paste the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // This rule applies to all collections under a user's document
    match /users/{userId}/{collection}/{docId} {

      function isPrivateCollection() {
        return collection == 'media';
      }

      function isPublicReadCollection() {
        return collection in ['screens', 'schedule', 'settings'];
      }

      allow read, write: if request.auth.uid == userId && isPrivateCollection();

      allow read: if isPublicReadCollection();
      allow write: if request.auth.uid == userId && isPublicReadCollection();
    }
  }
}
```

</details>

<details>
<summary><strong>Click to expand Storage Security Rules</strong></summary>

Go to your **Firebase Console -> Storage -> Rules** tab and paste the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /media/{userId}/{allPaths=**} {
      allow read; // Relies on public download token

      allow write: if request.auth != null && request.auth.uid == userId && (
        request.resource == null ||
        (request.resource.size < 5 * 1024 * 1024 &&
         request.resource.contentType.matches('image/.*'))
      );
    }
  }
}
```
</details>

<details>
<summary><strong>Click to expand Realtime Database Security Rules</strong></summary>

Go to your **Firebase Console -> Realtime Database -> Rules** tab and paste the following. This allows any authenticated user to write their presence status.

```json
{
  "rules": {
    "connections": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

</details>

---

## Deployment

To deploy your application and make it live, simply run the following command from your project's root directory:

```bash
firebase deploy
```

Firebase will give you a URL where your application is hosted (e.g., `your-project-id.web.app`).

## Project Structure

A brief overview of the key files and directories:

-   `index.html`: The main admin dashboard single-page application.
-   `login.html`: The user login page.
-   `view.html`: The public-facing page that displays content for a specific screen.
-   `js/main.js`: The entry point and core logic for the admin dashboard.
-   `js/view.js`: The core logic for the public screen display.
-   `js/firebase.js`: Initializes and exports Firebase services.
-   `css/`: Contains all stylesheets for the application.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
