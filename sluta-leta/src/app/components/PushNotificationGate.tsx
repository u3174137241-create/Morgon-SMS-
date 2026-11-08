"use client";

import { useCurrentUser } from "@/lib/useCurrentUser";
import PushNotificationPrompt from "./PushNotificationPrompt";

export default function PushNotificationGate() {
  const { user } = useCurrentUser();
  return <PushNotificationPrompt userId={user?.id ?? null} />;
}
