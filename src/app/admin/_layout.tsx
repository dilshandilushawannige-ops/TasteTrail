import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Admin tab layout for the admin dashboard
 * Contains: Overview, Restaurants, Users, and Profile tabs
 */
export default function AdminTabLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const baseTabBarHeight = Platform.OS === 'ios' ? 85 : 65;
  const baseTabBarPadding = Platform.OS === 'ios' ? 25 : 10;
  
  // Hide tab bar when on forms or other modal-like screens
  const shouldHideTabBar = pathname?.includes('/add-restaurant') || 
                          pathname?.includes('/edit-restaurant') ||
                          pathname?.includes('/restaurant/');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E8505B',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: shouldHideTabBar ? { display: 'none' } : {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          // Lift the bar above Android's gesture/navigation area instead of
          // extending the bar into the system navigation surface.
          bottom: Platform.OS === 'android' ? insets.bottom : 0,
          height: baseTabBarHeight,
          paddingBottom: baseTabBarPadding,
          paddingTop: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#FAFAF7',
        },
        headerTintColor: '#E8505B',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Overview Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'analytics' : 'analytics-outline'} 
              size={24} 
              color={color} 
            />
          ),
          headerShown: false, // Using custom header in the screen
        }}
      />

      {/* Restaurants Tab */}
      <Tabs.Screen
        name="restaurants"
        options={{
          title: 'Restaurants',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'restaurant' : 'restaurant-outline'} 
              size={24} 
              color={color} 
            />
          ),
          headerShown: false, // Using custom header in the screen
        }}
      />

      {/* Users Tab */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'people' : 'people-outline'} 
              size={24} 
              color={color} 
            />
          ),
          headerTitle: 'Users',
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={color} 
            />
          ),
          headerShown: false, // Using custom header in the screen
        }}
      />

      {/* Hidden Screens (not shown in tab bar) */}
      <Tabs.Screen
        name="add-restaurant"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Uses custom header in the screen
        }}
      />

      {/* Edit Restaurant (dynamic route) */}
      <Tabs.Screen
        name="edit-restaurant/[id]"
        options={{
          href: null, // Hide from tab bar
          headerShown: false, // Uses custom header in the screen
        }}
      />
      <Tabs.Screen
        name="restaurant/[id]/menu"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="restaurant/[id]/menu-item"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}