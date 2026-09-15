import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supaGetShop, supaGetServicesByShop, supaPeriodAvailability, supaAddBooking } from '../../../src/services/supabaseService';
import { Shop, Service, BookingPeriod } from '../../../src/types';
import { COLORS, SIZES } from '../../../src/constants/theme';
import { LoadingState } from '../../../src/components/LoadingState';
import { toISO } from '../../../src/utils/formatters';
import { useAuth } from '../../../src/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BookingScreen() {
  const { shopId, serviceId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [shop, setShop] = useState<Shop | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Booking state
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<BookingPeriod | null>(null);
  const [availability, setAvailability] = useState<Record<BookingPeriod, string> | null>(null);
  const [note, setNote] = useState('');

  // 3-day booking window
  const bookingWindowDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await supaGetShop(shopId as string);
        if (s) setShop(s);
        const svcs = await supaGetServicesByShop(shopId as string);
        const svc = svcs.find(x => x.id === serviceId);
        if (svc) setService(svc);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [shopId, serviceId]);

  // Load availability when date changes
  useEffect(() => {
    if (shopId && serviceId && selectedDateISO) {
      supaPeriodAvailability({
        shopId: shopId as string,
        serviceId: serviceId as string,
        dateISO: selectedDateISO
      }).then(avail => setAvailability(avail));
    }
  }, [shopId, serviceId, selectedDateISO]);

  const handleBooking = async () => {
    if (!selectedDateISO || !selectedPeriod) {
      Alert.alert('Error', 'Please select a date and preferred period.');
      return;
    }
    
    // Simulate advance payment step (as requested: "Keep payment architecture ready")
    Alert.alert(
      'Advance Payment Required',
      'An advance payment is required to confirm this booking. Proceed to pay?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay & Book', 
          onPress: async () => {
            setSubmitting(true);
            try {
              const booking = await supaAddBooking({
                shopId: shopId as string,
                serviceId: serviceId as string,
                dateISO: selectedDateISO,
                period: selectedPeriod,
                customerId: user?.id,
                customerName: user?.user_metadata?.full_name,
                customerIdentifier: user?.user_metadata?.identifier,
                note: note
              });
              
              if (booking) {
                router.replace(`/booking/confirmation?id=${booking.id}`);
              } else {
                throw new Error('Booking failed');
              }
            } catch (err: any) {
              Alert.alert('Booking Error', err.message || 'Something went wrong.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return <LoadingState />;
  if (!shop || !service) return <LoadingState message="Details not found" />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SIZES.md }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.serviceName}>{service.name} • {service.duration_minutes || service.duration || 30} mins</Text>
          <Text style={styles.price}>Total: ₹{service.price}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {bookingWindowDates.map(date => {
            const iso = toISO(date);
            const isSelected = selectedDateISO === iso;
            return (
              <TouchableOpacity
                key={iso}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => {
                  setSelectedDateISO(iso);
                  setSelectedPeriod(null);
                  setAvailability(null);
                }}
              >
                <Text style={[styles.dateDay, isSelected && styles.textSelected]}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dateNum, isSelected && styles.textSelected]}>
                  {date.getDate()}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.textSelected]}>
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedDateISO && (
          <>
            <Text style={styles.sectionTitle}>Preferred Period</Text>
            {!availability ? (
              <LoadingState message="Checking availability..." />
            ) : (
              <View style={styles.periodContainer}>
                {(['morning', 'afternoon', 'evening'] as BookingPeriod[]).map(period => {
                  const status = availability[period];
                  const isAvailable = status === 'available' || status === 'limited';
                  const isSelected = selectedPeriod === period;
                  
                  return (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodCard,
                        isSelected && styles.periodCardSelected,
                        !isAvailable && styles.periodCardDisabled
                      ]}
                      onPress={() => isAvailable && setSelectedPeriod(period)}
                      disabled={!isAvailable}
                    >
                      <Text style={[
                        styles.periodText,
                        isSelected && styles.textSelected,
                        !isAvailable && styles.textDisabled
                      ]}>
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </Text>
                      <Text style={[
                        styles.periodStatus,
                        isSelected && styles.textSelected,
                        !isAvailable && styles.textDisabled
                      ]}>
                        {status.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={styles.input}
              placeholder="Any special requests? (Optional)"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SIZES.md }]}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Advance Payable</Text>
          <Text style={styles.footerPriceValue}>₹{Math.round(service.price * 0.2)}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.bookBtn, (!selectedDateISO || !selectedPeriod || submitting) && styles.bookBtnDisabled]}
          onPress={handleBooking}
          disabled={!selectedDateISO || !selectedPeriod || submitting}
        >
          <Text style={styles.bookBtnText}>{submitting ? 'Processing...' : 'Pay & Book'}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    padding: SIZES.lg,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    borderRadius: 16,
    marginBottom: SIZES.xl,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.md,
    marginTop: SIZES.sm,
  },
  dateScroll: {
    marginBottom: SIZES.xl,
  },
  dateCard: {
    width: 80,
    height: 100,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateDay: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  dateMonth: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  textSelected: {
    color: '#FFF',
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginBottom: SIZES.xl,
  },
  periodCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodCardDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  periodStatus: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SIZES.md,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footer: {
    flexDirection: 'row',
    padding: SIZES.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerPrice: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  footerPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookBtnDisabled: {
    opacity: 0.5,
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
