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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchHomeFeed } from '../store/slices/contentSlice';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 16 * 2 - 12) / 2; // padding * 2 + gap

const SECTION_CONFIG = [
  { key: 'newReleases', title: 'New Releases' },
  { key: 'actionMovies', title: 'Action Movies' },
  { key: 'comedyMovies', title: 'Comedy Movies' },
];

export default function CategoryScreen({ route, navigation }: any) {
  const initialCategoryKey = route.params?.initialCategoryKey as string | undefined;
  const dispatch = useDispatch<AppDispatch>();
  const { homeFeed, isLoading } = useSelector((state: RootState) => state.content);

  const sections = useMemo(
    () =>
      SECTION_CONFIG.map((section) => ({
        ...section,
        data: (homeFeed as any)?.[section.key] || [],
      })).filter((section) => Array.isArray(section.data) && section.data.length > 0),
    [homeFeed]
  );

  const [activeCategory, setActiveCategory] = useState<string | null>(
    initialCategoryKey || null
  );

  useEffect(() => {
    if (!homeFeed) {
      dispatch(fetchHomeFeed());
    }
  }, [homeFeed, dispatch]);

  useEffect(() => {
    if (sections.length === 0) return;
    if (activeCategory && sections.some((s) => s.key === activeCategory)) return;

    if (initialCategoryKey && sections.some((s) => s.key === initialCategoryKey)) {
      setActiveCategory(initialCategoryKey);
    } else {
      setActiveCategory(sections[0].key);
    }
  }, [sections, activeCategory, initialCategoryKey]);

  const activeSection = sections.find((section) => section.key === activeCategory);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        const screenName = item.seasons ? 'SeriesDetail' : 'MovieDetail';
        navigation.navigate(screenName, { id: item._id });
      }}
    >
      <Image
        source={{ uri: item.poster?.vertical || item.poster?.vertical }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Categories</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryChips}
      >
        {sections.map((section) => {
          const isActive = section.key === activeCategory;
          return (
            <TouchableOpacity
              key={section.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveCategory(section.key)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {section.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!activeSection ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isLoading ? 'Loading categories...' : 'No categories available yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeSection.data}
          numColumns={2}
          keyExtractor={(item: any, index: number) => `${item._id || item.id}-${index}`}
          renderItem={renderItem}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { paddingTop: 16 }]}>No items in this category.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  categoryChips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#333',
    borderColor: '#fff',
  },
  chipText: {
    color: '#bbb',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#202020',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
});
