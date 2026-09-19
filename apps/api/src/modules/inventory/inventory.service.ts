import { db } from '../../config/db.js';
import { inventoryItems, inventoryCheckouts, users, eq, isNull, desc, and, or, ilike, count } from '@school/shared';

export class InventoryService {
  static async getItems(options?: { search?: string; limit?: number; offset?: number; all?: boolean }) {
    const { search, limit, offset = 0, all = false } = options || {};

    const trimmedSearch = search?.trim();
    const searchFilter = trimmedSearch
      ? or(
          ilike(inventoryItems.name, `%${trimmedSearch}%`),
          ilike(inventoryItems.category, `%${trimmedSearch}%`),
          ilike(inventoryItems.description, `%${trimmedSearch}%`)
        )
      : undefined;

    const whereClause = searchFilter
      ? and(isNull(inventoryItems.deletedAt), searchFilter)
      : isNull(inventoryItems.deletedAt);

    // 1. Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    // 2. Query items
    let query = db
      .select()
      .from(inventoryItems)
      .where(whereClause)
      .orderBy(inventoryItems.name);

    if (!all && limit !== undefined && limit > 0) {
      query = (query as any).limit(limit).offset(offset);
    }

    const items = await query;

    return {
      items,
      pagination: {
        total,
        limit: all ? total : (limit ?? total),
        offset,
        hasMore: offset + items.length < total,
      },
    };
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

  static async updateItem(id: string, data: {
    name?: string;
    category?: string;
    description?: string;
    totalQuantity?: number;
  }) {
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt)));

    if (!item) {
      throw new Error('Inventory item not found');
    }

    const currentCheckedOut = Math.max(0, item.totalQuantity - item.availableQuantity);
    let newTotalQuantity = item.totalQuantity;
    let newAvailableQuantity = item.availableQuantity;

    if (data.totalQuantity !== undefined) {
      if (data.totalQuantity < currentCheckedOut) {
        throw new Error(
          `Cannot reduce total quantity to ${data.totalQuantity}. There are currently ${currentCheckedOut} units checked out.`
        );
      }
      newTotalQuantity = data.totalQuantity;
      newAvailableQuantity = newTotalQuantity - currentCheckedOut;
    }

    const [updated] = await db
      .update(inventoryItems)
      .set({
        name: data.name ?? item.name,
        category: data.category ?? item.category,
        description: data.description !== undefined ? data.description : item.description,
        totalQuantity: newTotalQuantity,
        availableQuantity: newAvailableQuantity,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id))
      .returning();

    return updated;
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
