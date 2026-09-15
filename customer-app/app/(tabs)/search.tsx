import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ScrollView, Text } from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';
import { supaGetShops } from '../../src/services/supabaseService';
import { Shop } from '../../src/types';
import { COLORS, SIZES } from '../../src/constants/theme';
import { ShopCard } from '../../src/components/ShopCard';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await supaGetShops();
        setShops(data || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredShops = shops.filter(shop => {
    if (!query) return false; // Show nothing or all? Let's show all if query is empty, or maybe recent searches. Let's show all for now.
    const q = query.toLowerCase();
    return shop.name.toLowerCase().includes(q) || 
           (shop.location && shop.location.toLowerCase().includes(q)) ||
           (shop.area && shop.area.toLowerCase().includes(q));
  });

  const displayShops = query ? filteredShops : shops;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SIZES.md }]}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search for shops or areas..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {displayShops.length === 0 ? (
            <View style={{ marginTop: SIZES.xxl }}>
              <EmptyState 
                icon={SearchIcon} 
                title="No Results" 
                message={`We couldn't find any shops matching "${query}"`} 
              />
            </View>
          ) : (
            <>
              {query && (
                <Text style={styles.resultsText}>
                  Found {displayShops.length} result{displayShops.length !== 1 ? 's' : ''}
                </Text>
              )}
              {displayShops.map(shop => (
                <ShopCard 
                  key={shop.id} 
                  shop={shop} 
                  onPress={() => router.push(`/shop/${shop.id}`)} 
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },
  content: {
    padding: SIZES.lg,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SIZES.md,
  },
});
