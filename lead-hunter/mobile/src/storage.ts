import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  apiBaseUrl: "leadhunter.apiBaseUrl",
  appPassword: "leadhunter.appPassword",
  lastNotifSeenAt: "leadhunter.lastNotifSeenAt",
} as const;

/** Strips a trailing slash so `${base}/api/...` never produces a double slash. */
function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export async function getApiBaseUrl(): Promise<string | null> {
  const v = await AsyncStorage.getItem(KEYS.apiBaseUrl);
  return v ? normalizeBaseUrl(v) : null;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.apiBaseUrl, normalizeBaseUrl(url));
}

export async function getAppPassword(): Promise<string> {
  return (await AsyncStorage.getItem(KEYS.appPassword)) || "";
}

export async function setAppPassword(pw: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.appPassword, pw);
}

export async function getLastNotifSeenAt(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastNotifSeenAt);
}

export async function setLastNotifSeenAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastNotifSeenAt, iso);
}

export async function clearConnection(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.apiBaseUrl);
  await AsyncStorage.removeItem(KEYS.appPassword);
}
