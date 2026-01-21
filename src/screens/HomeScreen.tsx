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

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.35;

export default function HomeScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { homeFeed, isLoading } = useSelector((state: RootState) => state.content);
  const [refreshing, setRefreshing] = useState(false);

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
        <Text style={styles.sectionTitle}>{title}</Text>
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
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      {/* Featured Content */}
      {homeFeed?.trending?.[0] && (
        <View style={styles.featured}>
          <Image
            source={{ uri: homeFeed.trending[0].poster?.horizontal }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredTitle}>
              {homeFeed.trending[0].title}
            </Text>
            <View style={styles.featuredButtons}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() =>
                  navigation.navigate('VideoPlayer', {
                    id: homeFeed.trending[0]._id,
                    type: 'movie',
                  })
                }
              >
                <Text style={styles.playButtonText}>▶ Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.listButton}>
                <Text style={styles.listButtonText}>+ My List</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  featured: {
    width: '100%',
    height: 500,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuredButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
  },
  playButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  listButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
  },
  listButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
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
