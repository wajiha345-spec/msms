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
import ImportSalesHistoryScreen from '../screens/sales/ImportSalesHistoryScreen';
import PurchasesListScreen    from '../screens/purchases/PurchasesListScreen';
import NewPurchaseScreen      from '../screens/purchases/NewPurchaseScreen';
import MoreMenuScreen         from '../screens/more/MoreMenuScreen';
import SecondhandListScreen   from '../screens/secondhand/SecondhandListScreen';
import AddSecondhandScreen    from '../screens/secondhand/AddSecondhandScreen';
import SecondhandDetailScreen from '../screens/secondhand/SecondhandDetailScreen';
import ImeiSearchScreen       from '../screens/imei/ImeiSearchScreen';
import BusinessManagementScreen from '../screens/accounting/BusinessManagementScreen';
import ChartOfAccountsScreen  from '../screens/accounting/ChartOfAccountsScreen';
import NewAccountScreen       from '../screens/accounting/NewAccountScreen';
import JournalEntriesScreen   from '../screens/accounting/JournalEntriesScreen';
import NewJournalEntryScreen  from '../screens/accounting/NewJournalEntryScreen';
import GeneralLedgerScreen    from '../screens/accounting/GeneralLedgerScreen';
import TrialBalanceScreen     from '../screens/accounting/TrialBalanceScreen';
import BalanceSheetScreen     from '../screens/accounting/BalanceSheetScreen';
import ProfitLossScreen       from '../screens/accounting/ProfitLossScreen';
import CashFlowScreen         from '../screens/accounting/CashFlowScreen';
import ClosingEntryScreen     from '../screens/accounting/ClosingEntryScreen';
import ExpensesListScreen     from '../screens/expenses/ExpensesListScreen';
import NewExpenseScreen       from '../screens/expenses/NewExpenseScreen';
import ExpenseReportScreen    from '../screens/expenses/ExpenseReportScreen';
import IncomeListScreen       from '../screens/income/IncomeListScreen';
import NewIncomeScreen        from '../screens/income/NewIncomeScreen';
import IncomeReportScreen     from '../screens/income/IncomeReportScreen';
import CustomerLedgerListScreen    from '../screens/customerLedger/CustomerLedgerListScreen';
import CustomerStatementScreen     from '../screens/customerLedger/CustomerStatementScreen';
import RecordCustomerPaymentScreen from '../screens/customerLedger/RecordCustomerPaymentScreen';
import SupplierLedgerListScreen    from '../screens/supplierLedger/SupplierLedgerListScreen';
import SupplierStatementScreen     from '../screens/supplierLedger/SupplierStatementScreen';
import RecordSupplierPaymentScreen from '../screens/supplierLedger/RecordSupplierPaymentScreen';
import CashBankListScreen    from '../screens/cashBank/CashBankListScreen';
import NewDepositScreen      from '../screens/cashBank/NewDepositScreen';
import NewWithdrawalScreen   from '../screens/cashBank/NewWithdrawalScreen';
import NewTransferScreen     from '../screens/cashBank/NewTransferScreen';
import ReconciliationScreen  from '../screens/cashBank/ReconciliationScreen';
import QuotationsListScreen  from '../screens/quotations/QuotationsListScreen';
import NewQuotationScreen    from '../screens/quotations/NewQuotationScreen';
import QuotationDetailScreen from '../screens/quotations/QuotationDetailScreen';
import PurchaseOrdersListScreen  from '../screens/purchaseOrders/PurchaseOrdersListScreen';
import NewPurchaseOrderScreen    from '../screens/purchaseOrders/NewPurchaseOrderScreen';
import PurchaseOrderDetailScreen from '../screens/purchaseOrders/PurchaseOrderDetailScreen';
import ReceiveGoodsScreen        from '../screens/purchaseOrders/ReceiveGoodsScreen';
import SalesOrdersListScreen  from '../screens/salesOrders/SalesOrdersListScreen';
import NewSalesOrderScreen    from '../screens/salesOrders/NewSalesOrderScreen';
import SalesOrderDetailScreen from '../screens/salesOrders/SalesOrderDetailScreen';
import TeamMembersScreen      from '../screens/users/TeamMembersScreen';
import NewTeamMemberScreen    from '../screens/users/NewTeamMemberScreen';
import TeamMemberDetailScreen from '../screens/users/TeamMemberDetailScreen';
import RolePermissionsScreen  from '../screens/users/RolePermissionsScreen';
import BranchesListScreen     from '../screens/branches/BranchesListScreen';
import NewBranchScreen        from '../screens/branches/NewBranchScreen';
import BranchDetailScreen     from '../screens/branches/BranchDetailScreen';
import BranchReportScreen     from '../screens/branches/BranchReportScreen';
import AssignProductsScreen   from '../screens/branches/AssignProductsScreen';
import CustomersListScreen    from '../screens/crm/CustomersListScreen';
import NewCustomerScreen      from '../screens/crm/NewCustomerScreen';
import CustomerProfileScreen  from '../screens/crm/CustomerProfileScreen';
import FollowUpsScreen        from '../screens/crm/FollowUpsScreen';
import NotificationsScreen    from '../screens/notifications/NotificationsScreen';
import BackupScreen           from '../screens/backup/BackupScreen';
import SettingsScreen         from '../screens/settings/SettingsScreen';
import LowStockScreen         from '../screens/inventory/LowStockScreen';
import TransferStockScreen    from '../screens/inventory/TransferStockScreen';
import ReportsHubScreen       from '../screens/reports/ReportsHubScreen';
import SalesSummaryScreen     from '../screens/reports/SalesSummaryScreen';

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
      <SStack.Screen name="ImportSalesHistory" component={ImportSalesHistoryScreen} />
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

      {/* Business Management — Accounting Foundation */}
      <MStack.Screen name="BusinessManagement" component={BusinessManagementScreen} />
      <MStack.Screen name="ChartOfAccounts"    component={ChartOfAccountsScreen} />
      <MStack.Screen name="NewAccount"         component={NewAccountScreen} />
      <MStack.Screen name="JournalEntries"     component={JournalEntriesScreen} />
      <MStack.Screen name="NewJournalEntry"    component={NewJournalEntryScreen} />
      <MStack.Screen name="GeneralLedger"      component={GeneralLedgerScreen} />
      <MStack.Screen name="TrialBalance"       component={TrialBalanceScreen} />
      <MStack.Screen name="BalanceSheet"       component={BalanceSheetScreen} />
      <MStack.Screen name="ProfitLoss"         component={ProfitLossScreen} />
      <MStack.Screen name="CashFlow"           component={CashFlowScreen} />
      <MStack.Screen name="ClosingEntry"       component={ClosingEntryScreen} />

      {/* Business Management — Expense & Income Management */}
      <MStack.Screen name="ExpensesList"  component={ExpensesListScreen} />
      <MStack.Screen name="NewExpense"    component={NewExpenseScreen} />
      <MStack.Screen name="ExpenseReport" component={ExpenseReportScreen} />
      <MStack.Screen name="IncomeList"    component={IncomeListScreen} />
      <MStack.Screen name="NewIncome"     component={NewIncomeScreen} />
      <MStack.Screen name="IncomeReport"  component={IncomeReportScreen} />

      {/* Business Management — Customer & Supplier Ledger */}
      <MStack.Screen name="CustomerLedgerList"    component={CustomerLedgerListScreen} />
      <MStack.Screen name="CustomerStatement"     component={CustomerStatementScreen} />
      <MStack.Screen name="RecordCustomerPayment" component={RecordCustomerPaymentScreen} />
      <MStack.Screen name="SupplierLedgerList"    component={SupplierLedgerListScreen} />
      <MStack.Screen name="SupplierStatement"     component={SupplierStatementScreen} />
      <MStack.Screen name="RecordSupplierPayment" component={RecordSupplierPaymentScreen} />

      {/* Business Management — Cash & Bank Management */}
      <MStack.Screen name="CashBankList"   component={CashBankListScreen} />
      <MStack.Screen name="NewDeposit"     component={NewDepositScreen} />
      <MStack.Screen name="NewWithdrawal"  component={NewWithdrawalScreen} />
      <MStack.Screen name="NewTransfer"    component={NewTransferScreen} />
      <MStack.Screen name="Reconciliation" component={ReconciliationScreen} />

      {/* Business Management — Quotations */}
      <MStack.Screen name="QuotationsList"   component={QuotationsListScreen} />
      <MStack.Screen name="NewQuotation"     component={NewQuotationScreen} />
      <MStack.Screen name="QuotationDetail"  component={QuotationDetailScreen} />

      {/* Business Management — Purchase Orders & Sales Orders */}
      <MStack.Screen name="PurchaseOrdersList"   component={PurchaseOrdersListScreen} />
      <MStack.Screen name="NewPurchaseOrder"     component={NewPurchaseOrderScreen} />
      <MStack.Screen name="PurchaseOrderDetail"  component={PurchaseOrderDetailScreen} />
      <MStack.Screen name="ReceiveGoods"         component={ReceiveGoodsScreen} />
      <MStack.Screen name="SalesOrdersList"      component={SalesOrdersListScreen} />
      <MStack.Screen name="NewSalesOrder"        component={NewSalesOrderScreen} />
      <MStack.Screen name="SalesOrderDetail"     component={SalesOrderDetailScreen} />

      {/* Business Management — Multi-User Roles & Permissions */}
      <MStack.Screen name="TeamMembersList"  component={TeamMembersScreen} />
      <MStack.Screen name="NewTeamMember"    component={NewTeamMemberScreen} />
      <MStack.Screen name="TeamMemberDetail" component={TeamMemberDetailScreen} />
      <MStack.Screen name="RolePermissions"  component={RolePermissionsScreen} />

      {/* Business Management — Multi-Branch */}
      <MStack.Screen name="BranchesList"    component={BranchesListScreen} />
      <MStack.Screen name="NewBranch"       component={NewBranchScreen} />
      <MStack.Screen name="BranchDetail"    component={BranchDetailScreen} />
      <MStack.Screen name="BranchReport"    component={BranchReportScreen} />
      <MStack.Screen name="AssignProducts"  component={AssignProductsScreen} />

      {/* Business Management — CRM */}
      <MStack.Screen name="CustomersList"   component={CustomersListScreen} />
      <MStack.Screen name="NewCustomer"     component={NewCustomerScreen} />
      <MStack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
      <MStack.Screen name="FollowUps"       component={FollowUpsScreen} />

      {/* Business Management — Notification System */}
      <MStack.Screen name="Notifications"   component={NotificationsScreen} />

      {/* Business Management — Data Backup */}
      <MStack.Screen name="Backup"          component={BackupScreen} />

      {/* Business Management — Settings */}
      <MStack.Screen name="Settings"        component={SettingsScreen} />

      {/* Business Management — Inventory Enhancements */}
      <MStack.Screen name="LowStock"        component={LowStockScreen} />
      <MStack.Screen name="TransferStock"   component={TransferStockScreen} />

      {/* Business Management — Reports Hub */}
      <MStack.Screen name="ReportsHub"      component={ReportsHubScreen} />
      <MStack.Screen name="SalesSummary"    component={SalesSummaryScreen} />
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
        options={{ tabBarLabel: 'Products',
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
