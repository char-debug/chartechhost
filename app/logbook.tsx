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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Repair {
  _id: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  parts_used: string[];
  notes?: string;
  status: string;
  created_at: string;
  completed_at?: string;
  duration_minutes?: number;
}

export default function LogbookScreen() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);

  // Form state
  const [deviceType, setDeviceType] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');

  const fetchRepairs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/repairs`);
      setRepairs(res.data);
    } catch (error) {
      console.log('Error fetching repairs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRepairs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRepairs();
  };

  const resetForm = () => {
    setDeviceType('');
    setDeviceModel('');
    setIssueDescription('');
    setPartsUsed('');
    setNotes('');
    setDurationMinutes('');
    setEditingRepair(null);
  };

  const openNewRepair = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditRepair = (repair: Repair) => {
    setEditingRepair(repair);
    setDeviceType(repair.device_type);
    setDeviceModel(repair.device_model);
    setIssueDescription(repair.issue_description);
    setPartsUsed(repair.parts_used.join(', '));
    setNotes(repair.notes || '');
    setDurationMinutes(repair.duration_minutes?.toString() || '');
    setModalVisible(true);
  };

  const saveRepair = async () => {
    if (!deviceType.trim() || !deviceModel.trim() || !issueDescription.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const repairData = {
      device_type: deviceType.trim(),
      device_model: deviceModel.trim(),
      issue_description: issueDescription.trim(),
      parts_used: partsUsed.split(',').map((p) => p.trim()).filter(Boolean),
      notes: notes.trim() || null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
    };

    try {
      if (editingRepair) {
        await axios.put(`${API_URL}/api/repairs/${editingRepair._id}`, repairData);
      } else {
        await axios.post(`${API_URL}/api/repairs`, repairData);
      }
      setModalVisible(false);
      resetForm();
      fetchRepairs();
    } catch (error) {
      console.log('Error saving repair:', error);
      Alert.alert('Error', 'Failed to save repair');
    }
  };

  const completeRepair = async (repair: Repair) => {
    const duration = repair.duration_minutes || prompt('Enter repair duration in minutes:');
    try {
      await axios.put(`${API_URL}/api/repairs/${repair._id}`, {
        status: 'completed',
        duration_minutes: typeof duration === 'string' ? parseInt(duration) : duration,
      });
      fetchRepairs();
    } catch (error) {
      console.log('Error completing repair:', error);
    }
  };

  const deleteRepair = async (repairId: string) => {
    let confirmDelete = false;
    
    if (Platform.OS === 'web') {
      // Use browser's native confirm on web
      confirmDelete = confirm('Are you sure you want to delete this repair?');
    } else {
      // Use Alert on native platforms
      confirmDelete = await new Promise<boolean>((resolve) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this repair?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
    }
    
    if (confirmDelete) {
      try {
        await axios.delete(`${API_URL}/api/repairs/${repairId}`);
        fetchRepairs();
      } catch (error) {
        console.log('Error deleting repair:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Loading Repair Logbook...</Text>
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
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Repair Logbook</Text>
            <Text style={styles.headerSubtitle}>Track all your repairs</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openNewRepair}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {repairs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>No repairs logged yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first repair</Text>
          </View>
        ) : (
          repairs.map((repair) => (
            <View key={repair._id} style={styles.repairCard}>
              <View style={styles.repairHeader}>
                <View style={styles.repairInfo}>
                  <Text style={styles.deviceName}>
                    {repair.device_type} {repair.device_model}
                  </Text>
                  <Text style={styles.repairDate}>{formatDate(repair.created_at)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    repair.status === 'completed' ? styles.statusCompleted : styles.statusProgress,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {repair.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Text>
                </View>
              </View>

              <Text style={styles.issueText}>{repair.issue_description}</Text>

              {repair.parts_used.length > 0 && (
                <View style={styles.partsContainer}>
                  <Text style={styles.partsLabel}>Parts used:</Text>
                  <View style={styles.partsRow}>
                    {repair.parts_used.map((part, index) => (
                      <View key={index} style={styles.partTag}>
                        <Text style={styles.partTagText}>{part}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {repair.duration_minutes && (
                <View style={styles.durationContainer}>
                  <Ionicons name="time" size={16} color="#888" />
                  <Text style={styles.durationText}>{repair.duration_minutes} minutes</Text>
                </View>
              )}

              {repair.notes && (
                <Text style={styles.notesText}>{repair.notes}</Text>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditRepair(repair)}
                >
                  <Ionicons name="pencil" size={18} color="#4fc3f7" />
                </TouchableOpacity>
                {repair.status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => completeRepair(repair)}
                  >
                    <Ionicons name="checkmark" size={18} color="#10b981" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteRepair(repair._id)}
                >
                  <Ionicons name="trash" size={18} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingRepair ? 'Edit Repair' : 'New Repair'}
            </Text>
            <TouchableOpacity onPress={saveRepair} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.inputLabel}>Device Type *</Text>
            <TextInput
              style={styles.input}
              value={deviceType}
              onChangeText={setDeviceType}
              placeholder="e.g., iPhone, Samsung, Pixel"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Device Model *</Text>
            <TextInput
              style={styles.input}
              value={deviceModel}
              onChangeText={setDeviceModel}
              placeholder="e.g., 14 Pro Max, Galaxy S23"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Issue Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={issueDescription}
              onChangeText={setIssueDescription}
              placeholder="Describe the repair needed"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Parts Used (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={partsUsed}
              onChangeText={setPartsUsed}
              placeholder="e.g., Back Glass, Adhesive, Screws"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="e.g., 45"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4fc3f7',
    alignItems: 'center',
    justifyContent: 'center',
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
  repairCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  repairInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  repairDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusProgress: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  issueText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  partsContainer: {
    marginBottom: 12,
  },
  partsLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  partsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  partTag: {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  partTagText: {
    fontSize: 12,
    color: '#4fc3f7',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 6,
  },
  notesText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 56,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4fc3f7',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
