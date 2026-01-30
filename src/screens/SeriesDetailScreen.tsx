import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { AppDispatch, RootState } from "../store";
import { fetchSeriesById } from "../store/slices/contentSlice";
import {
  addToMyList,
  removeFromMyList,
  fetchMyList,
} from "../store/slices/profileSlice";

export default function SeriesDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { currentSeries, isLoading, error } = useSelector(
    (state: RootState) => state.content,
  );
  const { activeProfile, myList } = useSelector(
    (state: RootState) => state.profile,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [inMyList, setInMyList] = useState(false);
  const [activeTab, setActiveTab] = useState<'episodes' | 'trailers' | 'more'>('episodes');
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [isRated, setIsRated] = useState(false);

  useEffect(() => {
    console.log("SeriesDetailScreen: Fetching series with id:", id);
    dispatch(fetchSeriesById(id)).then((result) => {
      console.log("SeriesDetailScreen: Fetch result:", result);
      if (result.type.endsWith("/rejected")) {
        console.error(
          "SeriesDetailScreen: Failed to fetch series:",
          result.payload,
        );
      } else {
        console.log(
          "SeriesDetailScreen: Series loaded successfully:",
          result.payload,
        );
      }
    });
  }, [id]);

  useEffect(() => {
    if (currentSeries?.seasons?.length) {
      setActiveSeason(currentSeries.seasons[0].seasonNumber);
    }
  }, [currentSeries]);

  useEffect(() => {
    if (activeProfile) {
      dispatch(fetchMyList(activeProfile._id));
    }
  }, [activeProfile, dispatch]);

  useEffect(() => {
    if (currentSeries && myList) {
      setInMyList(myList.some((item: any) => item._id === currentSeries._id));
    }
  }, [currentSeries, myList]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchSeriesById(id)).unwrap();
    } catch (e) {
      // errors handled by slice
    } finally {
      setRefreshing(false);
    }
  };

  const selectedSeason = useMemo(() => {
    if (!currentSeries?.seasons) return null;
    return (
      currentSeries.seasons.find((s: any) => s.seasonNumber === activeSeason) ||
      null
    );
  }, [currentSeries, activeSeason]);

  const handlePlayEpisode = (episode: any) => {
    if (!currentSeries) return;
    navigation.navigate("VideoPlayer", {
      cloudflareVideoId: episode.cloudflareVideoId,
      title: `${currentSeries.title} - S${episode.seasonNumber || activeSeason}E${episode.episodeNumber}`,
      contentId: currentSeries._id,
      contentType: "Series",
      episodeId: episode._id,
    });
  };

  const handleToggleMyList = async () => {
    if (!currentSeries || !currentSeries._id) return;
    if (!activeProfile) {
      Alert.alert("Profile required", "Please select a profile to use My List.");
      return;
    }

    try {
      if (inMyList) {
        await dispatch(
          removeFromMyList({
            profileId: activeProfile._id,
            contentId: currentSeries._id,
          }),
        ).unwrap();
        setInMyList(false);
      } else {
        await dispatch(
          addToMyList({
            profileId: activeProfile._id,
            contentId: currentSeries._id,
          }),
        ).unwrap();
        setInMyList(true);
      }
      await dispatch(fetchMyList(activeProfile._id)).unwrap();
    } catch (err: any) {
      const message =
        typeof err === "string"
          ? err
          : err?.message || err?.toString?.() || "Unable to update My List";
      Alert.alert("Error", message);
    }
  };

  if (!currentSeries || isLoading) {
    console.log(
      "SeriesDetailScreen: Loading state - currentSeries:",
      !!currentSeries,
      "isLoading:",
      isLoading,
      "error:",
      error,
    );
    return (
      <View style={[styles.container, styles.centered]}>
        {error ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={styles.loadingText}>Error: {error}</Text>
            <TouchableOpacity
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#E50914",
                borderRadius: 4,
              }}
              onPress={() => dispatch(fetchSeriesById(id))}
            >
              <Text style={{ color: "#fff" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading...</Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
        />
      }
    >
      {/* Hero Section with Vertical Poster */}
      <View style={styles.heroSection}>
        <Image
          source={{ uri: currentSeries.poster.vertical || currentSeries.poster.horizontal }}
          style={styles.heroPoster}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topRightButtons}>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
              <Ionicons name="download-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: '35%' }]} />
        </View>
      </View>

      {/* Series Info */}
      <View style={styles.infoSection}>
        <Text style={styles.seriesTitle}>{currentSeries.title}</Text>
        
        {/* Metadata Badges */}
        <View style={styles.metadataRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currentSeries.releaseYear}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currentSeries.maturityRating}</Text>
          </View>
          <TouchableOpacity 
            style={styles.badge}
            onPress={() => setShowSeasonPicker(true)}
          >
            <Text style={styles.badgeText}>
              {currentSeries.seasons?.length || 0} Seasons
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Large Play Button */}
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => selectedSeason?.episodes?.[0] && handlePlayEpisode({
            ...selectedSeason.episodes[0],
            seasonNumber: selectedSeason.seasonNumber,
          })}
        >
          <Ionicons name="play" size={24} color="#000" />
          <Text style={styles.playButtonText}>Resume</Text>
        </TouchableOpacity>

        {/* Description */}
        <Text style={styles.seriesDescription}>
          {currentSeries.plot || currentSeries.description}
        </Text>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleToggleMyList}
          >
            <View style={styles.actionIcon}>
              <Ionicons 
                name={inMyList ? "checkmark" : "add"} 
                size={24} 
                color="#fff" 
              />
            </View>
            <Text style={styles.actionLabel}>My List</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setIsRated(!isRated)}
          >
            <View style={styles.actionIcon}>
              <Ionicons 
                name={isRated ? "thumbs-up" : "thumbs-up-outline"} 
                size={24} 
                color="#fff" 
              />
            </View>
            <Text style={styles.actionLabel}>Rate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs Navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'episodes' && styles.tabActive]}
            onPress={() => setActiveTab('episodes')}
          >
            <Text style={[styles.tabText, activeTab === 'episodes' && styles.tabTextActive]}>
              Episodes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trailers' && styles.tabActive]}
            onPress={() => setActiveTab('trailers')}
          >
            <Text style={[styles.tabText, activeTab === 'trailers' && styles.tabTextActive]}>
              Trailers & More
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'more' && styles.tabActive]}
            onPress={() => setActiveTab('more')}
          >
            <Text style={[styles.tabText, activeTab === 'more' && styles.tabTextActive]}>
              More Like This
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Episodes Section */}
      {activeTab === 'episodes' && (
        <View style={styles.episodesSection}>
          {/* Season Selector */}
          <TouchableOpacity 
            style={styles.seasonSelector}
            onPress={() => setShowSeasonPicker(true)}
          >
            <Text style={styles.seasonSelectorText}>
              Season {activeSeason}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Episodes List */}
          {(selectedSeason?.episodes || []).map((episode: any, index: number) => (
            <TouchableOpacity
              key={episode._id || `episode-${index}`}
              style={styles.episodeItem}
              onPress={() => handlePlayEpisode({
                ...episode,
                seasonNumber: selectedSeason?.seasonNumber,
              })}
            >
              <View style={styles.episodeThumbnailContainer}>
                <Image
                  source={{ uri: episode.thumbnail }}
                  style={styles.episodeThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                </View>
                {/* Episode Progress */}
                <View style={styles.episodeProgressContainer}>
                  <View style={[styles.episodeProgress, { width: '45%' }]} />
                </View>
              </View>

              <View style={styles.episodeDetails}>
                <View style={styles.episodeHeader}>
                  <Text style={styles.episodeNumber}>{index + 1}. {episode.title}</Text>
                  <Text style={styles.episodeDuration}>{episode.duration}m</Text>
                </View>
                <Text style={styles.episodeDescription} numberOfLines={3}>
                  {episode.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {(!selectedSeason?.episodes || selectedSeason.episodes.length === 0) && (
            <Text style={styles.emptyText}>No episodes available.</Text>
          )}
        </View>
      )}

      {/* Trailers Tab */}
      {activeTab === 'trailers' && (
        <View style={styles.emptyTabContent}>
          <Ionicons name="film-outline" size={48} color="#666" />
          <Text style={styles.emptyTabText}>No trailers available</Text>
        </View>
      )}

      {/* More Like This Tab */}
      {activeTab === 'more' && (
        <View style={styles.emptyTabContent}>
          <Ionicons name="apps-outline" size={48} color="#666" />
          <Text style={styles.emptyTabText}>No recommendations available</Text>
        </View>
      )}

      {/* Season Picker Modal */}
      <Modal
        visible={showSeasonPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeasonPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Season</Text>
              <TouchableOpacity onPress={() => setShowSeasonPicker(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(currentSeries.seasons || []).map((season: any) => (
                <TouchableOpacity
                  key={season.seasonNumber}
                  style={[
                    styles.seasonOption,
                    activeSeason === season.seasonNumber && styles.seasonOptionActive
                  ]}
                  onPress={() => {
                    setActiveSeason(season.seasonNumber);
                    setShowSeasonPicker(false);
                  }}
                >
                  <Text style={[
                    styles.seasonOptionText,
                    activeSeason === season.seasonNumber && styles.seasonOptionTextActive
                  ]}>
                    Season {season.seasonNumber}
                  </Text>
                  {activeSeason === season.seasonNumber && (
                    <Ionicons name="checkmark" size={24} color="#E50914" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  
  // Hero Section
  heroSection: {
    position: 'relative',
    height: 500,
    width: '100%',
  },
  heroPoster: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  topNav: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topRightButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E50914',
  },

  // Info Section
  infoSection: {
    padding: 16,
  },
  seriesTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Play Button
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 6,
    marginBottom: 16,
    gap: 8,
  },
  playButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Description
  seriesDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    color: '#999',
    fontSize: 12,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#E50914',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  
  // Episodes Section
  episodesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  seasonSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginBottom: 16,
  },
  seasonSelectorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Episode Item
  episodeItem: {
    marginBottom: 20,
  },
  episodeThumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  episodeThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodeProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  episodeProgress: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  episodeDetails: {
    paddingHorizontal: 4,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  episodeNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  episodeDuration: {
    color: '#999',
    fontSize: 14,
  },
  episodeDescription: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Empty States
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTabText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seasonOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  seasonOptionActive: {
    backgroundColor: 'rgba(229,9,20,0.1)',
  },
  seasonOptionText: {
    color: '#999',
    fontSize: 16,
  },
  seasonOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
