import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchHomeFeed } from '../store/slices/contentSlice';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.35;

export default function HomeScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { homeFeed, isLoading } = useSelector((state: RootState) => state.content);
  const { activeProfile } = useSelector((state: RootState) => state.profile);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('All');

  useEffect(() => {
    dispatch(fetchHomeFeed());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchHomeFeed()).unwrap();
    } catch (e) {
      // no-op; error is handled by slice
    } finally {
      setRefreshing(false);
    }
  };

  const renderContentItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.contentCard}
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
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: any[]) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={data}
          renderItem={renderContentItem}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Home</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="download-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {['Shows', 'Movies', 'Categories'].map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {tab === 'Categories' && (
              <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4 }} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      {/* Featured Content */}
      {homeFeed?.trending?.[0] && (
        <View style={styles.featuredCard}>
          <Image
            source={{ uri: homeFeed.trending[0].poster?.horizontal }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(40, 40, 40, 0)', 'rgba(40, 40, 40, 0.8)', '#282828']}
            style={styles.featuredGradient}
          />
          <View style={styles.featuredContent}>
            <View style={styles.featuredInfo}>
              
              <View style={styles.featuredTextContainer}>
                <Text style={styles.featuredTitle}>
                  {homeFeed.trending[0].title}
                </Text>
                <View style={styles.tags}>
                  {homeFeed.trending[0].genres?.slice(0, 3).map((genre: string, index: number) => (
                    <Text key={index} style={styles.tag_genre}>{genre}</Text>
                  ))}
                  {homeFeed.trending[0].language && (
                    <Text style={styles.tagDot}>•</Text>
                  )}
                  {homeFeed.trending[0].language && (
                    <Text style={styles.tag}>Language: {homeFeed.trending[0].language}</Text>
                  )}
                  {homeFeed.trending[0].releaseYear && (
                    <Text style={styles.tagDot}>•</Text>
                  )}
                  {homeFeed.trending[0].releaseYear && (
                    <Text style={styles.tag}>Release:{homeFeed.trending[0].releaseYear}</Text>
                  )}
                  {homeFeed.trending[0].maturityRating && (
                    <Text style={styles.tagDot}>•</Text>
                  )}
                  {homeFeed.trending[0].maturityRating && (
                    <Text style={styles.tag}>Maturity: {homeFeed.trending[0].maturityRating}</Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.featuredButtons}>
              <TouchableOpacity
                style={styles.getButton}
                onPress={() =>
                  navigation.navigate('VideoPlayer', {
                    id: homeFeed.trending[0]._id,
                    type: 'movie',
                  })
                }
              >
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.getButtonText}>Watch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.myListButton}>
                <Text style={styles.myListButtonText}>+ My List</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Content Sections */}
      {renderSection('Trending Now', homeFeed?.trending)}
      {renderSection('New Releases', homeFeed?.newReleases)}
      {renderSection('Continue Watching', homeFeed?.continueWatching)}
      {renderSection('Action Movies', homeFeed?.actionMovies)}
      {renderSection('Comedy Movies', homeFeed?.comedyMovies)}
      {renderSection('Trending Series', homeFeed?.trendingSeries)}
      
      <View style={{ height: 100 }} />
    </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#181818',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoN: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E50914',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'transparent',
    borderColor: '#fff',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  featuredCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    height: 450,
    alignContent: 'center',
  },
  featuredImage: {
    width: '100%',
    height: 450,
    position: 'absolute',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  featuredContent: {
    padding: 16,
  },
  featuredInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  
  featuredTextContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    color: '#999',
    fontSize: 12,
  },
  tag_genre: {
    color: '#fff',
    backgroundColor: '#666',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
  tagDot: {
    color: '#999',
    fontSize: 12,
    marginHorizontal: 4,
  },
  featuredButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  getButton: {
    backgroundColor: '#4a4a4a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  getButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  myListButton: {
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myListButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  contentCard: {
    marginRight: 8,
    width: ITEM_WIDTH,
  },
  poster: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.5,
    borderRadius: 8,
  },
});
