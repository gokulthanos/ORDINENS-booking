import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { CalendarCheck } from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { supaGetBookings, supaGetShops, supaGetServices } from '../../src/services/supabaseService';
import { Booking, Shop, Service } from '../../src/types';
import { COLORS, SIZES } from '../../src/constants/theme';
import { BookingCard } from '../../src/components/BookingCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BookingsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [services, setServices] = useState<Record<string, Service>>({});
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const loadData = useCallback(async () => {
    try {
      if (!user) return;
      
      const bks = await supaGetBookings({ customer_id: user.id });
      setBookings(bks || []);
      
      // Load mapping data
      const shps = await supaGetShops();
      const svcs = await supaGetServices();
      
      const shopMap: Record<string, Shop> = {};
      shps.forEach(s => { shopMap[s.id] = s; });
      setShops(shopMap);
      
      const svcMap: Record<string, Service> = {};
      svcs.forEach(s => { svcMap[s.id] = s; });
      setServices(svcMap);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    const isUpcoming = b.status === 'pending' || b.status === 'confirmed';
    if (filter === 'upcoming') return isUpcoming;
    return !isUpcoming; // past
  });

  if (loading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SIZES.md }]}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, filter === 'upcoming' && styles.tabActive]} 
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.tabText, filter === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filter === 'past' && styles.tabActive]} 
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.tabText, filter === 'past' && styles.tabTextActive]}>Past</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filter === 'all' && styles.tabActive]} 
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredBookings.length === 0 ? (
          <View style={{ marginTop: SIZES.xxl }}>
            <EmptyState 
              icon={CalendarCheck} 
              title="No Bookings" 
              message={`You have no ${filter === 'all' ? '' : filter} bookings.`} 
            />
          </View>
        ) : (
          filteredBookings.map(booking => {
            const shop = shops[booking.shopId as string];
            const service = services[booking.serviceId as string];
            return (
              <BookingCard 
                key={booking.id}
                booking={booking}
                shopName={shop?.name}
                serviceName={service?.name}
                price={service?.price}
              />
            );
          })
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: SIZES.xs,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  content: {
    padding: SIZES.lg,
  },
});
