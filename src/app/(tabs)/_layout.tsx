import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

/**
 * Tab layout for the main authenticated app
 * Contains: Home, Discover, Add Recipe (elevated), Favourites, and Profile tabs
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E8505B',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
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
          backgroundColor: '#FFFFFF',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        headerTintColor: '#E8505B',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <View style={styles.headerLeft}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person-circle" size={32} color="#E8505B" />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={color} 
            />
          ),
          headerTitle: '',
        }}
      />

      {/* Discover Tab (Map) */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'compass' : 'compass-outline'} 
              size={26} 
              color={color} 
            />
          ),
          headerTitle: '',
        }}
      />

      {/* Add Recipe Tab - Elevated circular button */}
      <Tabs.Screen
        name="addRecipe"
        options={({ navigation }) => ({
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButtonContainer}>
              <View style={[styles.addButton, focused && styles.addButtonFocused]}>
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </View>
            </View>
          ),
          headerTitle: 'Add Recipe',
          tabBarLabel: () => null,
          headerLeft: () => (
            <View style={{ marginLeft: 16 }}>
              <Ionicons 
                name="close" 
                size={28} 
                color="#333" 
                onPress={() => navigation.navigate('index')}
              />
            </View>
          ),
          headerRight: () => null,
        })}
      />

      {/* Favourites Tab */}
      <Tabs.Screen
        name="favourites"
        options={{
          title: 'Favourites',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'bookmark' : 'bookmark-outline'} 
              size={24} 
              color={color} 
            />
          ),
          headerTitle: '',
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
          headerTitle: '',
          headerRight: () => (
            <TouchableOpacity 
              style={{ marginRight: 16 }}
              onPress={() => {
                // You can add settings navigation here
                // router.push('/settings')
              }}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    marginLeft: -17,
  },
  logo: {
    width: 180,
    height: 140,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  iconButton: {
    padding: 4,
  },
  profileButton: {
    padding: 0,
  },
  addButtonContainer: {
    position: 'absolute',
    top: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8505B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#E8505B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  addButtonFocused: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.4,
  },
});
