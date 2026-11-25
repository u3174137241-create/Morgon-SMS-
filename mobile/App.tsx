import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { WebView, type WebViewNavigation, type WebViewMessageEvent } from "react-native-webview";
import Purchases from "react-native-purchases";

const APP_URL = "https://sluta-leta-three.vercel.app";
const APP_HOSTNAME = new URL(APP_URL).hostname;

// WebViewen delar appens inloggningskaka (sharedCookiesEnabled), vilket gör
// den till ett "betrott" skal i användarens ögon. Utan den här spärren skulle
// en länk som en annan användare klistrar in i en chatt (phishing, en falsk
// inloggningssida osv.) öppnas rakt inuti appen med samma UI-chrome som
// resten av Sluta Leta — ett klassiskt sätt att lura folk. Allt som inte är
// vår egen domän öppnas därför i telefonens vanliga webbläsare istället,
// vilket även täcker Stripes betalsidor (buy.stripe.com) och samtidigt
// håller köpet utanför appens egen vy (App Store-regel 3.1.1).
function shouldOpenInApp(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && hostname === APP_HOSTNAME;
  } catch {
    return false;
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Registrerar för pushnotiser hos Expo (som i sin tur pratar med APNs/FCM)
// och returnerar tokenet. Fungerar bara i en riktig EAS-byggd app på en
// fysisk enhet eller emulator med Google Play-tjänster — aldrig i Expo Go
// för remote push, och aldrig i simulatorn för riktiga push (bara lokala).
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResponse.data;
  } catch (err) {
    console.warn("Kunde inte hämta Expo-pushtoken", err);
    return null;
  }
}

// RevenueCat-nycklarna finns bara om ägaren har satt upp ett RevenueCat-konto
// kopplat till App Store Connect — innan det finns är Plus-köp i appen helt
// avstängt (samma gracefulla nedtoning som push-notiser utan EAS-projekt).
function getRevenueCatApiKey(): string | null {
  const keys = Constants.expoConfig?.extra?.revenueCat as { iosApiKey?: string; androidApiKey?: string } | undefined;
  const key = Platform.OS === "ios" ? keys?.iosApiKey : keys?.androidApiKey;
  return key && key.length > 0 ? key : null;
}

export default function App() {
  const webviewRef = useRef<WebView<object>>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const purchasesConfiguredRef = useRef(false);

  // Skicka pushtokenet in i webbsidan via postMessage, så sidan (se
  // NativeAppBridge.tsx i sluta-leta-appen) kan POSTa det till backend med
  // sina egna cookies — appen behöver aldrig hantera inloggningssessionen.
  const sendTokenToWebView = useCallback((token: string) => {
    webviewRef.current?.postMessage(JSON.stringify({ type: "expo-push-token", token }));
  }, []);

  const postToWebView = useCallback((message: object) => {
    webviewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        pushTokenRef.current = token;
      }
    });
  }, []);

  useEffect(() => {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) return;
    Purchases.configure({ apiKey });
    purchasesConfiguredRef.current = true;
  }, []);

  // Köp av Plus görs alltid via native in-app-köp (RevenueCat), aldrig via
  // webbsidans Stripe-flöde — se src/app/plus/page.tsx. appUserID sätts till
  // vårt eget inloggade user-id (se "current-user"-meddelandet nedan) så att
  // RevenueCats webhook kan koppla köpet till rätt konto i vår databas.
  const handlePlusPurchaseRequest = useCallback(async () => {
    if (!purchasesConfiguredRef.current) {
      postToWebView({ type: "plus-purchase-failed" });
      return;
    }
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) {
        postToWebView({ type: "plus-purchase-failed" });
        return;
      }
      await Purchases.purchasePackage(pkg);
      postToWebView({ type: "plus-purchase-completed" });
    } catch (err) {
      const purchaseError = err as { userCancelled?: boolean };
      postToWebView({ type: purchaseError.userCancelled ? "plus-purchase-cancelled" : "plus-purchase-failed" });
    }
  }, [postToWebView]);

  const handleWebViewMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let parsed: { type?: string; userId?: string | null } | null = null;
      try {
        parsed = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (parsed?.type === "current-user") {
        const userId = parsed.userId ?? null;
        if (userId && userId !== currentUserIdRef.current && purchasesConfiguredRef.current) {
          currentUserIdRef.current = userId;
          Purchases.logIn(userId).catch(() => {});
        } else if (!userId) {
          currentUserIdRef.current = null;
        }
      } else if (parsed?.type === "request-plus-purchase") {
        handlePlusPurchaseRequest();
      }
    },
    [handlePlusPurchaseRequest]
  );

  const handleShouldStartLoadWithRequest = useCallback((request: WebViewNavigation) => {
    if (shouldOpenInApp(request.url)) return true;
    Linking.openURL(request.url).catch(() => {});
    return false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webviewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView<object>
        ref={webviewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onNavigationStateChange={(nav: { canGoBack: boolean }) => setCanGoBack(nav.canGoBack)}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          setLoading(false);
          if (pushTokenRef.current) sendTokenToWebView(pushTokenRef.current);
        }}
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        decelerationRate="normal"
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
