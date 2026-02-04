import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { attendanceAPI, eventsAPI } from '../services/api';
import useAuthStore from '../services/authStore';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);

  const fetchData = async () => {
    try {
      const response = await attendanceAPI.getTodayStatus();
      setTodayStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching today status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La géolocalisation est requise pour le pointage');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      return loc.coords;
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchData();
    getLocation();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCheckIn = (eventId) => {
    navigation.navigate('CheckIn', { eventId });
  };

  const handleCheckOut = (attendanceId) => {
    navigation.navigate('CheckOut', { attendanceId });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={24} color="#2563eb" />
          <Text style={styles.statValue}>{todayStatus?.events?.length || 0}</Text>
          <Text style={styles.statLabel}>Événements</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
          <Text style={styles.statValue}>
            {todayStatus?.events?.filter(e => e.attendance?.checkInTime).length || 0}
          </Text>
          <Text style={styles.statLabel}>Pointés</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>
            {todayStatus?.events?.filter(e => !e.attendance?.checkInTime).length || 0}
          </Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
      </View>

      {/* Today's Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Événements du jour</Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : todayStatus?.events?.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucun événement aujourd'hui</Text>
          </View>
        ) : (
          todayStatus?.events?.map((event, index) => (
            <View key={index} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.eventName}</Text>
                  <View style={styles.eventDetails}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.eventLocation}>{event.location}</Text>
                  </View>
                  <View style={styles.eventDetails}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.eventTime}>
                      {event.checkInTime} - {event.checkOutTime}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  event.attendance?.checkInTime
                    ? event.attendance?.checkOutTime
                      ? styles.statusCompleted
                      : styles.statusActive
                    : styles.statusPending
                ]}>
                  <Text style={styles.statusText}>
                    {event.attendance?.checkInTime
                      ? event.attendance?.checkOutTime
                        ? 'Terminé'
                        : 'En cours'
                      : 'En attente'}
                  </Text>
                </View>
              </View>

              {event.attendance?.checkInTime ? (
                <View style={styles.attendanceInfo}>
                  <Text style={styles.attendanceText}>
                    Arrivée: {new Date(event.attendance.checkInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {event.attendance.checkOutTime && (
                    <Text style={styles.attendanceText}>
                      Départ: {new Date(event.attendance.checkOutTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              ) : null}

              <View style={styles.eventActions}>
                {!event.attendance?.checkInTime ? (
                  <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={() => handleCheckIn(event.eventId)}
                  >
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Pointer l'arrivée</Text>
                  </TouchableOpacity>
                ) : !event.attendance?.checkOutTime ? (
                  <TouchableOpacity
                    style={styles.checkOutButton}
                    onPress={() => handleCheckOut(event.attendance.id)}
                  >
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Pointer le départ</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Location Status */}
      <View style={styles.locationCard}>
        <Ionicons
          name={location ? 'location' : 'location-outline'}
          size={20}
          color={location ? '#10b981' : '#f59e0b'}
        />
        <Text style={styles.locationText}>
          {location
            ? `Position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : 'Position non disponible'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  date: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  eventTime: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusCompleted: {
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  attendanceInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  attendanceText: {
    fontSize: 13,
    color: '#6b7280',
  },
  eventActions: {
    marginTop: 16,
  },
  checkInButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  checkOutButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 13,
  },
});

export default HomeScreen;
