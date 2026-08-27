import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Hem",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: "Analysera",
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: "Jämför",
          tabBarIcon: ({ color, size }) => <Ionicons name="git-compare-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historik",
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
