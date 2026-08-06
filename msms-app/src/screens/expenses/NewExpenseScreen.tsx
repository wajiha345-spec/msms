import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { AccountPicker } from '../../components/AccountPicker';
import { CategoryModalPicker } from '../../components/CategoryModalPicker';
import { PhotoPicker } from '../../components/PhotoPicker';
import { expensesApi, ExpenseCategory } from '../../api/expenses';
import { Account } from '../../api/accounting';
import { colors } from '../../theme/colors';

export default function NewExpenseScreen() {
  const navigation = useNavigation<any>();

  const [category,       setCategory]       = useState<ExpenseCategory | null>(null);
  const [expenseAccount, setExpenseAccount] = useState<Account | null>(null);
  const [paidFrom,       setPaidFrom]       = useState<Account | null>(null);
  const [amount,         setAmount]         = useState('');
  const [description,    setDescription]    = useState('');
  const [billUri,        setBillUri]        = useState<string | undefined>();
  const [loading,        setLoading]        = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!category)       e.category = 'Please select a category';
    if (!expenseAccount) e.expenseAccount = 'Please select an expense account';
    if (!paidFrom)        e.paidFrom = 'Please select an account to pay from';
    if (!amount || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('categoryId', category!.id);
      formData.append('expenseAccountId', expenseAccount!.id);
      formData.append('paidFromAccountId', paidFrom!.id);
      formData.append('amount', amount);
      if (description.trim()) formData.append('description', description.trim());

      if (billUri) {
        const filename = billUri.split('/').pop() ?? 'bill.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
        formData.append('bill', {
          uri:  billUri,
          name: filename,
          type: ext === 'png' ? 'image/png' : 'image/jpeg',
        } as any);
      }

      await expensesApi.create(formData);
      Alert.alert('Expense Recorded ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Expense</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <CategoryModalPicker
          label="Category"
          value={category}
          onChange={setCategory}
          fetchCategories={async () => (await expensesApi.listCategories()).data.data}
          createCategory={async (name) => (await expensesApi.createCategory(name)).data.data}
        />
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        <AccountPicker
          label="Expense Account"
          value={expenseAccount}
          onChange={setExpenseAccount}
          filterType="EXPENSE"
        />
        {errors.expenseAccount && <Text style={styles.errorText}>{errors.expenseAccount}</Text>}

        <AccountPicker
          label="Paid From"
          value={paidFrom}
          onChange={setPaidFrom}
          filterType="ASSET"
        />
        {errors.paidFrom && <Text style={styles.errorText}>{errors.paidFrom}</Text>}

        <Input
          label="Amount (Rs) *"
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          error={errors.amount}
        />
        <Input
          label="Description (optional)"
          placeholder="e.g. Shop electricity bill for July"
          value={description}
          onChangeText={setDescription}
        />

        <PhotoPicker
          label="Attach Bill (optional)"
          uri={billUri}
          onPick={setBillUri}
          onClear={() => setBillUri(undefined)}
        />

        <Button label="Record Expense" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  form:    { padding: 16 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 10 },
});
