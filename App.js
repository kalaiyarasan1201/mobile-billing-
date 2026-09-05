import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import BillingScreen from './src/screens/BillingScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import PrinterSetupScreen from './src/screens/PrinterSetupScreen';
import HistorySalesScreen from './src/screens/HistorySalesScreen';
import Colors from './src/constants/Colors';

LogBox.ignoreLogs(['props.pointerEvents is deprecated']);

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Billing') {
                return <FontAwesome5 name="receipt" size={size} color={color} />;
              } else if (route.name === 'Products') {
                return <MaterialCommunityIcons name="food" size={size} color={color} />;
              } else if (route.name === 'Printer Setup') {
                return <FontAwesome5 name="print" size={size} color={color} />;
              } else if (route.name === 'History & Sales') {
                return <FontAwesome5 name="wallet" size={size} color={color} />;
              }
            },
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: Colors.primary,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen name="Billing" component={BillingScreen} options={{ headerShown: false }} />
          <Tab.Screen name="Products" component={ProductsScreen} />
          <Tab.Screen name="Printer Setup" component={PrinterSetupScreen} />
          <Tab.Screen name="History & Sales" component={HistorySalesScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
