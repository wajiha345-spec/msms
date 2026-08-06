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
import { incomeApi, IncomeCategory } from '../../api/income';
import { Account } from '../../api/accounting';
import { colors } from '../../theme/colors';

export default function NewIncomeScreen() {
  const navigation = useNavigation<any>();

  const [category,      setCategory]      = useState<IncomeCategory | null>(null);
  const [incomeAccount, setIncomeAccount] = useState<Account | null>(null);
  const [receivedInto,  setReceivedInto]  = useState<Account | null>(null);
  const [amount,        setAmount]        = useState('');
  const [description,   setDescription]   = useState('');
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!category)       e.category = 'Please select a category';
    if (!incomeAccount)  e.incomeAccount = 'Please select an income account';
    if (!receivedInto)    e.receivedInto = 'Please select an account to receive into';
    if (!amount || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await incomeApi.create({
        categoryId:            category!.id,
        incomeAccountId:       incomeAccount!.id,
        receivedIntoAccountId: receivedInto!.id,
        amount:                Number(amount),
        description:           description.trim() || undefined,
      });
      Alert.alert('Income Recorded ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
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
        <Text style={styles.title}>New Income</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <CategoryModalPicker
          label="Category"
          value={category}
          onChange={setCategory}
          fetchCategories={async () => (await incomeApi.listCategories()).data.data}
          createCategory={async (name) => (await incomeApi.createCategory(name)).data.data}
        />
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        <AccountPicker
          label="Income Account"
          value={incomeAccount}
          onChange={setIncomeAccount}
          filterType="INCOME"
        />
        {errors.incomeAccount && <Text style={styles.errorText}>{errors.incomeAccount}</Text>}

        <AccountPicker
          label="Received Into"
          value={receivedInto}
          onChange={setReceivedInto}
          filterType="ASSET"
        />
        {errors.receivedInto && <Text style={styles.errorText}>{errors.receivedInto}</Text>}

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
          placeholder="e.g. Phone repair service charge"
          value={description}
          onChangeText={setDescription}
        />

        <Button label="Record Income" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
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
