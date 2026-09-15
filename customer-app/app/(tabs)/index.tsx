import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Search } from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { supaGetShops } from '../../src/services/supabaseService';
import { Shop } from '../../src/types';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';
import { ShopCard } from '../../src/components/ShopCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)');
    }
  }, [user, authLoading, router]);

  const loadData = async () => {
    try {
      // 1. Get Location (optional but requested)
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Showing all shops.');
      } else {
        // We could get location here, but for now we just load all shops
        // let location = await Location.getCurrentPositionAsync({});
      }

      // 2. Load Shops
      const data = await supaGetShops();
      setShops(data || []);

      // 3. Load Favorites from local storage
      const favStr = await AsyncStorage.getItem('pt_favorites');
      if (favStr) setFavorites(JSON.parse(favStr));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleFavorite = async (shopId: string) => {
    let updated = [...favorites];
    if (updated.includes(shopId)) {
      updated = updated.filter(id => id !== shopId);
    } else {
      updated.push(shopId);
    }
    setFavorites(updated);
    await AsyncStorage.setItem('pt_favorites', JSON.stringify(updated));
  };

  if (authLoading || loading) return <LoadingState />;

  const topRated = shops.slice(0, 3); // Mock logic for top rated since ratings aren't in schema yet
  const nearby = shops.slice(0, 5); // Mock logic for nearby

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + SIZES.md }]}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.user_metadata?.full_name?.split(' ')[0] || 'Guest'}</Text>
          <Text style={styles.subtitle}>Find your favorite barber</Text>
        </View>
      </View>

      <View style={styles.searchContainer} onTouchEnd={() => router.push('/(tabs)/search')}>
        <Search size={20} color={COLORS.textMuted} />
        <Text style={styles.searchText}>Search for shops, services...</Text>
      </View>

      {locationError && (
        <Text style={styles.errorText}>{locationError}</Text>
      )}

      {shops.length === 0 ? (
        <View style={{ marginTop: SIZES.xl }}>
          <EmptyState icon={Search} title="No Shops Found" message="We couldn't find any active shops right now." />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Rated</Text>
            </View>
            {topRated.map(shop => (
              <ShopCard 
                key={`top-${shop.id}`}
                shop={shop} 
                isFavorite={favorites.includes(shop.id)}
                onToggleFavorite={() => toggleFavorite(shop.id)}
                onPress={() => router.push(`/shop/${shop.id}`)} 
              />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Shops</Text>
            </View>
            {nearby.map(shop => (
              <ShopCard 
                key={`near-${shop.id}`}
                shop={shop} 
                isFavorite={favorites.includes(shop.id)}
                onToggleFavorite={() => toggleFavorite(shop.id)}
                onPress={() => router.push(`/shop/${shop.id}`)} 
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
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
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: SIZES.lg,
    marginTop: -SIZES.md, // Overlap the header slightly
    marginBottom: SIZES.lg,
    paddingHorizontal: SIZES.md,
    paddingVertical: 14,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  searchText: {
    marginLeft: SIZES.sm,
    color: COLORS.textMuted,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.sm,
    fontSize: 12,
  },
  section: {
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
