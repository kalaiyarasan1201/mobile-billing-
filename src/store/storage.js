import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTS_KEY = '@products';
const BILLS_KEY = '@bills';
const SETTINGS_KEY = '@settings';

export const getProducts = async () => {
  try {
    const data = await AsyncStorage.getItem(PRODUCTS_KEY);
    let products = data ? JSON.parse(data) : [
      { id: '1', name: 'Bun Maska', category: 'Snacks & Breads', price: 25 },
      { id: '2', name: 'Samosa (2 pcs)', category: 'Snacks & Breads', price: 30 },
      { id: '3', name: 'Green Tea', category: 'Hot Tea & Coffee', price: 20 },
      { id: '4', name: 'Filter Coffee', category: 'Hot Tea & Coffee', price: 20 },
      { id: '5', name: 'Irani Special Chai', category: 'Hot Tea & Coffee', price: 20 },
      { id: '6', name: 'Ginger Tea', category: 'Hot Tea & Coffee', price: 15 },
      { id: '7', name: 'Masala Chai', category: 'Hot Tea & Coffee', price: 12 },
    ];
    
    // Auto-seed 10 more items
    const hasSeeded = await AsyncStorage.getItem('@seeded_10_extra');
    if (!hasSeeded) {
      const tenMore = [
         { id: '101', name: 'Cold Coffee', category: 'Coolers & Beverages', price: 40 },
         { id: '102', name: 'Lemon Mint Juice', category: 'Coolers & Beverages', price: 30 },
         { id: '103', name: 'Osmania Biscuits (3 pcs)', category: 'Snacks & Breads', price: 15 },
         { id: '104', name: 'Veg Puff', category: 'Snacks & Breads', price: 20 },
         { id: '105', name: 'Egg Puff', category: 'Snacks & Breads', price: 25 },
         { id: '106', name: 'Chicken Puff', category: 'Snacks & Breads', price: 35 },
         { id: '107', name: 'Vada Pav', category: 'Snacks & Breads', price: 25 },
         { id: '108', name: 'Sweet Lassi', category: 'Coolers & Beverages', price: 40 },
         { id: '109', name: 'Salted Lassi', category: 'Coolers & Beverages', price: 35 },
         { id: '110', name: 'Badam Milk', category: 'Hot Tea & Coffee', price: 30 }
      ];
      products = [...products, ...tenMore];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_10_extra', 'true');
    }

    // Auto-seed Pakoda
    const hasSeededPakoda = await AsyncStorage.getItem('@seeded_pakoda');
    if (!hasSeededPakoda) {
      const pakodaItem = [
         { id: '111', name: 'Onion Pakoda', category: 'Snacks & Breads', price: 20, unit: 'gram', stepQty: 50 }
      ];
      products = [...products, ...pakodaItem];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_pakoda', 'true');
    }

    // Auto-seed gram products
    const hasSeededGrams = await AsyncStorage.getItem('@seeded_grams_2');
    if (!hasSeededGrams) {
      const gramItems = [
         { id: '112', name: 'Mixture', category: 'Snacks & Breads', price: 30, unit: 'gram', stepQty: 100 },
         { id: '113', name: 'Sweet Boondi', category: 'Snacks & Breads', price: 25, unit: 'gram', stepQty: 50 }
      ];
      products = [...products, ...gramItems];
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      await AsyncStorage.setItem('@seeded_grams_2', 'true');
    }

    return products;
  } catch (e) {
    return [];
  }
};

export const saveProducts = async (products) => {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const getBills = async () => {
  try {
    const data = await AsyncStorage.getItem(BILLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveBill = async (bill) => {
  const bills = await getBills();
  bills.unshift(bill);
  await AsyncStorage.setItem(BILLS_KEY, JSON.stringify(bills));
};

export const getSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {
      shopName: 'ROYAL TEA STALL',
      tagline: 'Fresh Chai, Coffee & Snacks',
      address: 'Station Road, Main Market',
      phone: '+91 98765 43210'
    };
  } catch (e) {
    return null;
  }
};

export const saveSettings = async (settings) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
