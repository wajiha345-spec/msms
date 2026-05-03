import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen        from '../screens/dashboard/DashboardScreen';
import ProductListScreen      from '../screens/products/ProductListScreen';
import AddProductScreen       from '../screens/products/AddProductScreen';
import ImportProductsScreen   from '../screens/products/ImportProductsScreen';
import ProductDetailScreen    from '../screens/products/ProductDetailScreen';
import CatalogScreen          from '../screens/catalog/CatalogScreen';
import SalesListScreen        from '../screens/sales/SalesListScreen';
import NewSaleScreen          from '../screens/sales/NewSaleScreen';
import PurchasesListScreen    from '../screens/purchases/PurchasesListScreen';
import NewPurchaseScreen      from '../screens/purchases/NewPurchaseScreen';
import MoreMenuScreen         from '../screens/more/MoreMenuScreen';
import SecondhandListScreen   from '../screens/secondhand/SecondhandListScreen';
import AddSecondhandScreen    from '../screens/secondhand/AddSecondhandScreen';
import SecondhandDetailScreen from '../screens/secondhand/SecondhandDetailScreen';
import ImeiSearchScreen       from '../screens/imei/ImeiSearchScreen';

import { colors } from '../theme/colors';

const Tab    = createBottomTabNavigator();
const PStack = createNativeStackNavigator();
const SStack = createNativeStackNavigator();
const BStack = createNativeStackNavigator();
const MStack = createNativeStackNavigator();

function ProductsStack() {
  return (
    <PStack.Navigator screenOptions={{ headerShown: false }}>
      <PStack.Screen name="ProductList"     component={ProductListScreen} />
      <PStack.Screen name="AddProduct"      component={AddProductScreen} />
      <PStack.Screen name="ImportProducts"  component={ImportProductsScreen} />
      <PStack.Screen name="ProductDetail"   component={ProductDetailScreen} />
    </PStack.Navigator>
  );
}

function SalesStack() {
  return (
    <SStack.Navigator screenOptions={{ headerShown: false }}>
      <SStack.Screen name="SalesList" component={SalesListScreen} />
      <SStack.Screen name="NewSale"   component={NewSaleScreen} />
    </SStack.Navigator>
  );
}

function PurchasesStack() {
  return (
    <BStack.Navigator screenOptions={{ headerShown: false }}>
      <BStack.Screen name="PurchasesList" component={PurchasesListScreen} />
      <BStack.Screen name="NewPurchase"   component={NewPurchaseScreen} />
    </BStack.Navigator>
  );
}

function MoreStack() {
  return (
    <MStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Hub screen — always the first screen, always shown when tab is tapped */}
      <MStack.Screen name="MoreMenu"         component={MoreMenuScreen} />
      <MStack.Screen name="SecondhandList"   component={SecondhandListScreen} />
      <MStack.Screen name="AddSecondhand"    component={AddSecondhandScreen} />
      <MStack.Screen name="SecondhandDetail" component={SecondhandDetailScreen} />
      <MStack.Screen name="ImeiSearch"       component={ImeiSearchScreen} />
      <MStack.Screen name="Catalog"          component={CatalogScreen} />
    </MStack.Navigator>
  );
}

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation, route }) => ({
        headerShown:             false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle:             { borderTopColor: colors.border },
      })}
    >
      <Tab.Screen name="DashboardTab"  component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }} />
      <Tab.Screen name="ProductsTab"   component={ProductsStack}
        options={{ tabBarLabel: 'Inventory',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📦</Text> }} />
      <Tab.Screen name="SalesTab"      component={SalesStack}
        options={{ tabBarLabel: 'Sales',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>💰</Text> }} />
      <Tab.Screen name="PurchasesTab"  component={PurchasesStack}
        options={{ tabBarLabel: 'Purchases',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🛒</Text> }} />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{ tabBarLabel: 'More',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>☰</Text> }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('MoreTab', { screen: 'MoreMenu' });
          },
        })}
      />
    </Tab.Navigator>
  );
}
