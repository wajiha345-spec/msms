import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import VariantPicker from './VariantPicker';
import { AccountPicker } from './AccountPicker';
import { Input } from './Inputs';
import { Account } from '../api/accounting';
import { PaymentFields } from '../api/payment';
import { colors } from '../theme/colors';

// Cash / Account / Split picker reused by every money-moving action (Sale,
// Purchase, secondhand purchase, PO receipt, SO delivery, Quotation
// conversion, installment/credit settlement). "Account" excludes Cash itself
// (already covered by the Cash option) and the Accounts Receivable/Payable
// tracking accounts (never a real destination for cash).
const EXCLUDED_ACCOUNT_CODES = ['1000', '1100', '2000'];

const METHOD_OPTIONS = ['Cash', 'Account', 'Split (Cash + Account)'] as const;
type MethodOption = typeof METHOD_OPTIONS[number];

const OPTION_TO_METHOD: Record<MethodOption, PaymentFields['paymentMethod']> = {
  'Cash': 'CASH',
  'Account': 'ACCOUNT',
  'Split (Cash + Account)': 'SPLIT',
};
const METHOD_TO_OPTION: Record<string, MethodOption> = {
  CASH: 'Cash', ACCOUNT: 'Account', SPLIT: 'Split (Cash + Account)',
};

interface PaymentMethodPickerProps {
  total:    number;
  value:    PaymentFields;
  onChange: (fields: PaymentFields) => void;
  label?:   string;
}

export function PaymentMethodPicker({ total, value, onChange, label = 'Payment Method *' }: PaymentMethodPickerProps) {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  function selectMethod(option: string) {
    const method = OPTION_TO_METHOD[option as MethodOption];
    if (method === 'CASH') {
      onChange({ paymentMethod: 'CASH' });
    } else if (method === 'ACCOUNT') {
      onChange({ paymentMethod: 'ACCOUNT', accountId: value.accountId });
    } else {
      onChange({ paymentMethod: 'SPLIT', accountId: value.accountId, cashAmount: 0, accountAmount: total });
    }
  }

  const splitDiff = value.paymentMethod === 'SPLIT'
    ? total - ((value.cashAmount ?? 0) + (value.accountAmount ?? 0))
    : 0;

  return (
    <View>
      <VariantPicker
        label={label}
        value={value.paymentMethod ? METHOD_TO_OPTION[value.paymentMethod] : ''}
        onChange={selectMethod}
        options={[...METHOD_OPTIONS]}
        required
      />

      {(value.paymentMethod === 'ACCOUNT' || value.paymentMethod === 'SPLIT') && (
        <AccountPicker
          label="Account"
          value={selectedAccount}
          onChange={(a) => { setSelectedAccount(a); onChange({ ...value, accountId: a.id }); }}
          filterType="ASSET"
          excludeCodes={EXCLUDED_ACCOUNT_CODES}
        />
      )}

      {value.paymentMethod === 'SPLIT' && (
        <>
          <View style={styles.splitRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Cash Amount"
                keyboardType="numeric"
                value={value.cashAmount !== undefined ? String(value.cashAmount) : ''}
                onChangeText={(v) => onChange({ ...value, cashAmount: Number(v) || 0 })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Account Amount"
                keyboardType="numeric"
                value={value.accountAmount !== undefined ? String(value.accountAmount) : ''}
                onChangeText={(v) => onChange({ ...value, accountAmount: Number(v) || 0 })}
              />
            </View>
          </View>
          {Math.abs(splitDiff) > 0.01 && (
            <Text style={styles.warn}>
              {splitDiff > 0
                ? `Rs ${splitDiff.toLocaleString()} left to allocate`
                : `Rs ${Math.abs(splitDiff).toLocaleString()} over the total`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splitRow: { flexDirection: 'row', gap: 10 },
  warn: { fontSize: 12, color: colors.danger, marginTop: -8, marginBottom: 10 },
});
