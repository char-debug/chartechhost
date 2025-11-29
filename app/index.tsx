import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface SummaryStats {
  total_repairs: number;
  completed_repairs: number;
  in_progress: number;
  low_stock_count: number;
  average_repair_time: number;
}

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    try {
      const [summaryRes, lowStockRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/summary`),
        axios.get(`${API_URL}/api/inventory/low-stock`),
      ]);
      setStats(summaryRes.data);
      setLowStock(lowStockRes.data);
    } catch (error) {
      console.log('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const seedDatabase = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API_URL}/api/seed`);
      await fetchData();
    } catch (error) {
      console.log('Error seeding database:', error);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4fc3f7" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Repair Station</Text>
        <Text style={styles.subtitle}>Companion</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Ionicons name="construct" size={28} color="#fff" />
          <Text style={styles.statNumber}>{stats?.total_repairs || 0}</Text>
          <Text style={styles.statLabel}>Total Repairs</Text>
        </View>
        <View style={[styles.statCard, styles.successCard]}>
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={styles.statNumber}>{stats?.completed_repairs || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, styles.warningCard]}>
          <Ionicons name="time" size={28} color="#fff" />
          <Text style={styles.statNumber}>{stats?.in_progress || 0}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, styles.infoCard]}>
          <Ionicons name="speedometer" size={28} color="#fff" />
          <Text style={styles.statNumber}>{stats?.average_repair_time || 0}</Text>
          <Text style={styles.statLabel}>Avg. Minutes</Text>
        </View>
      </View>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <View style={styles.alertSection}>
          <View style={styles.alertHeader}>
            <Ionicons name="alert-circle" size={24} color="#ff6b6b" />
            <Text style={styles.alertTitle}>Low Stock Alert ({lowStock.length})</Text>
          </View>
          {lowStock.slice(0, 3).map((item) => (
            <View key={item._id} style={styles.alertItem}>
              <Text style={styles.alertItemName}>{item.name}</Text>
              <Text style={styles.alertItemQty}>
                {item.quantity} / {item.min_quantity} min
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Safety Tips */}
      <View style={styles.safetySection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#4caf50" />
          <Text style={styles.sectionTitle}>Safety Reminders</Text>
        </View>
        <View style={styles.safetyCard}>
          <View style={styles.safetyItem}>
            <Ionicons name="flash" size={20} color="#ffd93d" />
            <Text style={styles.safetyText}>Always disconnect power adapter before repairs</Text>
          </View>
          <View style={styles.safetyItem}>
            <Ionicons name="thermometer" size={20} color="#ff6b6b" />
            <Text style={styles.safetyText}>Use heat-resistant gloves when using heat pad</Text>
          </View>
          <View style={styles.safetyItem}>
            <Ionicons name="hand-left" size={20} color="#4fc3f7" />
            <Text style={styles.safetyText}>Apply clamp pressure gradually - don't over-tighten</Text>
          </View>
          <View style={styles.safetyItem}>
            <Ionicons name="timer" size={20} color="#a78bfa" />
            <Text style={styles.safetyText}>Respect cooling times before handling devices</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.seedButton} onPress={seedDatabase} disabled={seeding}>
          {seeding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
          <Text style={styles.seedButtonText}>
            {seeding ? 'Loading...' : 'Load Sample Data'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 24,
    color: '#4fc3f7',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#3b82f6',
  },
  successCard: {
    backgroundColor: '#10b981',
  },
  warningCard: {
    backgroundColor: '#f59e0b',
  },
  infoCard: {
    backgroundColor: '#8b5cf6',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  alertSection: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 8,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 107, 0.2)',
  },
  alertItemName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  alertItemQty: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  safetySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  safetyCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  safetyText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  quickActions: {
    marginTop: 8,
  },
  seedButton: {
    backgroundColor: '#4fc3f7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  seedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
