import { Order } from '../types';

/**
 * Helper to parse any timestamp from an entity.
 * Checks createdAt, updatedAt, orderDate, or timestamps encoded in IDs.
 */
export const getItemTimestamp = (item: any): number => {
  if (!item) return 0;

  // 1. Explicit createdAt
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 2. Explicit orderDate (for orders)
  if (item.orderDate) {
    const t = new Date(item.orderDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 3. Explicit updatedAt
  if (item.updatedAt) {
    const t = new Date(item.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 4. Timestamp inside ID (e.g. CUST172675..., SUP172675..., PROD172675..., doc_172675...)
  if (typeof item.id === 'string') {
    const match = item.id.match(/\d{10,14}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      if (ts > 1500000000000 && ts < 2500000000000) return ts;
      if (ts > 1500000000 && ts < 2500000000) return ts * 1000;
    }
  }

  return 0;
};

/**
 * Sorts any list so that the newest items appear first.
 */
export const compareNewestFirst = <T extends { id?: string }>(a: T, b: T): number => {
  const timeA = getItemTimestamp(a);
  const timeB = getItemTimestamp(b);

  if (timeB !== timeA) {
    return timeB - timeA;
  }

  const idA = String(a?.id || '');
  const idB = String(b?.id || '');
  return idB.localeCompare(idA, undefined, { numeric: true });
};

/**
 * Compare orders newest first.
 * Prioritizes createdAt (exact time), then orderDate, then ID.
 */
export const compareOrdersNewest = (a: Order, b: Order): number => {
  // If either has exact createdAt, prefer that
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.orderDate ? new Date(a.orderDate).getTime() : getItemTimestamp(a));
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.orderDate ? new Date(b.orderDate).getTime() : getItemTimestamp(b));

  if (timeB !== timeA) {
    return timeB - timeA;
  }

  const idA = String(a.id || '');
  const idB = String(b.id || '');
  return idB.localeCompare(idA, undefined, { numeric: true });
};

/**
 * Gets the deposit timestamp for an order.
 * Prioritizes depositPaymentDate (Thời gian khách cọc), 
 * then orderDate (Ngày đặt hàng), then createdAt, then fallback.
 */
export const getOrderDepositTimestamp = (order: Order): number => {
  if (!order) return 0;

  // 1. Explicit depositPaymentDate
  if (order.depositPaymentDate) {
    const t = new Date(order.depositPaymentDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 2. Explicit orderDate
  if (order.orderDate) {
    const t = new Date(order.orderDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 3. Explicit createdAt
  if (order.createdAt) {
    const t = new Date(order.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  return getItemTimestamp(order);
};

/**
 * Compare orders by deposit date in ASCENDING order:
 * Oldest deposit date first (lâu nhất lên trên cùng),
 * Newest deposit date last (mới thì để sau cùng).
 */
export const compareOrdersDepositOldestFirst = (a: Order, b: Order): number => {
  const timeA = getOrderDepositTimestamp(a);
  const timeB = getOrderDepositTimestamp(b);

  if (timeA !== timeB) {
    if (timeA === 0) return 1;
    if (timeB === 0) return -1;
    return timeA - timeB; // Ascending: oldest first
  }

  const idA = String(a.id || '');
  const idB = String(b.id || '');
  return idA.localeCompare(idB, undefined, { numeric: true });
};

/**
 * Computes the recency of an entity (Customer, Supplier, ShippingUnit)
 * taking the newest of its creation date or its most recent order date.
 */
export const getEntityLatestActivityTime = (
  entity: any, 
  entityOrders: Order[]
): number => {
  const entityCreatedTime = getItemTimestamp(entity);

  let latestOrderTime = 0;
  if (entityOrders && entityOrders.length > 0) {
    for (const o of entityOrders) {
      const oTime = compareOrdersNewest ? getItemTimestamp(o) : 0;
      if (oTime > latestOrderTime) {
        latestOrderTime = oTime;
      }
    }
  }

  return Math.max(entityCreatedTime, latestOrderTime);
};
