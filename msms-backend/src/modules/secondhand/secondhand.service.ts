import { prisma } from '../../config/db';
import { Server } from 'socket.io';
import { EVENTS } from '../../socket/events';

interface CreateSecondhandInput {
  mobileName:    string;
  brand:         string;
  imei?:         string;
  sellerName:    string;
  sellerCnic:    string;
  sellerPhone:   string;
  purchasePrice: number;
  notes?:        string;
  sellerPhotoUrl?: string;
  cnicPhotoUrl?:   string;
}

export async function getSecondhandRecords(isSold?: boolean) {
  return prisma.secondhandRecord.findMany({
    where: isSold !== undefined ? { isSold } : {},
    include: {
      product: {
        select: { name: true, stock: true, salePrice: true, isDeleted: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSecondhandById(id: string) {
  const record = await prisma.secondhandRecord.findUnique({
    where: { id },
    include: {
      product: true,
      sales: {
        select: {
          invoiceNo: true, totalAmount: true,
          createdAt: true, customerName: true,
        },
      },
    },
  });
  if (!record) throw new Error('Secondhand record not found');
  return record;
}

export async function createSecondhandRecord(
  data: CreateSecondhandInput,
  io: Server
) {
  // Validate IMEI uniqueness if provided
  if (data.imei) {
    const existing = await prisma.secondhandRecord.findFirst({
      where: { imei: data.imei },
    });
    if (existing) throw new Error('A secondhand record with this IMEI already exists');
  }

  // Use a transaction: create a Product entry AND a SecondhandRecord together
  // This way the phone appears in inventory AND has full seller KYC attached
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create a Product for inventory tracking
    const product = await tx.product.create({
      data: {
        name:          data.mobileName,
        brand:         data.brand,
        category:      'phone',
        condition:     'used',
        imei:          data.imei ?? null,
        purchasePrice: data.purchasePrice,
        salePrice:     data.purchasePrice, // owner sets sale price later
        stock:         1,                  // one unit by definition
        isSecondhand:  true,
      },
    });

    // 2. Create the SecondhandRecord with seller KYC
    const record = await tx.secondhandRecord.create({
      data: {
        productId:     product.id,
        mobileName:    data.mobileName,
        brand:         data.brand,
        imei:          data.imei ?? null,
        sellerName:    data.sellerName,
        sellerCnic:    data.sellerCnic,
        sellerPhone:   data.sellerPhone,
        purchasePrice: data.purchasePrice,
        notes:         data.notes ?? null,
        sellerPhotoUrl: data.sellerPhotoUrl ?? null,
        cnicPhotoUrl:   data.cnicPhotoUrl   ?? null,
        isSold:        false,
      },
    });

    return { product, record };
  });

  io.to('shop:main').emit(EVENTS.SECONDHAND_CREATED, {
    id:         result.record.id,
    mobileName: data.mobileName,
    brand:      data.brand,
  });
  io.to('shop:main').emit(EVENTS.INVENTORY_UPDATED, {
    productId: result.product.id,
    stock:     1,
  });
  io.to('shop:main').emit(EVENTS.DASHBOARD_REFRESH, {});

  return result.record;
}

export async function updateSecondhandRecord(
  id: string,
  data: { notes?: string; salePrice?: number }
) {
  const record = await prisma.secondhandRecord.findUnique({ where: { id } });
  if (!record) throw new Error('Record not found');

  // Allow updating notes and the sale price on the linked product
  const updates: any = {};
  if (data.notes !== undefined) updates.notes = data.notes;

  const record_updated = await prisma.secondhandRecord.update({
    where: { id },
    data:  updates,
  });

  // If sale price is being updated, update the linked product too
  if (data.salePrice !== undefined) {
    await prisma.product.update({
      where: { id: record.productId },
      data:  { salePrice: data.salePrice },
    });
  }

  return record_updated;
}