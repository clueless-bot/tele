# Google Sign-In Setup Guide

This app uses `expo-auth-session` for Google OAuth on mobile and sends the returned Google token to `/user/google-signin`.

## Important

- Test Google sign-in in a development build or APK, not Expo Go.
- The app currently expects an Android redirect URI in this format:
  - `com.googleusercontent.apps.<your-client-id-prefix>:/oauthredirect`
- Android package name in this repo:
  - `com.semilshah.teleplay`

## Current Android Debug SHA-1

Use this if you are testing a debug Android build generated from this repo's current debug keystore:

```text
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

If you test a release build, Play-signed build, or a different keystore, you must add that build's SHA-1 too.

## What You Need In Google Cloud

Create these OAuth clients in the same Google Cloud project:

1. Android client
   - Package name: `com.semilshah.teleplay`
   - SHA-1: your debug and/or release signing fingerprint
2. iOS client
   - Required only if you want Google sign-in on iPhone/iPad
3. Web client
   - Recommended if you later want web login or backend flows

## App Environment Variables

Put these in `App/.env`:

```env
BASE_URL=https://api.teleplay.in
GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID
GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID
GOOGLE_CLIENT_ID=YOUR_ANDROID_CLIENT_ID
```

Notes:

- `GOOGLE_CLIENT_ID` is only a legacy fallback.
- Do not reuse the Android client ID as the iOS client ID in production. Create a real iOS OAuth client.

## Backend

The backend route `/user/google-signin` already accepts either:

- `idToken`
- `accessToken`

It verifies the token with Google, creates the user if needed, and returns your app JWT.

## How To Test

1. Start the backend.
2. Build/run the Android app as a real native app:
   ```bash
   cd App
   npx expo run:android
   ```
   Or install an APK built with EAS/local Gradle.
3. Open Login or Sign Up.
4. Tap `Continue with Google`.

## Troubleshooting

### `redirect_uri_mismatch`

- The Android OAuth client in Google Cloud does not match the app you are running.
- Recheck:
  - package name: `com.semilshah.teleplay`
  - SHA-1
  - client ID copied into `App/.env`

### Google account picker opens but never returns to the app

- You are likely testing in Expo Go, or the installed native app was not rebuilt after auth config changes.
- Rebuild/install the Android app again with `npx expo run:android` or a fresh APK.

### `Invalid ID token` or `Invalid access token`

- The Google OAuth client is wrong for the build you installed.
- Make sure the selected client belongs to the same Google Cloud project and matches the current signing fingerprint.

### Network error after choosing a Google account

- Check that `BASE_URL` points to a running backend.
- Check backend logs for `/user/google-signin`.

## References

- Expo authentication guide: https://docs.expo.dev/guides/authentication/
- Expo AuthSession reference: https://docs.expo.dev/versions/latest/sdk/auth-session/
- Google OAuth for installed apps: https://developers.google.com/identity/protocols/oauth2/native-app
