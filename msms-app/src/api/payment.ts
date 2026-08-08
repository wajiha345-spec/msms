// Cash/Account ledger wiring — shared shape reused by every money-moving
// action (Sale, Purchase, SecondhandRecord, Purchase Order receipt, Sales
// Order delivery, Quotation conversion, installment/credit settlement).
export type PaymentMethod = 'CASH' | 'ACCOUNT' | 'SPLIT';

export interface PaymentFields {
  paymentMethod?: PaymentMethod;
  cashAmount?:    number;
  accountId?:     string;
  accountAmount?: number;
}
