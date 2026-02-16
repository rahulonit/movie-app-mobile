import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchHomeFeed } from '../store/slices/contentSlice';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 16 * 2 - 12) / 2; // padding * 2 + gap


// Preset genre chips to show (in this order)
const PRESET_GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Thriller',
  'Romance',
  'Sci-Fi',
  'Fantasy',
  'Documentary',
  'Animation',
  'Crime',
  'Mystery',
  'Adventure',
  'Family',
  'Musical',
  'War',
  'Western',
  'Biography',
  'Sports',
];
 
export default function CategoryScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { homeFeed, isLoading } = useSelector((state: RootState) => state.content);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchHomeFeed());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchHomeFeed()).unwrap();
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const allItems = useMemo(() => {
    if (!homeFeed) return [];
    const items: any[] = [];
    Object.keys(homeFeed).forEach((k) => {
      const v = (homeFeed as any)[k];
      if (Array.isArray(v)) {
        v.forEach((it: any) => { if (it) items.push(it); });
      }
    });
    const map = new Map();
    items.forEach((i) => map.set(i._id || i.id, i));
    return Array.from(map.values());
  }, [homeFeed]);

  const genres = useMemo(() => {
    const set = new Set<string>(PRESET_GENRES);
    allItems.forEach((it: any) => {
      (it.genres || []).forEach((g: string) => set.add(g));
    });
    return ['All', ...Array.from(set)];
  }, [allItems]);

  const filtered = useMemo(() => {
    if (!selectedGenre || selectedGenre === 'All') return allItems;
    return allItems.filter((it: any) => (it.genres || []).some((g: string) => g.toLowerCase() === selectedGenre.toLowerCase()));
  }, [allItems, selectedGenre]);

  const renderCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        const screenName = item.seasons ? 'SeriesDetail' : 'MovieDetail';
        navigation.navigate(screenName, { id: item._id });
      }}
    >
      <View style={styles.cardImageWrapper}>
        <Image
          source={{ uri: item.poster?.vertical || item.poster?.horizontal }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={[styles.typeBadge, item.seasons ? styles.typeSeries : styles.typeMovie]}>
          <Text style={styles.typeBadgeText}>{item.seasons ? 'Series' : 'Movie'}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Categories</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pillsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {genres.map((g) => {
            const active = (selectedGenre === null && g === 'All') || selectedGenre === g;
            return (
              <TouchableOpacity
                key={g}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setSelectedGenre(g === 'All' ? null : g)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderCard}
        keyExtractor={(item: any, idx) => `${item._id || item.id}-${idx}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items found for this genre.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#141414',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#E50914', fontSize: 24, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 4 },
  pillsWrapper: { paddingVertical: 12 },
  pillsScroll: { paddingLeft: 16, paddingRight: 12, alignItems: 'center', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  pillText: { color: '#cfcfcf', fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 48 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    alignItems: 'center',
  },
  cardImageWrapper: { width: '100%', height: CARD_WIDTH * 1.45, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  typeMovie: { backgroundColor: '#E50914' },
  typeSeries: { backgroundColor: '#4A90E2' },
  cardTitle: { color: '#fff', fontSize: 12, fontWeight: '600', padding: 8, textAlign: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' },
});
