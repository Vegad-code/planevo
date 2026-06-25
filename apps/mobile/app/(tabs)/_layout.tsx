import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { CalendarDays, MessageCircle, Settings, CheckSquare, StickyNote } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? Colors.brand[300] : Colors.brand[600],
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarAccessibilityLabel: 'Plan tab',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size} color={color} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no" />
          ),
          tabBarButtonTestID: 'tab-plan',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarAccessibilityLabel: 'Calendar tab',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size} color={color} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no" />
          ),
          tabBarButtonTestID: 'tab-calendar',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarAccessibilityLabel: 'Tasks tab',
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no" />
          ),
          tabBarButtonTestID: 'tab-tasks',
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarAccessibilityLabel: 'Notes tab',
          tabBarIcon: ({ color, size }) => (
            <StickyNote size={size} color={color} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no" />
          ),
          tabBarButtonTestID: 'tab-notes',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Bruno',
          tabBarAccessibilityLabel: 'Bruno chat tab',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no" />
          ),
          tabBarButtonTestID: 'tab-chat',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no" />
          ),
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tabs>
  );
}
