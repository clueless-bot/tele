# Building APK for Teleplay App

This guide explains how to build an APK file for your Expo app using the CLI.

## Prerequisites

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to your Expo account**:
   ```bash
   eas login
   ```

3. **Configure EAS** (if not already done):
   ```bash
   eas build:configure
   ```

## Method 1: EAS Build (Cloud Build - Recommended)

EAS Build builds your app in the cloud. This is the easiest and most reliable method.

### Quick Commands

Based on your `eas.json` configuration, you have these build profiles:

#### Build APK (using the "apk" profile):
```bash
npm run build:apk
# or directly:
eas build --platform android --profile apk
```

#### Build APK for Preview/Testing:
```bash
npm run build:apk:preview
# or directly:
eas build --platform android --profile preview
```

#### Build APK for Development:
```bash
npm run build:apk:dev
# or directly:
eas build --platform android --profile development
```

### Steps:

1. **Navigate to the App directory**:
   ```bash
   cd App
   ```

2. **Run the build command**:
   ```bash
   eas build --platform android --profile apk
   ```

3. **Follow the prompts**:
   - EAS will ask if you want to create a new build profile (if needed)
   - It will upload your project to Expo's servers
   - The build will run in the cloud (takes 10-20 minutes)

4. **Download the APK**:
   - Once the build completes, EAS will provide a download link
   - Or check your build status: `eas build:list`
   - Download directly: `eas build:download`

### View Build Status:
```bash
eas build:list
```

### Download Latest Build:
```bash
eas build:download --platform android --latest
```

---

## Method 2: Local Build (Requires Android Studio)

If you want to build locally on your machine, you need Android Studio installed.

### Prerequisites:
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK and build tools
3. Set up environment variables (ANDROID_HOME, etc.)

### Build Locally:

1. **Generate native Android project**:
   ```bash
   npx expo prebuild --platform android
   ```

2. **Build the APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Find your APK**:
   The APK will be located at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Method 3: Using Expo Development Build

For development/testing purposes:

```bash
npx expo run:android --variant release
```

This builds and installs the app on a connected Android device or emulator.

---

## Important Notes

1. **Keystore**: For production builds, EAS will automatically manage your keystore. For local builds, you'll need to set up a keystore manually.

2. **Environment Variables**: Make sure your `BASE_URL` in `.env` is set correctly for production builds.

3. **Build Time**: Cloud builds typically take 10-20 minutes. Local builds are faster but require setup.

4. **APK vs AAB**: 
   - APK: Direct installable file (good for testing/distribution outside Play Store)
   - AAB: Android App Bundle (required for Google Play Store)

---

## Troubleshooting

### If EAS CLI is not found:
```bash
npm install -g eas-cli
```

### If build fails, check logs:
```bash
eas build:view [BUILD_ID]
```

### Clear cache and rebuild:
```bash
eas build --platform android --profile apk --clear-cache
```

---

## Your Current Configuration

Based on your `eas.json`:
- ✅ APK profile configured
- ✅ Preview profile configured  
- ✅ Development profile configured
- ✅ Production uses AAB (for Play Store)

You're all set to build APKs! 🚀
