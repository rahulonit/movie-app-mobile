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
	const [selectedTab, setSelectedTab] = useState('All');
	const [featuredIndex, setFeaturedIndex] = useState(0);

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
					<TouchableOpacity
						style={styles.seeAllButton}
						onPress={() => navigation.navigate('Category', { initialCategoryKey: sectionKey })}
					>
						<Text style={styles.seeAllText}>See All</Text>
						<Ionicons name="chevron-forward" size={18} color="#fff" />
					</TouchableOpacity>
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

	const featuredItems = useMemo(() => (homeFeed?.trending || []).slice(0, 4), [homeFeed]);

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
				await dispatch(addToMyList({ profileId: activeProfile._id, contentId: item._id })).unwrap();
			}
			await dispatch(fetchMyList(activeProfile._id)).unwrap();
		} catch (error: any) {
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
				{['Series', 'Movies', 'Categories'].map((tab) => (
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

				{/* Content Sections */}
				{renderSection('Recommended for You', recommendations || [], 'recommendations')}
				{renderSection('Continue Watching', homeFeed?.continueWatching || [], 'continueWatching')}
				{renderSection('Trending Now', homeFeed?.trending || [], 'trending')}
				{renderSection('Trending Series', homeFeed?.trendingSeries || [], 'trendingSeries')}
				{renderSection('New Releases', homeFeed?.newReleases || [], 'newReleases')}
				{renderSection('Action Movies', homeFeed?.actionMovies || [], 'actionMovies')}
				{renderSection('Comedy Movies', homeFeed?.comedyMovies || [], 'comedyMovies')}

				<View style={{ height: 100 }} />
			</ScrollView>
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
