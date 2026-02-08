import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../store/slices/authSlice';
import { setActiveProfile } from '../store/slices/profileSlice';

export default function AccountScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation: any = useNavigation();
  const { user, isLoggingOut } = useSelector((state: RootState) => state.auth);
  const { activeProfile } = useSelector((state: RootState) => state.profile);

  const handleManageProfiles = () => {
    navigation.navigate('ProfileSelection');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(logout()).unwrap();
          } catch (err: any) {
            const message = typeof err === 'string' ? err : err?.message || 'Logout failed';
            Alert.alert('Logout failed', message);
          }
        },
      },
    ]);
  };


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Account</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{activeProfile?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>
            {activeProfile?.isKids ? 'Kids' : 'Adult'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Subscription:</Text>
          <Text
            style={[
              styles.value,
              user?.subscription.plan === 'PREMIUM'
                ? styles.premium
                : styles.free,
            ]}
          >
            {user?.subscription.plan}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleManageProfiles}>
        <Text style={styles.buttonText}>Manage Profiles</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        <Text style={styles.buttonText}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  header: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: '800',
    padding: 16,
    paddingTop: 60,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b2b',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#b3b3b3',
    fontSize: 16,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  premium: {
    color: '#E50914',
  },
  free: {
    color: '#b3b3b3',
  },
  button: {
    backgroundColor: '#2b2b2b',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#E50914',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  version: {
    color: '#8f8f8f',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 12,
  },
});
