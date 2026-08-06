import { prisma } from '../../config/db';

// ── CRM ──────────────────────────────────────────────────────────────────────
// Customer is a new master profile layered on top of the customerName/
// customerPhone free-text fields Sale/Quotation/SalesOrder already carry.
// Those models are never touched — a Customer's activity (sales, quotations,
// orders, outstanding balance) is matched by phone number at read time in
// getCustomerProfile, the same "group by phone" approach
// customerLedger.service.ts already established.

const INTERACTION_TYPES = ['NOTE', 'CALL', 'VISIT', 'FOLLOW_UP'] as const;
type InteractionType = (typeof INTERACTION_TYPES)[number];

const STATUSES = ['lead', 'active', 'vip', 'inactive'] as const;
type CustomerStatus = (typeof STATUSES)[number];

interface ListCustomersFilter {
  search?: string;
  status?: string;
  tag?:    string;
}

export async function listCustomers(shopId: string, filter: ListCustomersFilter) {
  const where: any = { shopId };
  if (filter.status) where.status = filter.status;
  if (filter.tag)    where.tags = { has: filter.tag };
  if (filter.search) {
    const q = filter.search.trim();
    where.OR = [
      { name:  { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ];
  }
  return prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });
}

interface CreateCustomerInput {
  name:    string;
  phone:   string;
  email?:  string;
  cnic?:   string;
  address?: string;
  tags?:   string[];
  status?: string;
  source?: string;
  notes?:  string;
}

function validateStatus(status?: string) {
  if (status && !STATUSES.includes(status as CustomerStatus)) {
    throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
  }
}

export async function createCustomer(shopId: string, data: CreateCustomerInput) {
  if (!data.name?.trim())  throw new Error('name is required');
  if (!data.phone?.trim()) throw new Error('phone is required');
  validateStatus(data.status);

  const existing = await prisma.customer.findUnique({
    where: { shopId_phone: { shopId, phone: data.phone.trim() } },
  });
  if (existing) throw new Error('A customer with this phone number already exists');

  return prisma.customer.create({
    data: {
      shopId,
      name:    data.name.trim(),
      phone:   data.phone.trim(),
      email:   data.email?.trim() || null,
      cnic:    data.cnic?.trim() || null,
      address: data.address?.trim() || null,
      tags:    data.tags ?? [],
      status:  data.status ?? 'lead',
      source:  data.source?.trim() || null,
      notes:   data.notes?.trim() || null,
    },
  });
}

interface UpdateCustomerInput {
  name?:    string;
  email?:   string;
  cnic?:    string;
  address?: string;
  tags?:    string[];
  status?:  string;
  source?:  string;
  notes?:   string;
}

export async function updateCustomer(shopId: string, id: string, data: UpdateCustomerInput) {
  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new Error('Customer not found');
  validateStatus(data.status);

  return prisma.customer.update({
    where: { id },
    data: {
      name:    data.name?.trim(),
      email:   data.email !== undefined ? (data.email.trim() || null) : undefined,
      cnic:    data.cnic !== undefined ? (data.cnic.trim() || null) : undefined,
      address: data.address !== undefined ? (data.address.trim() || null) : undefined,
      tags:    data.tags,
      status:  data.status,
      source:  data.source !== undefined ? (data.source.trim() || null) : undefined,
      notes:   data.notes !== undefined ? (data.notes.trim() || null) : undefined,
    },
  });
}

export async function deleteCustomer(shopId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new Error('Customer not found');
  await prisma.customerInteraction.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });
}

export async function getCustomerProfile(shopId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!customer) throw new Error('Customer not found');

  const interactions = await prisma.customerInteraction.findMany({
    where: { customerId: id },
    include: { createdBy: { select: { username: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Read-only aggregation against the EXISTING Sale/Quotation/SalesOrder
  // data, matched by phone — no schema change to any of those models.
  const [sales, quotations, salesOrders] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, customerPhone: customer.phone },
      select: { id: true, totalAmount: true, paymentType: true, createdAt: true },
    }),
    prisma.quotation.count({ where: { shopId, customerPhone: customer.phone } }),
    prisma.salesOrder.count({ where: { shopId, customerPhone: customer.phone } }),
  ]);

  const saleIds = sales.map((s) => s.id);
  const payments = await prisma.salePayment.findMany({
    where: { saleId: { in: saleIds } },
    select: { saleId: true, amount: true },
  });
  const paidBySale = new Map<string, number>();
  for (const p of payments) {
    paidBySale.set(p.saleId, (paidBySale.get(p.saleId) ?? 0) + p.amount);
  }

  const totalSpent  = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const outstanding = sales
    .filter((s) => s.paymentType === 'INSTALLMENT')
    .reduce((sum, s) => sum + (s.totalAmount - (paidBySale.get(s.id) ?? 0)), 0);
  const lastPurchaseAt = sales.length
    ? sales.reduce((latest, s) => (s.createdAt > latest ? s.createdAt : latest), sales[0].createdAt)
    : null;

  return {
    customer,
    interactions,
    stats: {
      salesCount:    sales.length,
      totalSpent,
      outstanding:   Math.max(outstanding, 0),
      quotationsCount:  quotations,
      salesOrdersCount: salesOrders,
      lastPurchaseAt,
    },
  };
}

interface AddInteractionInput {
  type:         string;
  text:         string;
  followUpDate?: string | Date;
  userId:       string;
}

export async function addInteraction(shopId: string, customerId: string, data: AddInteractionInput) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, shopId } });
  if (!customer) throw new Error('Customer not found');
  if (!INTERACTION_TYPES.includes(data.type as InteractionType)) {
    throw new Error(`type must be one of: ${INTERACTION_TYPES.join(', ')}`);
  }
  if (!data.text?.trim()) throw new Error('text is required');
  if (data.type === 'FOLLOW_UP' && !data.followUpDate) {
    throw new Error('followUpDate is required for a follow-up');
  }

  return prisma.customerInteraction.create({
    data: {
      shopId,
      customerId,
      type:         data.type,
      text:         data.text.trim(),
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      createdById:  data.userId,
    },
  });
}

interface UpdateInteractionInput {
  text?:      string;
  completed?: boolean;
}

export async function updateInteraction(shopId: string, id: string, data: UpdateInteractionInput) {
  const interaction = await prisma.customerInteraction.findFirst({ where: { id, shopId } });
  if (!interaction) throw new Error('Interaction not found');

  return prisma.customerInteraction.update({
    where: { id },
    data: {
      text:      data.text?.trim(),
      completed: data.completed,
    },
  });
}

export async function deleteInteraction(shopId: string, id: string) {
  const interaction = await prisma.customerInteraction.findFirst({ where: { id, shopId } });
  if (!interaction) throw new Error('Interaction not found');
  await prisma.customerInteraction.delete({ where: { id } });
}

export async function listUpcomingFollowUps(shopId: string) {
  return prisma.customerInteraction.findMany({
    where: { shopId, type: 'FOLLOW_UP', completed: false },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { followUpDate: 'asc' },
  });
}
