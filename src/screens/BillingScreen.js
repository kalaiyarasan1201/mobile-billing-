import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, FlatList, Modal, Image } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getProducts, getSettings, saveBill } from '../store/storage';
import { useIsFocused } from '@react-navigation/native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export default function BillingScreen() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isListening, setIsListening] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    setProducts(await getProducts());
    setSettings(await getSettings());
  };

  // Extract unique categories from products
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const wsRef = React.useRef(null);
  const [isPcMicActive, setIsPcMicActive] = useState(false);

  // Initialize WebSocket connection to Python Voice Server
  useEffect(() => {
    // Connect to Python Voice Server (using Laptop IP)
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://172.27.58.242:8765');
      
      ws.onopen = () => {
        console.log('Connected to Python Voice Server');
      };
      
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          
          if (data.status === 'listening') {
            setIsPcMicActive(true);
          } else if (data.status === 'stopped') {
            setIsPcMicActive(false);
          } else if (data.type === 'bill_update' && data.items) {
            // Update cart with parsed items
            data.items.forEach(parsedItem => {
              // Find product by exact ID or name matching
              const product = products.find(p => p.id === parsedItem.product_id || p.name.toLowerCase() === parsedItem.product.toLowerCase());
              if (product) {
                // Determine quantity to add
                const qtyToAdd = parsedItem.quantity ? Math.ceil(parsedItem.quantity) : 1;
                
                setCart(prevCart => {
                  const existingItem = prevCart.find(item => item.id === product.id);
                  if (existingItem) {
                    return prevCart.map(item => item.id === product.id ? { ...item, qty: item.qty + qtyToAdd } : item);
                  } else {
                    return [...prevCart, { ...product, qty: qtyToAdd }];
                  }
                });
                console.log(`Added ${qtyToAdd}x ${product.name} to cart via NLP`);
              }
            });
            if (data.items.length > 0) {
               alert(`Added ${data.items.length} items from voice!`);
            }
          }
        } catch (err) {
          console.error("WebSocket message parsing error:", err);
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected from Python Voice Server');
        setIsPcMicActive(false);
        // Try reconnecting after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current = ws;
    };
    
    if (products.length > 0) {
        connectWebSocket();
    }
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [products]);

  // Mobile Microphone processing
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const spokenText = event.results[0].transcript.toLowerCase();
      console.log("Mobile Spoken Text:", spokenText);
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          command: 'process_text', 
          text: spokenText,
          products: products 
        }));
      } else {
        // Fallback if websocket is not connected
        const matchedProduct = products.find(p => spokenText.includes(p.name.toLowerCase()));
        if (matchedProduct) {
          addToCart(matchedProduct);
          alert(`Added ${matchedProduct.name} to cart via Voice Fallback!`);
        } else {
          setSearchQuery(spokenText);
        }
      }
      
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    }
  });

  const handleMobileVoiceSearch = async () => {
    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        return;
      }
      setIsListening(true);
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      ExpoSpeechRecognitionModule.start({ lang: 'ta-IN' }); // Prioritize Tamil
    } catch (e) {
      console.log('Speech recognition error', e);
      alert('Could not start voice recognition. Check microphone permissions.');
      setIsListening(false);
    }
  };

  const togglePcMic = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (isPcMicActive) {
        wsRef.current.send(JSON.stringify({ command: 'stop' }));
        setIsPcMicActive(false);
      } else {
        wsRef.current.send(JSON.stringify({ command: 'start' }));
        setIsPcMicActive(true);
      }
    } else {
      alert("Python Voice Server is not connected. Check if server.py is running on your laptop.");
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem.qty > 1) {
      setCart(cart.map(item => item.id === productId ? { ...item, qty: item.qty - 1 } : item));
    } else {
      setCart(cart.filter(item => item.id !== productId));
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const getCartQty = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.qty : 0;
  };

  // Filter products by search query AND selected category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePrint = async () => {
    const bill = {
      id: `TSB-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      items: cart,
      total: totalPrice,
      paymentMethod
    };
    await saveBill(bill);

    // Print to terminal console
    console.log('\n================================');
    console.log(`        ${settings?.shopName || 'ROYAL TEA STALL'}`);
    if (settings?.address) console.log(`        ${settings.address}`);
    if (settings?.phone) console.log(`        Ph: ${settings.phone}`);
    console.log('================================');
    console.log(`Bill No: ${bill.id}`);
    console.log(`Date: ${bill.date}  Time: ${bill.time}`);
    console.log('--------------------------------');
    console.log('Item            Qty   Rate   Total');
    console.log('--------------------------------');
    bill.items.forEach(item => {
      const name = item.name.padEnd(15).substring(0, 15);
      const qty = String(item.qty).padEnd(5);
      const price = String(item.price).padEnd(6);
      const total = String(item.qty * item.price);
      console.log(`${name} ${qty} ${price} ${total}`);
    });
    console.log('--------------------------------');
    console.log(`Total Items: ${bill.items.length}   Total Qty: ${totalItems}`);
    console.log('================================');
    console.log(`GRAND TOTAL:           Rs. ${bill.total.toFixed(2)}`);
    console.log('================================\n');

    setCart([]);
    setShowReceiptPreview(false);
    alert('Bill saved and receipt printed to console!');
  };

  const renderProductCard = ({ item }) => {
    const qty = getCartQty(item.id);
    
    return (
      <View style={styles.productCard}>
        <View style={styles.priceTag}>
          <Text style={styles.priceTagText}>₹{item.price}</Text>
        </View>
        
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <MaterialIcons name="local-cafe" size={40} color={Colors.primary} style={{alignSelf: 'center', marginVertical: 10}} />
        )}
        
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productCategory} numberOfLines={1}>{item.category}</Text>
        
        {qty === 0 ? (
          <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
            <Text style={styles.addButtonText}>+ ADD</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.stepperContainer}>
            <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>-</Text></TouchableOpacity>
            <Text style={styles.stepperValue}>{qty} in cart</Text>
            <TouchableOpacity onPress={() => addToCart(item)} style={styles.stepperBtn}><Text style={styles.stepperBtnText}>+</Text></TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <FontAwesome5 name="coffee" size={20} color="#fff" style={{marginRight: 10}} />
          <View style={{flex: 1}}>
            <Text style={styles.shopName}>{settings?.shopName || 'ROYAL TEA STALL'}</Text>
            <Text style={styles.dateText}>{new Date().toDateString()}</Text>
          </View>
          <View style={styles.printerBadge}>
            <FontAwesome5 name="print" size={12} color="#fff" style={{marginRight: 5}} />
            <Text style={{color: '#fff', fontSize: 12}}>No Printer</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome5 name="search" size={16} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chai, samosa, coffee..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={handleMobileVoiceSearch}>
          <FontAwesome5 name="microphone" size={20} color={isListening ? Colors.primary : Colors.textLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
          {categories.map(category => (
            <TouchableOpacity 
              key={category}
              style={[styles.filterChip, selectedCategory === category && styles.filterChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={selectedCategory === category ? styles.filterChipTextActive : styles.filterChipText}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProductCard}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
      />

      {totalItems > 0 && (
        <View style={styles.bottomSheet}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment:</Text>
            <View style={styles.paymentOptions}>
              {['Cash', 'UPI', 'Card'].map(method => (
                <TouchableOpacity key={method} style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnActive]} onPress={() => setPaymentMethod(method)}>
                  <Text style={[styles.paymentBtnText, paymentMethod === method && styles.paymentBtnTextActive]}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.cartRow}>
            <View>
              <Text style={styles.cartItemsText}><FontAwesome5 name="shopping-cart" /> {totalItems} Items</Text>
              <Text style={styles.cartTotal}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.printBillBtn} onPress={() => setShowReceiptPreview(true)}>
              <FontAwesome5 name="print" size={16} color="#fff" style={{marginRight: 10}} />
              <Text style={styles.printBillText}>PRINT BILL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Thermal Receipt Preview Modal */}
      <Modal visible={showReceiptPreview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <FontAwesome5 name="receipt" size={18} color={Colors.primary} style={{marginRight: 10}} />
                <Text style={styles.modalTitle}>Thermal Receipt Preview</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReceiptPreview(false)}>
                <FontAwesome5 name="times" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>No Printer Connected (Will print to Virtual Console) ⚠️</Text>
            </View>

            <ScrollView style={styles.receiptPaper} showsVerticalScrollIndicator={false}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptShopName}>{settings?.shopName || 'ROYAL TEA STALL'}</Text>
                {settings?.address ? <Text style={styles.receiptCenterText}>{settings.address}</Text> : null}
                {settings?.phone ? <Text style={styles.receiptCenterText}>Ph: {settings.phone}</Text> : null}
              </View>

              <View style={styles.receiptDivider} />
              
              <View style={styles.receiptRow}>
                <Text style={styles.receiptText}>Bill No:</Text>
                <Text style={styles.receiptTextBold}>TSB-{Math.floor(1000 + Math.random() * 9000)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptText}>Date: {new Date().toLocaleDateString()}</Text>
                <Text style={styles.receiptText}>Time: {new Date().toLocaleTimeString()}</Text>
              </View>

              <View style={styles.receiptDivider} />
              
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptTextBold, {flex: 2}]}>Item</Text>
                <Text style={[styles.receiptTextBold, {flex: 1, textAlign: 'center'}]}>Qty</Text>
                <Text style={[styles.receiptTextBold, {flex: 1, textAlign: 'right'}]}>Rate</Text>
                <Text style={[styles.receiptTextBold, {flex: 1, textAlign: 'right'}]}>Total</Text>
              </View>
              
              <View style={styles.receiptDivider} />
              
              {cart.map(item => (
                <View key={item.id} style={[styles.receiptRow, {marginBottom: 6}]}>
                  <Text style={[styles.receiptText, {flex: 2}]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.receiptText, {flex: 1, textAlign: 'center'}]}>{item.qty}</Text>
                  <Text style={[styles.receiptText, {flex: 1, textAlign: 'right'}]}>{item.price}</Text>
                  <Text style={[styles.receiptText, {flex: 1, textAlign: 'right'}]}>{item.qty * item.price}</Text>
                </View>
              ))}
              
              <View style={styles.receiptDivider} />
              
              <View style={styles.receiptRow}>
                <Text style={styles.receiptText}>Items: {cart.length}</Text>
                <Text style={styles.receiptText}>Qty: {totalItems}</Text>
              </View>
              
              <View style={styles.receiptDivider} />
              
              <View style={styles.receiptRow}>
                <Text style={styles.receiptTotalLabel}>GRAND TOTAL:</Text>
                <Text style={styles.receiptTotalValue}>₹ {totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.receiptDivider} />
              <Text style={[styles.receiptCenterText, {marginTop: 5, fontSize: 12}]}>Thank you for your visit!</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReceiptPreview(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmPrintBtn} onPress={handlePrint}>
                <FontAwesome5 name="print" size={16} color="#fff" style={{marginRight: 10}} />
                <Text style={styles.confirmPrintText}>PRINT RECEIPT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 15, paddingTop: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  shopName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dateText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  printerBadge: { backgroundColor: 'rgba(0,0,0,0.2)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  filtersWrapper: { paddingLeft: 15, marginBottom: 15 },
  filtersContainer: { paddingRight: 15, alignItems: 'center' },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginRight: 10, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.text, fontSize: 14 },
  filterChipTextActive: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  gridContainer: { paddingHorizontal: 10, paddingBottom: 150 },
  productCard: { flex: 1, backgroundColor: Colors.primaryLight, margin: 5, borderRadius: 12, padding: 12, position: 'relative' },
  priceTag: { position: 'absolute', top: 10, right: 10, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 1 },
  priceTagText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  productImage: { width: 50, height: 50, borderRadius: 25, alignSelf: 'center', marginVertical: 10 },
  productName: { fontSize: 14, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: 2 },
  productCategory: { fontSize: 10, color: Colors.textLight, textAlign: 'center', marginBottom: 10 },
  addButton: { backgroundColor: Colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, padding: 5 },
  stepperBtn: { paddingHorizontal: 10 },
  stepperBtnText: { color: Colors.primary, fontSize: 18, fontWeight: 'bold' },
  stepperValue: { color: Colors.primary, fontWeight: 'bold' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.primaryLight, padding: 15, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: -2}, shadowOpacity: 0.1, shadowRadius: 5 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  paymentLabel: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginRight: 15 },
  paymentOptions: { flexDirection: 'row', flex: 1, gap: 10 },
  paymentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  paymentBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentBtnText: { fontSize: 14, color: Colors.textLight },
  paymentBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartItemsText: { fontSize: 14, color: Colors.text },
  cartTotal: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
  printBillBtn: { backgroundColor: Colors.primary, flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  printBillText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  warningBanner: { backgroundColor: Colors.primaryLight, padding: 10 },
  warningText: { color: Colors.primary, fontSize: 12, textAlign: 'center' },
  receiptPaper: { backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 0, maxHeight: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  receiptHeader: { alignItems: 'center', marginBottom: 10 },
  receiptShopName: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 4, textAlign: 'center' },
  receiptCenterText: { fontFamily: 'monospace', fontSize: 12, color: '#333', textAlign: 'center', marginBottom: 2 },
  receiptDivider: { height: 1, width: '100%', borderBottomWidth: 1, borderColor: '#000', borderStyle: 'dashed', marginVertical: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptText: { fontFamily: 'monospace', fontSize: 12, color: '#000' },
  receiptTextBold: { fontFamily: 'monospace', fontSize: 12, color: '#000', fontWeight: 'bold' },
  receiptTotalLabel: { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', color: '#000' },
  receiptTotalValue: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#000' },
  modalActions: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.primary, fontWeight: 'bold' },
  confirmPrintBtn: { flex: 2, backgroundColor: Colors.primary, flexDirection: 'row', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  confirmPrintText: { color: '#fff', fontWeight: 'bold' }
});
