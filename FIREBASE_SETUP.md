# Firebase Setup Instructions

This app now supports Firebase Authentication and Firestore data synchronization. Follow these steps to enable cloud sync functionality.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "time-logger-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Click on "Google" provider
5. Toggle "Enable" to ON
6. Add your domain to "Authorized domains" (e.g., `localhost` for development, your production domain)
7. Click "Save"

## 3. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development) or "Start in production mode" (for production)
4. Select a location for your database (choose closest to your users)
5. Click "Done"

## 4. Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web app" icon (`</>`)
4. Enter an app nickname (e.g., "Time Logger Web")
5. Click "Register app"
6. Copy the configuration object

## 5. Configure GitHub Secrets

Since you're using GitHub Pages, configure your Firebase credentials using GitHub Secrets to keep your API keys secure.

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret" and add each of these secrets:
   - **Name:** `FIREBASE_API_KEY` **Value:** `your-actual-api-key`
   - **Name:** `FIREBASE_AUTH_DOMAIN` **Value:** `your-project.firebaseapp.com`
   - **Name:** `FIREBASE_PROJECT_ID` **Value:** `your-actual-project-id`
   - **Name:** `FIREBASE_STORAGE_BUCKET` **Value:** `your-project.appspot.com`
   - **Name:** `FIREBASE_MESSAGING_SENDER_ID` **Value:** `your-actual-sender-id`
   - **Name:** `FIREBASE_APP_ID` **Value:** `your-actual-app-id`

3. The GitHub Actions workflow will automatically inject these secrets during deployment
4. Your app will work with Firebase sync on GitHub Pages, and localStorage-only locally

**Note:** The included `.github/workflows/deploy.yml` file will automatically:
- Create a secure `firebase-config-secret.js` file during deployment
- Deploy your app to GitHub Pages with Firebase configuration
- Keep your secrets secure and never expose them in your repository

## 6. Enable GitHub Pages

1. Go to your repository → Settings → Pages
2. Under "Source", select "GitHub Actions"
3. The included workflow will automatically deploy your app

## 7. Add Your Domain to Firebase

1. In Firebase Console → Authentication → Settings → Authorized domains
2. Add your GitHub Pages domain: `yourusername.github.io`
3. Add your repository domain: `yourusername.github.io/your-repo-name` (if using project pages)

## 8. Set Up Firestore Security Rules

1. In Firebase Console, go to "Firestore Database" → "Rules"
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## 9. Test the Integration

1. Open your app in a browser
2. You should see a "Sign In with Google" button in the header
3. Click it to test Google authentication
4. Once signed in, your data will automatically sync to Firestore
5. Try adding some time entries and verify they sync to the cloud

## Troubleshooting

### "Firebase not configured" Error
- Make sure you've updated `firebase-config.js` with your actual Firebase configuration
- Check that the Firebase SDK scripts are loaded in `index.html`

### Authentication Not Working
- Verify Google Sign-In is enabled in Firebase Console
- Check that your domain is added to authorized domains
- Ensure you're using HTTPS in production (required for Google Sign-In)

### Data Not Syncing
- Check browser console for errors
- Verify Firestore security rules allow your user to write data
- Ensure you're signed in (check the header for user info)

## Data Structure

The app stores data in Firestore with this structure:
```
users/{userId}/groups/{groupId}
  - name: string
  - archived: boolean
  - running: boolean
  - startedAt: timestamp (optional)
  - logs: array of {start, end, duration}
```

## Security Notes

- **API Keys**: Never commit Firebase API keys to public repositories
- **GitHub Secrets**: All sensitive data is stored securely in GitHub repository secrets
- **Data Access**: Users can only access their own data (enforced by Firestore rules)
- **Encryption**: All data is encrypted in transit and at rest
- **Authentication**: Google Sign-In provides secure authentication
- **No Passwords**: No passwords are stored in your app

## Security Best Practices

1. **Use GitHub Secrets** - All sensitive data is stored securely in GitHub repository secrets
2. **Use Firebase Security Rules** - Restrict data access to authenticated users only
3. **Enable App Check** (optional) - Prevent abuse by verifying requests come from your app
4. **Monitor Usage** - Set up Firebase monitoring and alerts
5. **Regular Audits** - Review Firebase Console for unusual activity

## Production Deployment

When deploying to production:
1. Add your production domain to Firebase authorized domains
2. Update Firestore security rules for production
3. Consider enabling additional security features in Firebase Console
4. Monitor usage in Firebase Console to stay within free tier limits
