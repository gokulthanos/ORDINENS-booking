import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Star, Heart } from 'lucide-react-native';
import { Shop } from '../types';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface ShopCardProps {
  shop: Shop;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onPress, isFavorite, onToggleFavorite }) => {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image
        source="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&q=80" // Placeholder until real images
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      
      <View style={styles.favoriteBtn}>
        <Pressable onPress={onToggleFavorite} style={styles.favoriteCircle}>
          <Heart size={20} color={isFavorite ? COLORS.error : COLORS.text} fill={isFavorite ? COLORS.error : 'transparent'} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{shop.name}</Text>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>4.8</Text> 
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color={COLORS.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {shop.location || shop.area || shop.address || 'Location unavailable'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: shop.is_live ? COLORS.success : COLORS.error }]} />
          <Text style={styles.statusText}>{shop.is_live ? 'Open Now' : 'Closed'}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surface,
  },
  favoriteBtn: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
  },
  favoriteCircle: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    padding: SIZES.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: SIZES.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 4,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
});
