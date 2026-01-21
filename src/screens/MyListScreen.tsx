import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchMyList } from '../store/slices/profileSlice';

export default function MyListScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { activeProfile, myList } = useSelector((state: RootState) => state.profile);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      dispatch(fetchMyList(activeProfile._id));
    }
  }, [activeProfile]);

  const onRefresh = async () => {
    if (!activeProfile) return;
    setRefreshing(true);
    try {
      await dispatch(fetchMyList(activeProfile._id)).unwrap();
    } catch (e) {
      // no-op; errors handled by thunk
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        const screenName = item.seasons ? 'SeriesDetail' : 'MovieDetail';
        navigation.navigate(screenName, { id: item._id });
      }}
    >
      <Image
        source={{ uri: item.poster?.vertical }}
        style={styles.poster}
        resizeMode="cover"
      />
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My List</Text>
      {myList.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your list is empty</Text>
          <Text style={styles.emptySubtext}>
            Add movies and series to watch them later
          </Text>
        </View>
      ) : (
        <FlatList
          data={myList}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={3}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    padding: 16,
    paddingTop: 60,
  },
  list: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    maxWidth: '31%',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#808080',
    fontSize: 14,
    textAlign: 'center',
  },
});
