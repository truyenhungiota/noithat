import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, auth } from './firebase';
import { UserAccount, Order, Customer, Supplier, ShippingUnit, Product, Category, CompanySettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirestoreStore() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shippingUnits, setShippingUnits] = useState<ShippingUnit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSettings, setAllSettings] = useState<Record<string, CompanySettings>>({});
  
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setAuthUser(user);
      setIsAuthenticated(!!user);
      setAuthInitialized(true);
      if (!user) {
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);

    const unsubscribers: (() => void)[] = [];

    const subscribeToCollection = <T extends { id: string }>(
      path: string, 
      setter: Dispatch<SetStateAction<T[]>>
    ) => {
      const q = query(collection(db, path));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
        setter(data);
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch(e) {}
      });
      unsubscribers.push(unsub);
    };

    subscribeToCollection<UserAccount>('users', setUsers);
    subscribeToCollection<Order>('orders', setOrders);
    subscribeToCollection<Customer>('customers', setCustomers);
    subscribeToCollection<Supplier>('suppliers', setSuppliers);
    subscribeToCollection<ShippingUnit>('shippingUnits', setShippingUnits);
    subscribeToCollection<Product>('products', setProducts);
    subscribeToCollection<Category>('categories', setCategories);

    const qSettings = query(collection(db, 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      const settingsMap: Record<string, CompanySettings> = {};
      snapshot.docs.forEach(doc => {
        settingsMap[doc.id] = doc.data() as CompanySettings;
      });
      setAllSettings(settingsMap);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'settings');
      } catch(e) {}
    });
    unsubscribers.push(unsubSettings);

    // After a brief timeout, consider loading complete to render UI.
    // In a real app we'd wait for all initial fetches to complete.
    setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isAuthenticated]);

  return {
    users, setUsers,
    orders, setOrders,
    customers, setCustomers,
    suppliers, setSuppliers,
    shippingUnits, setShippingUnits,
    products, setProducts,
    categories, setCategories,
    allSettings, setAllSettings,
    loading,
    isAuthenticated,
    authUser,
    authInitialized
  };
}

export const firestoreMutations = {
  saveItem: async (collectionName: string, item: any) => {
    try {
      if (!auth.currentUser) {
        throw new Error("Chưa đăng nhập Firebase Auth. Vui lòng đăng nhập để lưu dữ liệu.");
      }
      const id = item.id || `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Deep clean up undefined properties to prevent setDoc from crashing
      const removeUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(removeUndefined);
        } else if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
              newObj[key] = removeUndefined(obj[key]);
            }
          });
          return newObj;
        }
        return obj;
      };
      
      const cleanItem = removeUndefined(item);
      const now = new Date().toISOString();
      const itemToSave = { 
        ...cleanItem, 
        id,
        createdAt: cleanItem.createdAt || now,
        updatedAt: now
      };
      await setDoc(doc(db, collectionName, id), itemToSave);
      return itemToSave;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  },
  deleteItem: async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  }
};
