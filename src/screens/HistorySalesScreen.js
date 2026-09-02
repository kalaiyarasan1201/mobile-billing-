import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getBills } from '../store/storage';
import { useIsFocused } from '@react-navigation/native';

export default function HistorySalesScreen() {
  const [bills, setBills] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('total'); // 'daily', 'monthly', 'yearly', 'total'
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadBills();
    }
  }, [isFocused]);

  const loadBills = async () => {
    const data = await getBills();
    setBills(data);
  };

  const today = new Date().toLocaleDateString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  let dailySales = 0;
  let monthlySales = 0;
  let yearlySales = 0;
  let totalSales = 0;

  const dailyBills = [];
  const monthlyBills = [];
  const yearlyBills = [];

  bills.forEach(bill => {
    totalSales += bill.total;
    const billDateObj = new Date(bill.date);
    
    if (bill.date === today) {
      dailySales += bill.total;
      dailyBills.push(bill);
    }
    if (billDateObj.getMonth() === currentMonth && billDateObj.getFullYear() === currentYear) {
      monthlySales += bill.total;
      monthlyBills.push(bill);
    }
    if (billDateObj.getFullYear() === currentYear) {
      yearlySales += bill.total;
      yearlyBills.push(bill);
    }
  });

  let displayedBills = bills;
  let listHeaderTitle = `All Receipts (${bills.length})`;
  
  if (selectedFilter === 'daily') {
    displayedBills = dailyBills;
    listHeaderTitle = `Today's Receipts (${dailyBills.length})`;
  } else if (selectedFilter === 'monthly') {
    displayedBills = monthlyBills;
    listHeaderTitle = `This Month's Receipts (${monthlyBills.length})`;
  } else if (selectedFilter === 'yearly') {
    displayedBills = yearlyBills;
    listHeaderTitle = `This Year's Receipts (${yearlyBills.length})`;
  }

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="receipt" size={60} color={Colors.border} />
      <Text style={styles.emptyText}>No bills found for this period.</Text>
    </View>
  );

  const renderBillItem = ({ item }) => (
    <View style={styles.billCard}>
      <View style={styles.billIcon}>
        <FontAwesome5 name="receipt" size={20} color={Colors.primary} />
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billId}>{item.id}</Text>
        <Text style={styles.billDate}>{item.date} {item.time ? `- ${item.time}` : ''}</Text>
      </View>
      <Text style={styles.billAmount}>₹{item.total}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bill History & Sales</Text>
      </View>

      <View style={styles.summaryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#6C5CE7' }, selectedFilter === 'total' && styles.activeCard]}
            onPress={() => setSelectedFilter('total')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><MaterialCommunityIcons name="cash-multiple" size={18} color="#6C5CE7" /></View>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <Text style={styles.summaryValue}>₹{totalSales}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#FF7675' }, selectedFilter === 'daily' && styles.activeCard]}
            onPress={() => setSelectedFilter('daily')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><FontAwesome5 name="calendar-day" size={16} color="#FF7675" /></View>
              <Text style={styles.summaryLabel}>Today</Text>
            </View>
            <Text style={styles.summaryValue}>₹{dailySales}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#0984E3' }, selectedFilter === 'monthly' && styles.activeCard]}
            onPress={() => setSelectedFilter('monthly')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><FontAwesome5 name="calendar-alt" size={16} color="#0984E3" /></View>
              <Text style={styles.summaryLabel}>Monthly</Text>
            </View>
            <Text style={styles.summaryValue}>₹{monthlySales}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#00B894' }, selectedFilter === 'yearly' && styles.activeCard]}
            onPress={() => setSelectedFilter('yearly')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><FontAwesome5 name="calendar" size={16} color="#00B894" /></View>
              <Text style={styles.summaryLabel}>Yearly</Text>
            </View>
            <Text style={styles.summaryValue}>₹{yearlySales}</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>{listHeaderTitle}</Text>
        {selectedFilter !== 'total' && (
          <TouchableOpacity onPress={() => setSelectedFilter('total')} style={styles.clearBtn}>
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayedBills}
        keyExtractor={item => item.id}
        renderItem={renderBillItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={displayedBills.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

import { TouchableOpacity, ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { backgroundColor: Colors.primary, padding: 15, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 15, elevation: 5 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  summaryContainer: { marginBottom: 10 },
  scrollContent: { paddingHorizontal: 15, gap: 10, paddingBottom: 10 },
  summaryCard: {
    width: 110,
    height: 85,
    padding: 10,
    borderRadius: 16,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  activeCard: {
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
    borderColor: '#fff'
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrapper: { backgroundColor: '#fff', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
  
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 15, marginTop: 10, marginBottom: 10 },
  listHeader: { fontSize: 16, color: '#2D3436', fontWeight: '800' },
  clearBtn: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  clearFilterText: { fontSize: 11, color: Colors.primary, fontWeight: 'bold' },
  
  listContent: { paddingHorizontal: 15, paddingBottom: 30 },
  emptyListContent: { flex: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: Colors.textLight, marginTop: 20, fontSize: 14, lineHeight: 20 },
  
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary
  },
  billIcon: { backgroundColor: '#FFF0E6', width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  billInfo: { flex: 1 },
  billId: { fontWeight: '800', fontSize: 14, color: '#2D3436' },
  billDate: { fontSize: 11, color: '#636E72', marginTop: 2, fontWeight: '500' },
  billAmount: { fontWeight: '900', fontSize: 16, color: Colors.primary }
});
