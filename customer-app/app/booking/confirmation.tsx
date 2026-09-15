
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Calendar, MapPin, Clock } from 'lucide-react-native';
import { supaGetBooking, supaGetShop, supaGetServices } from '../../src/services/supabaseService';
import { Booking, Shop, Service } from '../../src/types';
import { COLORS, SIZES } from '../../src/constants/theme';
import { LoadingState } from '../../src/components/LoadingState';
import { formatDateShort } from '../../src/utils/formatters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConfirmationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const b = await supaGetBooking(id as string);
        if (b) {
          setBooking(b);
          const s = await supaGetShop(b.shopId as string);
          setShop(s);
          const svcs = await supaGetServices();
          setService(svcs.find(x => x.id === b.serviceId) || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <LoadingState />;
  if (!booking) return <LoadingState message="Booking not found" />;

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + SIZES.xl }]}>
        <View style={styles.successIcon}>
          <CheckCircle2 size={80} color={COLORS.success} />
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your appointment request has been sent.</Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>{booking.bookingRef}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MapPin size={20} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{shop?.name || 'Shop'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={20} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {booking.dateISO ? formatDateShort(new Date(booking.dateISO)) : 'Date'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={20} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {booking.period ? (booking.period.charAt(0).toUpperCase() + booking.period.slice(1)) : 'Time'} Period
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{service?.name || 'Service'}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SIZES.xl }]}>
        <TouchableOpacity 
          style={styles.btnPrimary} 
          onPress={() => router.replace('/(tabs)/bookings')}
        >
          <Text style={styles.btnTextPrimary}>View My Bookings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.btnSecondary} 
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.btnTextSecondary}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: SIZES.xl,
  },
  successIcon: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: SIZES.xxl,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    padding: SIZES.xl,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  btnTextPrimary: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnTextSecondary: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
