import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar, Clock, ChevronRight } from 'lucide-react-native';
import { Booking } from '../types';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { formatDateShort, formatSlotTime, formatINR } from '../utils/formatters';

interface BookingCardProps {
  booking: Booking;
  shopName?: string;
  serviceName?: string;
  price?: number;
  onPress?: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, shopName, serviceName, price, onPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return COLORS.success;
      case 'completed': return '#3B82F6'; // Blue
      case 'cancelled':
      case 'no-show': return COLORS.error;
      case 'pending':
      default: return '#F59E0B'; // Amber
    }
  };

  const statusColor = getStatusColor(booking.status);

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName} numberOfLines={1}>{shopName || 'Shop'}</Text>
          <Text style={styles.serviceName} numberOfLines={1}>{serviceName || 'Service'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {booking.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Calendar size={16} color={COLORS.textMuted} />
          <Text style={styles.detailText}>
            {booking.dateISO ? formatDateShort(new Date(booking.dateISO)) : 'TBD'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={16} color={COLORS.textMuted} />
          <Text style={styles.detailText}>
            {booking.startMinute != null ? formatSlotTime(booking.startMinute) : (booking.period || 'TBD')}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.price}>{formatINR(price ?? booking.price)}</Text>
        </View>
        {onPress && (
          <View style={styles.actionBtn}>
            <Text style={styles.actionText}>View Details</Text>
            <ChevronRight size={16} color={COLORS.accent} />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  shopInfo: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.lg,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 6,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    marginRight: 4,
  },
});
