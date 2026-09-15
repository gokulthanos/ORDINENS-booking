import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MapPin, ArrowLeft, Heart, Star, Clock } from 'lucide-react-native';
import { supaGetShop, supaGetServicesByShop } from '../../src/services/supabaseService';
import { Shop, Service } from '../../src/types';
import { COLORS, SIZES } from '../../src/constants/theme';
import { ServiceCard } from '../../src/components/ServiceCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ShopDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await supaGetShop(id as string);
        if (s) {
          setShop(s);
          const svcs = await supaGetServicesByShop(s.id);
          setServices(svcs || []);
        }

        const favStr = await AsyncStorage.getItem('pt_favorites');
        if (favStr) {
          const favorites = JSON.parse(favStr);
          setIsFavorite(favorites.includes(id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const toggleFavorite = async () => {
    try {
      const favStr = await AsyncStorage.getItem('pt_favorites');
      let favorites = favStr ? JSON.parse(favStr) : [];
      if (isFavorite) {
        favorites = favorites.filter((fid: string) => fid !== id);
      } else {
        favorites.push(id);
      }
      await AsyncStorage.setItem('pt_favorites', JSON.stringify(favorites));
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingState />;
  
  if (!shop) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.text} />
        </TouchableOpacity>
        <EmptyState icon={MapPin} title="Shop Not Found" message="The shop you are looking for does not exist." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.imageContainer}>
          <Image
            source="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&q=80"
            style={styles.image}
            contentFit="cover"
          />
          <View style={[styles.headerActions, { top: insets.top + 12 }]}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
              <ArrowLeft color={COLORS.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={toggleFavorite}>
              <Heart 
                color={isFavorite ? COLORS.error : COLORS.text} 
                fill={isFavorite ? COLORS.error : 'transparent'} 
                size={20} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{shop.name}</Text>
            <View style={styles.ratingBadge}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>4.8</Text> 
            </View>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {shop.location || shop.area || shop.address || 'Location unavailable'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {shop.is_live ? 'Open Now' : 'Closed'}
            </Text>
          </View>

          <Text style={styles.description}>
            {shop.description || 'A premium barber shop providing the best grooming services.'}
          </Text>

          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>Services</Text>
            {services.length === 0 ? (
              <Text style={styles.emptyText}>No services available for this shop.</Text>
            ) : (
              services.map(service => (
                <ServiceCard 
                  key={service.id} 
                  service={service}
                  onPress={() => {
                    if (!shop.is_live) {
                      Alert.alert('Shop Closed', 'This shop is currently closed and not accepting bookings.');
                      return;
                    }
                    router.push(`/booking/${shop.id}/${service.id}`);
                  }}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    padding: SIZES.md,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  headerActions: {
    position: 'absolute',
    left: SIZES.lg,
    right: SIZES.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SIZES.lg,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    marginRight: SIZES.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginTop: SIZES.md,
    marginBottom: SIZES.xl,
  },
  servicesSection: {
    marginTop: SIZES.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  }
});
