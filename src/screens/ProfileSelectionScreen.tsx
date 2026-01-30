import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchProfiles, setActiveProfile, createProfile, updateProfile, deleteProfile } from '../store/slices/profileSlice';

export default function ProfileSelectionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { profiles, activeProfile } = useSelector((state: RootState) => state.profile);
  const navigation: any = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [isKids, setIsKids] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert('Notice', message);
    }
  };

  // Local avatars available in the assets folder
  const localAvatars: Record<string, any> = {
    'Profile 1.png': require('../../assets/Profile 1.png'),
    'Profile 2.png': require('../../assets/Profile 2.png'),
    'Profile 3.png': require('../../assets/Profile 3.png'),
    'Profile 4.png': require('../../assets/Profile 4.png'),
    'Profile 5.png': require('../../assets/Profile 5.png'),
  };
  const localAvatarNames = Object.keys(localAvatars);

  useEffect(() => {
    dispatch(fetchProfiles());
  }, []);

  const handleSelectProfile = (profile: any) => {
    dispatch(setActiveProfile(profile));
    navigation.navigate('Main');
  };

  const renderProfile = ({ item }: any) => (
    <View style={styles.profileCard}>
      <TouchableOpacity onPress={() => handleSelectProfile(item)}>
        <Image
          source={
            item.avatar && localAvatars[item.avatar]
              ? localAvatars[item.avatar]
              : { uri: item.avatar }
          }
          style={styles.avatar}
        />
      </TouchableOpacity>
      <Text style={styles.profileName}>{item.name}</Text>
      {item.isKids && <Text style={styles.kidsLabel}>Kids</Text>}
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => {
            setEditingProfileId(item._id);
            setNewName(item.name);
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Delete Profile', 'Are you sure you want to delete this profile?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await dispatch(deleteProfile(item._id)).unwrap();
                    // If deleted profile was active, choose first remaining
                    if (activeProfile && activeProfile._id === item._id && profiles.length > 1) {
                      const next = profiles.find((p) => p._id !== item._id);
                      if (next) dispatch(setActiveProfile(next));
                    }
                  } catch (err: any) {
                    const message = typeof err === 'string' ? err : err?.message || 'Failed to delete profile';
                    Alert.alert('Delete Failed', message);
                  }
                },
              },
            ]);
          }}
        >
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Who's watching?</Text>
      </View>
      <FlatList
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
      {profiles.length < 5 && (
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Add Profile</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingProfileId ? 'Edit Profile' : 'Create Profile'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Profile name"
              placeholderTextColor="#888"
              value={newName}
              onChangeText={setNewName}
            />
            {!editingProfileId && (
              <View style={styles.kidsRow}>
                <Text style={styles.kidsLabel}>Kids profile</Text>
                <Switch value={isKids} onValueChange={setIsKids} />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={async () => {
                  if (!newName.trim()) {
                    showToast('Please enter a profile name');
                    return;
                  }
                  const trimmed = newName.trim();
                  if (trimmed.length < 2 || trimmed.length > 50) {
                    showToast('Profile name must be between 2 and 50 characters');
                    return;
                  }
                  try {
                    setIsSubmitting(true);
                    if (editingProfileId) {
                      await dispatch(updateProfile({ profileId: editingProfileId, name: trimmed })).unwrap();
                    } else {
                      const rand = localAvatarNames[Math.floor(Math.random() * localAvatarNames.length)];
                      await dispatch(
                        createProfile({ name: trimmed, isKids, avatar: rand })
                      ).unwrap();
                    }
                    setNewName('');
                    setIsKids(false);
                    setEditingProfileId(null);
                    setModalVisible(false);
                    // Ensure fresh list from server
                    dispatch(fetchProfiles());
                  } catch (err: any) {
                    const message = typeof err === 'string' ? err : err?.message || 'Failed to create profile';
                    showToast(message);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
    marginTop: 50,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  list: {
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    margin: 20,
    width: 120,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  actionText: {
    color: '#E5E5E5',
    fontSize: 13,
  },
  deleteText: {
    color: '#E50914',
    fontWeight: '600',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  kidsLabel: {
    color: '#808080',
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 16,
  },
  addButtonText: {
    color: '#808080',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  kidsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  submitButton: {
    backgroundColor: '#E50914',
  },
  cancelText: {
    color: '#fff',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
