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
import { useFocusEffect } from '@react-navigation/native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  notes?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'adhesive', label: 'Adhesives', icon: 'color-fill' },
  { id: 'back_glass', label: 'Back Glass', icon: 'phone-portrait' },
  { id: 'screw', label: 'Screws', icon: 'settings' },
  { id: 'clamp', label: 'Clamps', icon: 'contract' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [quantity, setQuantity] = useState('');
  const [minQuantity, setMinQuantity] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [notes, setNotes] = useState('');

  const fetchInventory = async () => {
    try {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const res = await axios.get(`${API_URL}/api/inventory`, { params });
      setInventory(res.data);
    } catch (error) {
      console.log('Error fetching inventory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [selectedCategory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const resetForm = () => {
    setName('');
    setCategory('other');
    setQuantity('');
    setMinQuantity('5');
    setUnit('pcs');
    setNotes('');
    setEditingItem(null);
  };

  const openNewItem = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setQuantity(item.quantity.toString());
    setMinQuantity(item.min_quantity.toString());
    setUnit(item.unit);
    setNotes(item.notes || '');
    setModalVisible(true);
  };

  const saveItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    const itemData = {
      name: name.trim(),
      category,
      quantity: parseInt(quantity) || 0,
      min_quantity: parseInt(minQuantity) || 5,
      unit: unit.trim() || 'pcs',
      notes: notes.trim() || null,
    };

    try {
      if (editingItem) {
        await axios.put(`${API_URL}/api/inventory/${editingItem._id}`, itemData);
      } else {
        await axios.post(`${API_URL}/api/inventory`, itemData);
      }
      setModalVisible(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.log('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const adjustQuantity = async (item: InventoryItem, adjustment: number) => {
    try {
      await axios.patch(`${API_URL}/api/inventory/${item._id}/adjust?adjustment=${adjustment}`);
      fetchInventory();
    } catch (error) {
      console.log('Error adjusting quantity:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    let confirmDelete = false;
    
    if (Platform.OS === 'web') {
      // Use browser's native confirm on web
      confirmDelete = confirm('Are you sure you want to delete this item?');
    } else {
      // Use Alert on native platforms
      confirmDelete = await new Promise<boolean>((resolve) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this item?', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
    }
    
    if (confirmDelete) {
      try {
        await axios.delete(`${API_URL}/api/inventory/${itemId}`);
        fetchInventory();
      } catch (error) {
        console.log('Error deleting item:', error);
      }
    }
  };

  const isLowStock = (item: InventoryItem) => item.quantity <= item.min_quantity;

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.icon || 'cube';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Loading Inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                selectedCategory === cat.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.id ? '#fff' : '#888'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat.id && styles.filterChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4fc3f7" />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Parts Inventory</Text>
            <Text style={styles.headerSubtitle}>
              {inventory.length} items • {inventory.filter(isLowStock).length} low stock
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openNewItem}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {inventory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>No inventory items</Text>
            <Text style={styles.emptySubtext}>Tap + to add or load sample data</Text>
          </View>
        ) : (
          inventory.map((item) => (
            <View
              key={item._id}
              style={[styles.itemCard, isLowStock(item) && styles.itemCardLowStock]}
            >
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.categoryIcon,
                    isLowStock(item) && styles.categoryIconLowStock,
                  ]}
                >
                  <Ionicons
                    name={getCategoryIcon(item.category) as any}
                    size={20}
                    color={isLowStock(item) ? '#ff6b6b' : '#4fc3f7'}
                  />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>
                    {CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                  </Text>
                </View>
                {isLowStock(item) && (
                  <View style={styles.lowStockBadge}>
                    <Ionicons name="warning" size={14} color="#ff6b6b" />
                    <Text style={styles.lowStockText}>Low</Text>
                  </View>
                )}
              </View>

              <View style={styles.quantitySection}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => adjustQuantity(item, -1)}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.quantityDisplay}>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                  <Text style={styles.quantityUnit}>{item.unit}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.quantityButton, styles.quantityButtonAdd]}
                  onPress={() => adjustQuantity(item, 1)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.minQuantityRow}>
                <Text style={styles.minQuantityLabel}>Min. stock: {item.min_quantity} {item.unit}</Text>
              </View>

              {item.notes && (
                <Text style={styles.itemNotes}>{item.notes}</Text>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditItem(item)}
                >
                  <Ionicons name="pencil" size={18} color="#4fc3f7" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteItem(item._id)}
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
              {editingItem ? 'Edit Item' : 'New Item'}
            </Text>
            <TouchableOpacity onPress={saveItem} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.inputLabel}>Item Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., B-7000 Adhesive"
              placeholderTextColor="#666"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    category === cat.id && styles.categoryOptionActive,
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={18}
                    color={category === cat.id ? '#fff' : '#888'}
                  />
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat.id && styles.categoryOptionTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="pcs"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Minimum Stock Level</Text>
            <TextInput
              style={styles.input}
              value={minQuantity}
              onChangeText={setMinQuantity}
              placeholder="5"
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
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4fc3f7',
  },
  filterChipText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 6,
  },
  filterChipTextActive: {
    color: '#fff',
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
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
  itemCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  itemCardLowStock: {
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconLowStock: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  itemCategory: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginLeft: 4,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonAdd: {
    backgroundColor: '#10b981',
  },
  quantityDisplay: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  quantityValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  quantityUnit: {
    fontSize: 14,
    color: '#888',
  },
  minQuantityRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  minQuantityLabel: {
    fontSize: 13,
    color: '#666',
  },
  itemNotes: {
    fontSize: 13,
    color: '#888',
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
  categoryPicker: {
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  categoryOptionActive: {
    backgroundColor: '#4fc3f7',
    borderColor: '#4fc3f7',
  },
  categoryOptionText: {
    color: '#888',
    fontSize: 13,
    marginLeft: 6,
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
});
