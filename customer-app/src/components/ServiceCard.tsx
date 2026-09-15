import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Service } from '../types';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { formatINR } from '../utils/formatters';

interface ServiceCardProps {
  service: Service;
  onPress?: () => void;
  selected?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onPress, selected }) => {
  return (
    <Pressable 
      style={[styles.card, selected && styles.cardSelected]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{service.emoji || '💈'}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{service.name}</Text>
        <Text style={styles.details}>
          {service.duration_minutes || service.duration || 30} mins
        </Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatINR(service.price)}</Text>
        {onPress && (
          <ChevronRight size={20} color={COLORS.textMuted} style={{ marginLeft: SIZES.xs }} />
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderRadius: 12,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#F0F7FF', // Light tint of accent
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  details: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
