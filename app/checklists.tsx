import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface ChecklistStep {
  order: number;
  title: string;
  description: string;
  timer_seconds?: number;
  is_safety: boolean;
  safety_note?: string;
}

interface Checklist {
  _id: string;
  name: string;
  device_type: string;
  repair_type: string;
  steps: ChecklistStep[];
  estimated_time_minutes: number;
}

export default function ChecklistsScreen() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [timerValue, setTimerValue] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const fetchChecklists = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/checklists`);
      setChecklists(res.data);
    } catch (error) {
      console.log('Error fetching checklists:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChecklists();
    }, [])
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerValue > 0) {
      interval = setInterval(() => {
        setTimerValue((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            Alert.alert('Timer Complete', 'Step timer has finished!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerValue]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChecklists();
  };

  const openChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setCompletedSteps(new Set());
    setActiveTimer(null);
    setTimerValue(0);
    setTimerRunning(false);
  };

  const closeChecklist = () => {
    setSelectedChecklist(null);
    setCompletedSteps(new Set());
    setActiveTimer(null);
    setTimerValue(0);
    setTimerRunning(false);
  };

  const toggleStep = (stepOrder: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepOrder)) {
      newCompleted.delete(stepOrder);
    } else {
      newCompleted.add(stepOrder);
    }
    setCompletedSteps(newCompleted);
  };

  const startTimer = (stepOrder: number, seconds: number) => {
    setActiveTimer(stepOrder);
    setTimerValue(seconds);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRepairTypeIcon = (type: string) => {
    switch (type) {
      case 'back_glass': return 'phone-portrait';
      case 'screen_replacement': return 'tablet-portrait';
      case 'battery': return 'battery-charging';
      default: return 'construct';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Loading Checklists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4fc3f7" />
        }
      >
        <Text style={styles.headerTitle}>Repair Checklists</Text>
        <Text style={styles.headerSubtitle}>Step-by-step guides with safety reminders</Text>

        {checklists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>No checklists available</Text>
            <Text style={styles.emptySubtext}>Tap "Load Sample Data" on Dashboard</Text>
          </View>
        ) : (
          checklists.map((checklist) => (
            <TouchableOpacity
              key={checklist._id}
              style={styles.checklistCard}
              onPress={() => openChecklist(checklist)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={getRepairTypeIcon(checklist.repair_type) as any}
                    size={24}
                    color="#4fc3f7"
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{checklist.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {checklist.device_type} • {checklist.steps.length} steps
                  </Text>
                </View>
                <View style={styles.timeContainer}>
                  <Ionicons name="time" size={16} color="#888" />
                  <Text style={styles.timeText}>{checklist.estimated_time_minutes} min</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Checklist Detail Modal */}
      <Modal
        visible={selectedChecklist !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeChecklist} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalTitle}>{selectedChecklist?.name}</Text>
              <Text style={styles.modalSubtitle}>
                {completedSteps.size} / {selectedChecklist?.steps.length} completed
              </Text>
            </View>
          </View>

          <ScrollView style={styles.stepsContainer}>
            {selectedChecklist?.steps.map((step) => (
              <View key={step.order} style={styles.stepCard}>
                <TouchableOpacity
                  style={styles.stepHeader}
                  onPress={() => toggleStep(step.order)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      completedSteps.has(step.order) && styles.checkboxChecked,
                    ]}
                  >
                    {completedSteps.has(step.order) && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepTitle,
                        completedSteps.has(step.order) && styles.stepTitleCompleted,
                      ]}
                    >
                      Step {step.order}: {step.title}
                    </Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </TouchableOpacity>

                {/* Safety Warning */}
                {step.is_safety && step.safety_note && (
                  <View style={styles.safetyWarning}>
                    <Ionicons name="warning" size={18} color="#ffd93d" />
                    <Text style={styles.safetyWarningText}>{step.safety_note}</Text>
                  </View>
                )}

                {/* Timer */}
                {step.timer_seconds && (
                  <View style={styles.timerSection}>
                    {activeTimer === step.order ? (
                      <View style={styles.activeTimer}>
                        <Text style={styles.timerDisplay}>{formatTime(timerValue)}</Text>
                        <TouchableOpacity
                          style={styles.timerButton}
                          onPress={timerRunning ? stopTimer : () => startTimer(step.order, timerValue || step.timer_seconds!)}
                        >
                          <Ionicons
                            name={timerRunning ? 'pause' : 'play'}
                            size={20}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.startTimerButton}
                        onPress={() => startTimer(step.order, step.timer_seconds!)}
                      >
                        <Ionicons name="timer" size={18} color="#4fc3f7" />
                        <Text style={styles.startTimerText}>
                          Start {formatTime(step.timer_seconds)} timer
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Completion Status */}
          {selectedChecklist && completedSteps.size === selectedChecklist.steps.length && (
            <View style={styles.completionBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.completionText}>All steps completed!</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
  checklistCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 56,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  closeButton: {
    padding: 8,
  },
  modalHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4fc3f7',
    marginTop: 2,
  },
  stepsContainer: {
    flex: 1,
    padding: 16,
  },
  stepCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4fc3f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stepTitleCompleted: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  stepDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  safetyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 217, 61, 0.15)',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  safetyWarningText: {
    flex: 1,
    color: '#ffd93d',
    fontSize: 13,
    marginLeft: 8,
  },
  timerSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  startTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  startTimerText: {
    color: '#4fc3f7',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
  timerDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4fc3f7',
    marginRight: 16,
  },
  timerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4fc3f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
  },
  completionText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
