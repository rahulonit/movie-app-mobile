import React, { useEffect, useMemo, useState } from 'react';
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
	Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootState, AppDispatch } from '../store';
import { fetchHomeFeed, fetchRecommendations } from '../store/slices/contentSlice';
import { addToMyList, fetchMyList, removeFromMyList } from '../store/slices/profileSlice';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.35;
const FEATURE_CARD_WIDTH = width * 0.85;
const FEATURE_CARD_SPACING = 12;
const GRID_PADDING = 16;
const GRID_GAP = 8;
const GRID_ITEM_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

export default function HomeScreen({ navigation }: any) {
	const dispatch = useDispatch<AppDispatch>();
	const { homeFeed, recommendations, isLoading } = useSelector((state: RootState) => state.content);
	const { activeProfile, myList } = useSelector((state: RootState) => state.profile);

	// Fetch recommendations on mount and when activeProfile changes
	useEffect(() => {
		if (activeProfile && activeProfile._id) {
			dispatch(fetchRecommendations(activeProfile._id));
		}
	}, [activeProfile, dispatch]);

	const [refreshing, setRefreshing] = useState(false);
	const [selectedTab, setSelectedTab] = useState('Series');
	const [featuredIndex, setFeaturedIndex] = useState(0);
	const [gridVisibleCount, setGridVisibleCount] = useState(24);

	// helper to filter items by the selected tab
	const filterByTab = (items: any[] | undefined) => {
		if (!items) return items || [];
		if (selectedTab === 'Series') return items.filter((i: any) => !!i?.seasons);
		if (selectedTab === 'Movies') return items.filter((i: any) => !i?.seasons);
		return items;
	};

	// aggregate helpers
	const collectAllMovies = () => {
		const movieKeys = ['actionMovies', 'comedyMovies', 'newReleases', 'trending'];
		const items: any[] = [];
		movieKeys.forEach((k) => {
			const arr = (homeFeed as any)?.[k] || [];
			arr.forEach((it: any) => {
				if (!it) return;
				if (!it.seasons) items.push(it);
			});
		});
		// dedupe by _id
		const map = new Map();
		items.forEach((i) => map.set(i._id || i.id, i));
		return Array.from(map.values());
	};

	const collectAllSeries = () => {
		const seriesKeys = ['trendingSeries'];
		const items: any[] = [];
		seriesKeys.forEach((k) => {
			const arr = (homeFeed as any)?.[k] || [];
			arr.forEach((it: any) => {
				if (!it) return;
				if (it.seasons) items.push(it);
			});
		});
		const map = new Map();
		items.forEach((i) => map.set(i._id || i.id, i));
		return Array.from(map.values());
	};

	useEffect(() => {
		dispatch(fetchHomeFeed());
	}, [dispatch]);

	useEffect(() => {
		if (activeProfile) {
			dispatch(fetchMyList(activeProfile._id));
		}
	}, [activeProfile, dispatch]);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await dispatch(fetchHomeFeed()).unwrap();
			if (activeProfile) {
				await dispatch(fetchMyList(activeProfile._id)).unwrap();
			}
		} catch (e) {
			// errors handled by slices
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
				source={{ uri: item.poster?.vertical || item.poster?.horizontal }}
				style={styles.poster}
				resizeMode="cover"
			/>
		</TouchableOpacity>
	);

	const renderSection = (title: string, data: any[], sectionKey: string) => {
		if (!data || data.length === 0) return null;

		return (
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>{title}</Text>
				</View>
				<FlatList
					horizontal
					data={data}
					renderItem={renderContentItem}
					keyExtractor={(item, index) => `${item._id || 'item'}-${index}`}
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.list}
				/>
			</View>
		);
	};

	const renderGridItem = ({ item }: any) => (
		<TouchableOpacity
			style={styles.gridCard}
			onPress={() => {
				const screenName = item.seasons ? 'SeriesDetail' : 'MovieDetail';
				navigation.navigate(screenName, { id: item._id });
			}}
		>
			<Image
				source={{ uri: item.poster?.vertical || item.poster?.horizontal }}
				style={styles.gridImage}
				resizeMode="cover"
			/>
			<Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
		</TouchableOpacity>
	);

	const featuredItems = useMemo(() => {
		// Build featured list depending on selected tab.
		// For 'All' show the latest items across both movies and series.
		let list: any[] = [];

		if (selectedTab === 'All') {
			const movies = homeFeed?.trending || [];
			const series = homeFeed?.trendingSeries || [];
			list = [...movies, ...series].filter(Boolean);
			// sort newest first by releaseYear when available
			list.sort((a: any, b: any) => (b.releaseYear || 0) - (a.releaseYear || 0));
		} else if (selectedTab === 'Movies') {
			list = (homeFeed?.trending || []).filter(Boolean).sort((a: any, b: any) => (b.releaseYear || 0) - (a.releaseYear || 0));
		} else if (selectedTab === 'Series') {
			list = (homeFeed?.trendingSeries || []).filter(Boolean).sort((a: any, b: any) => (b.releaseYear || 0) - (a.releaseYear || 0));
		} else {
			// fallback: use trending but apply existing tab filter
			list = filterByTab(homeFeed?.trending || []);
		}

		// dedupe by id and keep order
		const seen = new Set();
		const deduped: any[] = [];
		for (const it of list) {
			const id = it?._id || it?.id;
			if (!id) continue;
			if (!seen.has(id)) {
				seen.add(id);
				deduped.push(it);
			}
		}

		return deduped.slice(0, 4);
	}, [homeFeed, selectedTab]);

	const handleFeaturedScroll = (event: any) => {
		const offsetX = event.nativeEvent.contentOffset.x;
		const index = Math.round(offsetX / (FEATURE_CARD_WIDTH + FEATURE_CARD_SPACING));
		setFeaturedIndex(Math.min(Math.max(index, 0), Math.max(featuredItems.length - 1, 0)));
	};

	const isInMyList = (contentId: string) =>
		(myList || []).some((entry: any) => entry._id === contentId);

	const handleToggleMyList = async (item: any) => {
		if (!item || !item._id) {
			Alert.alert('Unavailable', 'This item is missing an id and cannot be saved.');
			return;
		}
		if (!activeProfile || !activeProfile._id) {
			Alert.alert('Profile required', 'Please select a profile to use My List.');
			return;
		}

		try {
			if (isInMyList(item._id)) {
				await dispatch(
					removeFromMyList({ profileId: activeProfile._id, contentId: item._id })
				).unwrap();
			} else {
				const contentType = item.seasons ? 'Series' : 'Movie';
				await dispatch(addToMyList({ profileId: activeProfile._id, contentId: item._id, contentType })).unwrap();
			}
			await dispatch(fetchMyList(activeProfile._id)).unwrap();
		} catch (error: any) {
			console.error('handleToggleMyList error:', error);
			const message = typeof error === 'string'
				? error
				: error?.message || error?.toString?.() || 'Unable to update My List';
			if (message.toLowerCase().includes('already in list')) {
				await dispatch(fetchMyList(activeProfile._id)).unwrap();
				return;
			}
			Alert.alert('Error', message);
		}
	};

	const handleView = (item: any) => {
		if (!item) return;
		const screenName = item.seasons ? 'SeriesDetail' : 'MovieDetail';
		navigation.navigate(screenName, { id: item._id });
	};

	if (isLoading && !homeFeed) {
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
					<TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconButton}>
						<Ionicons name="search" size={24} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Category Tabs */}
			<View style={styles.tabs}>
				{['All', 'Series', 'Movies', 'Categories'].map((tab) => (
					<TouchableOpacity
						key={tab}
						style={[styles.tab, selectedTab === tab && styles.tabActive]}
						onPress={() => {
							if (tab === 'Categories') {
								navigation.navigate('Category');
								return;
							}
							setSelectedTab(tab);
						}}
					>
						<Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
							{tab}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{
				(selectedTab === 'Movies' || selectedTab === 'Series') ? (
					// Use FlatList as the primary vertical scroller for grid mode to avoid nested VirtualizedLists
					<FlatList
						data={(selectedTab === 'Movies' ? collectAllMovies() : collectAllSeries()).slice(0, gridVisibleCount)}
						renderItem={renderGridItem}
						keyExtractor={(item, index) => `${item._id || item.id}-${index}`}
						numColumns={3}
						columnWrapperStyle={styles.gridRow}
						contentContainerStyle={styles.grid}
						refreshing={refreshing}
						onRefresh={onRefresh}
						showsVerticalScrollIndicator={false}
						ListFooterComponent={() => {
							const items = selectedTab === 'Movies' ? collectAllMovies() : collectAllSeries();
							if (items.length > gridVisibleCount) {
								return (
									<TouchableOpacity style={styles.loadMore} onPress={() => setGridVisibleCount((c) => c + 24)}>
										<Text style={styles.loadMoreText}>Load more</Text>
									</TouchableOpacity>
								);
							}
							return <View style={{ height: 100 }} />;
						}}
					/>
				) : (
					<ScrollView
						style={styles.container}
						showsVerticalScrollIndicator={false}
						refreshControl={
							<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
						}
					>
				{/* Featured Content Carousel */}
				{featuredItems.length > 0 && (
					<View style={styles.featuredCarouselWrapper}>
						<FlatList
							data={featuredItems}
							horizontal
							showsHorizontalScrollIndicator={false}
							pagingEnabled
							decelerationRate="fast"
							snapToInterval={FEATURE_CARD_WIDTH + FEATURE_CARD_SPACING}
							snapToAlignment="start"
							onMomentumScrollEnd={handleFeaturedScroll}
							contentContainerStyle={styles.featuredList}
							keyExtractor={(item, index) => `${item._id || 'featured'}-${index}`}
							renderItem={({ item, index }) => (
								<TouchableOpacity onPress={() => handleView(item)}>
								<View style={[
										styles.featuredCard,
										{
											width: FEATURE_CARD_WIDTH,
											marginRight:
												index === featuredItems.length - 1 ? 16 : FEATURE_CARD_SPACING,
										},
									]}
								>
									<Image
										source={{ uri: item.poster?.vertical || item.poster?.horizontal }}
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
												<Text style={styles.featuredTitle}>{item.title}</Text>
												<View style={styles.tags}>
													{item.genres?.slice(0, 3).map((genre: string, idx: number) => (
														<Text key={idx} style={styles.tag_genre}>
															{genre}
														</Text>
													))}
													{item.language && <Text style={styles.tagDot}>•</Text>}
													{item.language && <Text style={styles.tag}>Language: {item.language}</Text>}
													{item.releaseYear && <Text style={styles.tagDot}>•</Text>}
													{item.releaseYear && (
														<Text style={styles.tag}>Release: {item.releaseYear}</Text>
													)}
													{item.maturityRating && <Text style={styles.tagDot}>•</Text>}
													{item.maturityRating && (
														<Text style={styles.tag}>Maturity: {item.maturityRating}</Text>
													)}
												</View>
											</View>
										</View>
										
									</View>
								</View>
								</TouchableOpacity>
							)}
						/>

						<View style={styles.featuredIndicators}>
							{featuredItems.map((_: any, idx: number) => (
								<View
									key={`dot-${idx}`}
									style={[styles.indicatorDot, idx === featuredIndex && styles.indicatorDotActive]}
								/>
							))}
						</View>
					</View>
				)}

				{/* Content Sections (filtered by tab) */}
				{selectedTab === 'All' ? (
					<>
						{renderSection('Continue Watching', filterByTab(homeFeed?.continueWatching || []), 'continueWatching')}
						{renderSection('Recommended for You', filterByTab(recommendations || []), 'recommendations')}
						{renderSection('Movies', collectAllMovies(), 'movies')}
						{renderSection('Series', collectAllSeries(), 'series')}
					</>
				) : (
					<>
						{renderSection('Recommended for You', filterByTab(recommendations || []), 'recommendations')}
						{renderSection('Continue Watching', filterByTab(homeFeed?.continueWatching || []), 'continueWatching')}
						{renderSection('Trending Now', filterByTab(homeFeed?.trending || []), 'trending')}
						{renderSection('Trending Series', filterByTab(homeFeed?.trendingSeries || []), 'trendingSeries')}
						{renderSection('New Releases', filterByTab(homeFeed?.newReleases || []), 'newReleases')}
						{renderSection('Action Movies', filterByTab(homeFeed?.actionMovies || []), 'actionMovies')}
						{renderSection('Comedy Movies', filterByTab(homeFeed?.comedyMovies || []), 'comedyMovies')}
					</>
				)}

				<View style={{ height: 100 }} />
					</ScrollView>
				)}

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
		paddingBottom: 16,
		backgroundColor: '#141414',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#E50914',
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
		borderWidth: 1,
		borderColor: '#2b2b2b',
		backgroundColor: '#1b1b1b',
		flexDirection: 'row',
		alignItems: 'center',
	},
	tabActive: {
		backgroundColor: '#E50914',
		borderColor: '#E50914',
	},
	tabText: {
		color: '#cfcfcf',
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
	featuredCarouselWrapper: {
		marginBottom: 12,
	},
	featuredList: {
		paddingLeft: 16,
		paddingRight: 4,
	},
	featuredCard: {
		borderRadius: 16,
		overflow: 'hidden',
		height: 500,
		alignContent: 'center',
	},
	featuredImage: {
		width: '100%',
		height: 500,
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
		justifyContent: 'flex-end',
		flex: 1,
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
		backgroundColor: '#E50914',
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
		backgroundColor: '#fff',
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
		color: '#000',
		fontWeight: '600',
		fontSize: 16,
	},
	myListButton: {
		backgroundColor: '#2b2b2b',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	myListButtonActive: {
		borderWidth: 1,
		borderColor: '#E50914',
	},
	myListButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},
	featuredIndicators: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		marginTop: 8,
		marginBottom: 8,
	},
	indicatorDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2b2b2b',
	},
	indicatorDotActive: {
		backgroundColor: '#E50914',
		width: 10,
		height: 10,
	},
	section: {
		marginTop: 20,
	},
	grid: {
		paddingHorizontal: GRID_PADDING,
		paddingBottom: 24,
	},
	gridRow: {
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	gridCard: {
		width: GRID_ITEM_WIDTH,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#1f1f1f',
		borderWidth: 1,
		borderColor: '#2b2b2b',
		alignItems: 'center',
	},
	gridImage: {
		width: '100%',
		height: GRID_ITEM_WIDTH * 1.4,
	},
	gridTitle: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
		padding: 8,
		textAlign: 'center',
	},
	loadMore: {
		marginTop: 12,
		alignSelf: 'center',
		paddingHorizontal: 20,
		paddingVertical: 10,
		backgroundColor: '#E50914',
		borderRadius: 8,
	},
	loadMoreText: {
		color: '#fff',
		fontWeight: '600',
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
		fontWeight: '700',
	},
	seeAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	seeAllText: {
		color: '#b3b3b3',
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
		borderRadius: 6,
	},
});
