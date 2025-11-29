import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const screenWidth = Dimensions.get('window').width;

interface EfficiencyData {
  by_device: Record<string, { duration: number; date: string }[]>;
  averages: Record<string, number>;
  total_repairs: number;
}

interface SummaryStats {
  total_repairs: number;
  completed_repairs: number;
  in_progress: number;
  low_stock_count: number;
  average_repair_time: number;
}

export default function AnalyticsScreen() {
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [efficiencyRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/efficiency`),
        axios.get(`${API_URL}/api/analytics/summary`),
      ]);
      setEfficiencyData(efficiencyRes.data);
      setSummaryData(summaryRes.data);
    } catch (error) {
      console.log('Error fetching analytics:', error);
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

  // Prepare bar chart data for average repair times
  const getBarChartData = () => {
    if (!efficiencyData?.averages) return [];
    const colors = ['#4fc3f7', '#10b981', '#f59e0b', '#8b5cf6', '#ff6b6b'];
    return Object.entries(efficiencyData.averages).map(([device, avg], index) => ({
      value: Math.round(avg),
      label: device.substring(0, 8),
      frontColor: colors[index % colors.length],
    }));
  };

  // Prepare pie chart data for repairs by device
  const getPieChartData = () => {
    if (!efficiencyData?.by_device) return [];
    const colors = ['#4fc3f7', '#10b981', '#f59e0b', '#8b5cf6', '#ff6b6b'];
    return Object.entries(efficiencyData.by_device).map(([device, repairs], index) => ({
      value: repairs.length,
      color: colors[index % colors.length],
      text: device,
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Loading Analytics...</Text>
      </View>
    );
  }

  const barData = getBarChartData();
  const pieData = getPieChartData();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4fc3f7" />
      }
    >
      <Text style={styles.headerTitle}>Efficiency Tracker</Text>
      <Text style={styles.headerSubtitle}>Monitor your repair performance</Text>

      {/* Summary Stats */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-done" size={24} color="#10b981" />
            <Text style={styles.summaryValue}>{summaryData?.completed_repairs || 0}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="speedometer" size={24} color="#4fc3f7" />
            <Text style={styles.summaryValue}>{summaryData?.average_repair_time || 0}</Text>
            <Text style={styles.summaryLabel}>Avg. Minutes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="trending-up" size={24} color="#f59e0b" />
            <Text style={styles.summaryValue}>{efficiencyData?.total_repairs || 0}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Bar Chart - Average Repair Times */}
      {barData.length > 0 ? (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="bar-chart" size={20} color="#4fc3f7" />
            <Text style={styles.chartTitle}>Average Repair Time by Device</Text>
          </View>
          <View style={styles.chartContainer}>
            <BarChart
              data={barData}
              barWidth={40}
              spacing={24}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: '#888' }}
              xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }}
              noOfSections={4}
              maxValue={Math.max(...barData.map((d) => d.value)) * 1.2}
              isAnimated
            />
          </View>
          <Text style={styles.chartNote}>Time shown in minutes</Text>
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color="#444" />
          <Text style={styles.emptyText}>No repair data yet</Text>
          <Text style={styles.emptySubtext}>Complete some repairs to see efficiency stats</Text>
        </View>
      )}

      {/* Pie Chart - Repairs by Device */}
      {pieData.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="pie-chart" size={20} color="#10b981" />
            <Text style={styles.chartTitle}>Repairs by Device Type</Text>
          </View>
          <View style={styles.pieContainer}>
            <PieChart
              data={pieData}
              donut
              showGradient
              sectionAutoFocus
              radius={80}
              innerRadius={50}
              innerCircleColor={'#1a1a2e'}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterValue}>{efficiencyData?.total_repairs || 0}</Text>
                  <Text style={styles.pieCenterLabel}>Total</Text>
                </View>
              )}
            />
            <View style={styles.pieLegend}>
              {pieData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.text}</Text>
                  <Text style={styles.legendValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Improvement Tips */}
      <View style={styles.tipsCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="bulb" size={20} color="#ffd93d" />
          <Text style={styles.chartTitle}>Efficiency Tips</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.tipText}>Pre-heat devices while gathering tools</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.tipText}>Keep screw maps organized by device model</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.tipText}>Batch similar repairs for faster turnover</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.tipText}>Use magnetic mats for screw organization</Text>
        </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chartNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyChart: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  pieCenterLabel: {
    fontSize: 12,
    color: '#888',
  },
  pieLegend: {
    flex: 1,
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    color: '#ccc',
    fontSize: 13,
  },
  legendValue: {
    color: '#888',
    fontSize: 13,
  },
  tipsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tipText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
