import { db } from '../../config/db.js';
import { inventoryItems, inventoryCheckouts, users, eq, isNull, desc } from '@school/shared';

export class InventoryService {
  static async getItems() {
    return await db
      .select()
      .from(inventoryItems)
      .where(isNull(inventoryItems.deletedAt))
      .orderBy(inventoryItems.name);
  }

  static async createItem(data: {
    name: string;
    category: string;
    description?: string;
    totalQuantity: number;
  }) {
    const [created] = await db
      .insert(inventoryItems)
      .values({
        name: data.name,
        category: data.category,
        description: data.description,
        totalQuantity: data.totalQuantity,
        availableQuantity: data.totalQuantity,
      })
      .returning();

    return created;
  }

  static async getCheckouts() {
    const list = await db
      .select({
        checkout: inventoryCheckouts,
        item: inventoryItems,
        checkedOutBy: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(inventoryCheckouts)
      .innerJoin(inventoryItems, eq(inventoryCheckouts.itemId, inventoryItems.id))
      .innerJoin(users, eq(inventoryCheckouts.checkedOutById, users.id))
      .where(isNull(inventoryCheckouts.deletedAt))
      .orderBy(desc(inventoryCheckouts.createdAt));

    const todayStr = new Date().toISOString().split('T')[0];

    // Check overdue status
    return list.map((r) => {
      const isOverdue =
        r.checkout.status === 'CHECKED_OUT' &&
        r.checkout.expectedReturnDate &&
        r.checkout.expectedReturnDate < todayStr;

      return {
        ...r,
        checkout: {
          ...r.checkout,
          status: isOverdue ? 'OVERDUE' : r.checkout.status,
        },
      };
    });
  }

  static async checkoutItem(data: {
    itemId: string;
    checkedOutTo: string;
    quantity: number;
    checkoutDate: string;
    expectedReturnDate?: string;
    notes?: string;
  }, checkedOutById: string) {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, data.itemId));
    if (!item) throw new Error('Inventory item not found');
    if (item.availableQuantity < data.quantity) {
      throw new Error(`Insufficient available quantity. Only ${item.availableQuantity} items available.`);
    }

    // 1. Create checkout record
    const [checkout] = await db
      .insert(inventoryCheckouts)
      .values({
        itemId: data.itemId,
        checkedOutTo: data.checkedOutTo,
        quantity: data.quantity,
        checkoutDate: data.checkoutDate || new Date().toISOString().split('T')[0],
        expectedReturnDate: data.expectedReturnDate,
        status: 'CHECKED_OUT',
        notes: data.notes,
        checkedOutById,
      })
      .returning();

    // 2. Decrement available quantity
    await db
      .update(inventoryItems)
      .set({
        availableQuantity: item.availableQuantity - data.quantity,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, data.itemId));

    return checkout;
  }

  static async returnItem(checkoutId: string) {
    const [checkout] = await db
      .select()
      .from(inventoryCheckouts)
      .where(eq(inventoryCheckouts.id, checkoutId));

    if (!checkout) throw new Error('Checkout record not found');
    if (checkout.status === 'RETURNED') throw new Error('Item is already returned');

    // 1. Update checkout record to RETURNED
    const [updatedCheckout] = await db
      .update(inventoryCheckouts)
      .set({
        status: 'RETURNED',
        actualReturnDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(eq(inventoryCheckouts.id, checkoutId))
      .returning();

    // 2. Increment item available quantity
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, checkout.itemId));
    if (item) {
      await db
        .update(inventoryItems)
        .set({
          availableQuantity: Math.min(item.totalQuantity, item.availableQuantity + checkout.quantity),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, checkout.itemId));
    }

    return updatedCheckout;
  }
}
