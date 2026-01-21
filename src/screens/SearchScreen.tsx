import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { searchContent } from '../store/slices/contentSlice';

export default function SearchScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResults } = useSelector((state: RootState) => state.content);
  const [query, setQuery] = useState('');

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      dispatch(searchContent({ query: text }));
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => {
        const screenName = item.type === 'series' ? 'SeriesDetail' : 'MovieDetail';
        navigation.navigate(screenName, { id: item._id });
      }}
    >
      <Image
        source={{ uri: item.poster?.vertical }}
        style={styles.poster}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.releaseYear} • {item.language}
        </Text>
        <Text style={styles.genres} numberOfLines={1}>
          {item.genres?.join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies, series..."
          placeholderTextColor="#808080"
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      {searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {query.length > 2 ? 'No results found' : 'Search for content'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 60,
  },
  searchInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    width: 100,
    height: 150,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  meta: {
    color: '#808080',
    fontSize: 14,
    marginBottom: 4,
  },
  genres: {
    color: '#808080',
    fontSize: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#808080',
    fontSize: 16,
  },
});
