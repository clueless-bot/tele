import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

type Extra = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_ANDROID_CLIENT_ID?: string;
  GOOGLE_IOS_CLIENT_ID?: string;
  GOOGLE_WEB_CLIENT_ID?: string;
};

const extra = Constants.expoConfig?.extra as Extra;

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  id: string;
}

export function useGoogleSignIn() {
  const clientIds = {
    androidClientId: extra?.GOOGLE_ANDROID_CLIENT_ID || extra?.GOOGLE_CLIENT_ID,
    iosClientId: extra?.GOOGLE_IOS_CLIENT_ID,
    webClientId: extra?.GOOGLE_WEB_CLIENT_ID,
  };

  const buildGoogleNativeRedirectScheme = (clientId?: string) => {
    if (!clientId) return null;
    const suffix = ".apps.googleusercontent.com";
    if (!clientId.endsWith(suffix)) return null;
    const base = clientId.slice(0, -suffix.length);
    if (!base) return null;
    return `com.googleusercontent.apps.${base}`;
  };

  // Google requires a googleusercontent custom scheme for native OAuth redirects.
  // Example: com.googleusercontent.apps.<client-id-without-suffix>:/oauthredirect
  const googleScheme = buildGoogleNativeRedirectScheme(clientIds.androidClientId || clientIds.iosClientId || undefined);
  const nativeRedirectUri = googleScheme ? `${googleScheme}:/oauthredirect` : undefined;

  const redirectUri = AuthSession.makeRedirectUri({
    native: nativeRedirectUri,
    scheme: "teleplay",
    path: "oauthredirect",
  });

  const [request, , promptAsync] = Google.useAuthRequest({
    ...clientIds,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    // We manually exchange the auth code below so Expo doesn't also do a
    // background exchange that can consume the same code and throw.
    shouldAutoExchangeCode: false,
    redirectUri,
  });

  const signIn = async (): Promise<{
    success: boolean;
    user?: GoogleUser;
    idToken?: string;
    accessToken?: string;
    error?: string;
  }> => {
    try {
      if (Constants.appOwnership === "expo") {
        return {
          success: false,
          error:
            "Google sign-in needs a development build or APK, not Expo Go. Install the app with `npx expo run:android` or build an APK/AAB first.",
        };
      }

      if (!clientIds.androidClientId && !clientIds.iosClientId && !clientIds.webClientId) {
        return {
          success: false,
          error:
            "Google Client ID not configured. Set GOOGLE_ANDROID_CLIENT_ID/GOOGLE_IOS_CLIENT_ID (or legacy GOOGLE_CLIENT_ID) in App/.env or app config.",
        };
      }

      if (!request) {
        return {
          success: false,
          error: "Google sign-in not ready yet. Please try again.",
        };
      }

      if (__DEV__) {
        console.log("[google-auth] starting auth flow", {
          appOwnership: Constants.appOwnership,
          redirectUri,
          hasAndroidClientId: !!clientIds.androidClientId,
          hasIosClientId: !!clientIds.iosClientId,
          hasWebClientId: !!clientIds.webClientId,
        });
      }

      const result: any = await promptAsync({
        showInRecents: true,
      });

      if (result.type === "cancel") {
        return { success: false, error: "User cancelled Google sign-in" };
      }
      if (result.type === "dismiss") {
        if (__DEV__) {
          console.log("[google-auth] auth dismissed", {
            redirectUri,
            appOwnership: Constants.appOwnership,
            resultKeys: Object.keys(result || {}),
          });
        }
        return {
          success: false,
          error:
            "Google authentication was dismissed before the app received the redirect. Rebuild/reinstall the native app, avoid Expo Go, and verify the Android OAuth client package name and SHA-1 match this build.",
        };
      }
      if (result.type !== "success") {
        return {
          success: false,
          error: `Google authentication failed (${String(result.type || "unknown")})`,
        };
      }

      let accessToken: string | undefined =
        result.authentication?.accessToken || result.params?.access_token;
      let idToken: string | undefined =
        result.authentication?.idToken || result.params?.id_token;

      // Some Android flows return an auth code (PKCE) instead of tokens.
      // Exchange it for tokens locally (no client secret needed).
      const authCode: string | undefined = result.params?.code;
      if ((!accessToken && !idToken) && authCode) {
        try {
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId:
                clientIds.androidClientId ||
                clientIds.iosClientId ||
                clientIds.webClientId ||
                "",
              code: authCode,
              redirectUri,
              extraParams: request?.codeVerifier
                ? { code_verifier: request.codeVerifier }
                : undefined,
            },
            { tokenEndpoint: "https://oauth2.googleapis.com/token" }
          );

          accessToken = tokenResponse.accessToken || accessToken;
          idToken = (tokenResponse as any).idToken || idToken;
        } catch (e: any) {
          console.log("Google code exchange failed:", {
            message: e?.message,
            redirectUri,
            hasCodeVerifier: !!request?.codeVerifier,
          });
        }
      }

      if (!accessToken && !idToken) {
        console.log("Google sign-in success but no tokens:", {
          appOwnership: Constants.appOwnership,
          redirectUri,
          paramsKeys: Object.keys(result.params || {}),
          hasAuthentication: !!result.authentication,
        });
        return { success: false, error: "No tokens received from Google" };
      }

      let userInfo: GoogleUser | null = null;
      if (accessToken) {
        try {
          const response = await fetch(
            "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (response.ok) {
            const data = await response.json();
            userInfo = {
              email: data.email,
              name: data.name,
              picture: data.picture,
              id: data.id,
            };
          }
        } catch {
          // ignore; backend can still validate tokens
        }
      }

      return {
        success: true,
        user: userInfo || undefined,
        idToken,
        accessToken,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to sign in with Google",
      };
    }
  };

  return { signIn, isReady: !!request };
}
