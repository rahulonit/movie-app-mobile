import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
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

  const header = (
    <>
      <View style={styles.heroSection}>
        <Image
          source={{ uri: currentSeries.poster.horizontal }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{currentSeries.title}</Text>
        <TouchableOpacity
          style={[styles.myListButton, inMyList && styles.myListButtonActive]}
          onPress={handleToggleMyList}
        >
          <Text style={styles.myListButtonText}>
            {inMyList ? "✓ In My List" : "+ My List"}
          </Text>
        </TouchableOpacity>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{currentSeries.releaseYear}</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{currentSeries.maturityRating}</Text>
          {currentSeries.isPremium && (
            <>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.premium}>PREMIUM</Text>
            </>
          )}
        </View>
        <Text style={styles.description}>{currentSeries.description}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Language:</Text>
          <Text style={styles.detailValue}>{currentSeries.language}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Genres:</Text>
          <Text style={styles.detailValue}>
            {(currentSeries.genres || []).join(", ")}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Seasons</Text>
        </View>
        <FlatList
          data={currentSeries.seasons || []}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any) => `season-${item.seasonNumber}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.seasonPill,
                activeSeason === item.seasonNumber && styles.seasonPillActive,
              ]}
              onPress={() => setActiveSeason(item.seasonNumber)}
            >
              <Text
                style={[
                  styles.seasonPillText,
                  activeSeason === item.seasonNumber &&
                    styles.seasonPillTextActive,
                ]}
              >
                Season {item.seasonNumber}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.seasonScroller}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Episodes</Text>
        </View>
      </View>
    </>
  );

  return (
    <FlatList
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#fff"
        />
      }
      data={selectedSeason?.episodes || []}
      keyExtractor={(item: any) =>
        item._id || `${selectedSeason?.seasonNumber}-${item.episodeNumber}`
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.episodeCard}
          onPress={() =>
            handlePlayEpisode({
              ...item,
              seasonNumber: selectedSeason?.seasonNumber,
            })
          }
        >
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.episodeThumb}
            resizeMode="cover"
          />
          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle}>
              E{item.episodeNumber}: {item.title}
            </Text>
            <Text style={styles.episodeMeta}>{item.duration} min</Text>
            <Text style={styles.episodeDesc} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={[styles.emptyText, { paddingHorizontal: 16 }]}>
          No episodes available.
        </Text>
      }
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
    myListButton: {
      backgroundColor: '#3a3a3a',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 12,
    },
    myListButtonActive: {
      borderWidth: 1,
      borderColor: '#fff',
    },
    myListButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
  heroSection: {
    position: "relative",
    height: 200,
    marginTop: 50,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 24,
  },
  content: {
    padding: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  metaText: {
    color: "#808080",
    fontSize: 14,
  },
  premium: {
    color: "#E50914",
    fontWeight: "bold",
    fontSize: 12,
  },
  description: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    color: "#808080",
    fontSize: 14,
    width: 90,
  },
  detailValue: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
    flexWrap: "wrap",
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  seasonScroller: {
    marginBottom: 10,
  },
  seasonPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 10,
    backgroundColor: "#111",
  },
  seasonPillActive: {
    borderColor: "#E50914",
    backgroundColor: "#1a1a1a",
  },
  seasonPillText: {
    color: "#fff",
    fontSize: 14,
  },
  seasonPillTextActive: {
    color: "#E50914",
    fontWeight: "bold",
  },
  episodeCard: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#111",
    borderRadius: 8,
    overflow: "hidden",
  },
  episodeThumb: {
    width: 140,
    height: 90,
  },
  episodeInfo: {
    flex: 1,
    padding: 10,
  },
  episodeTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  episodeMeta: {
    color: "#808080",
    fontSize: 12,
    marginBottom: 4,
  },
  episodeDesc: {
    color: "#ccc",
    fontSize: 13,
  },
  emptyText: {
    color: "#808080",
    fontSize: 14,
    marginTop: 8,
  },
});
