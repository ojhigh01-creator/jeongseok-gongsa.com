import {
  MemberProfile,
  EstimateTicket,
  SupplyOrder,
  StoredEstimate,
} from '../types/membership';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

const LOCAL_MEMBER_KEY = 'jeongseok_current_member_v2';
const LOCAL_TICKETS_KEY = 'jeongseok_member_tickets_v2';
const LOCAL_ESTIMATES_KEY = 'jeongseok_saved_estimates_v2';
const LOCAL_ORDERS_KEY = 'jeongseok_supply_orders_v2';
const LOCAL_ALL_MEMBERS_KEY = 'jeongseok_all_members_v2';

/**
 * Get currently logged-in member or null
 */
export function getCurrentMember(): MemberProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_MEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save / Update current member in LocalStorage and Firestore
 */
export async function saveCurrentMember(member: MemberProfile): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_MEMBER_KEY, JSON.stringify(member));

    // Also update in all members list
    const allMembers = getAllLocalMembers();
    const existingIdx = allMembers.findIndex((m) => m.id === member.id);
    if (existingIdx >= 0) {
      allMembers[existingIdx] = member;
    } else {
      allMembers.push(member);
    }
    localStorage.setItem(LOCAL_ALL_MEMBERS_KEY, JSON.stringify(allMembers));
  }

  // Cloud sync to Firestore if possible
  try {
    const ref = doc(db, 'users', member.id);
    await setDoc(ref, member, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Member profile sync skipped/failed:', err);
  }
}

/**
 * Login or register member by phone number
 */
export async function loginOrRegisterMember(phone: string, name: string): Promise<MemberProfile> {
  const cleanPhone = phone.trim();
  const userId = `USR_${cleanPhone.replace(/[^0-9]/g, '')}`;

  // Check Firestore first
  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as MemberProfile;
      const updated: MemberProfile = {
        ...data,
        name: name.trim() || data.name,
        lastLoginAt: Date.now(),
      };
      await saveCurrentMember(updated);
      return updated;
    }
  } catch {
    // ignore
  }

  // Check local members
  const all = getAllLocalMembers();
  const found = all.find((m) => m.phone === cleanPhone || m.id === userId);
  if (found) {
    const updated: MemberProfile = {
      ...found,
      name: name.trim() || found.name,
      lastLoginAt: Date.now(),
    };
    await saveCurrentMember(updated);
    return updated;
  }

  // Create new profile
  const newMember: MemberProfile = {
    id: userId,
    phone: cleanPhone,
    name: name.trim() || '고객님',
    tier: 'regular',
    ticketBalance: 0,
    totalTicketsPurchased: 0,
    totalSavedEstimates: 0,
    totalOrdersCount: 0,
    joinedAt: Date.now(),
    lastLoginAt: Date.now(),
  };

  await saveCurrentMember(newMember);
  return newMember;
}

export function logoutCurrentMember(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_MEMBER_KEY);
  }
}

export function getAllLocalMembers(): MemberProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ALL_MEMBERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Ticket Management
// -------------------------------------------------------------

export function getMemberActiveTickets(userId: string): EstimateTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    if (!raw) return [];
    const all: EstimateTicket[] = JSON.parse(raw);
    return all.filter((t) => t.userId === userId && t.status === 'active');
  } catch {
    return [];
  }
}

export async function addTicket(ticket: EstimateTicket): Promise<void> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    const all: EstimateTicket[] = raw ? JSON.parse(raw) : [];
    all.unshift(ticket);
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(all));

    // Update member ticket balance & tier
    const member = getCurrentMember();
    if (member && (member.id === ticket.userId || member.phone === ticket.userPhone)) {
      member.tier = 'paid_member'; // Becomes paid member upon purchasing 1,000 KRW ticket
      member.ticketBalance = (member.ticketBalance || 0) + 1;
      member.totalTicketsPurchased = (member.totalTicketsPurchased || 0) + 1;
      await saveCurrentMember(member);
    }
  }

  // Cloud Firestore sync
  try {
    const ref = doc(db, 'tickets', ticket.ticketId);
    await setDoc(ref, ticket, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Ticket sync skipped/failed:', err);
  }
}

export async function markTicketUsed(ticketId: string, usageInfo: { category?: string; pyeong?: number }): Promise<void> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    if (raw) {
      const all: EstimateTicket[] = JSON.parse(raw);
      const target = all.find((t) => t.ticketId === ticketId);
      if (target) {
        target.status = 'used';
        target.usedAt = Date.now();
        if (usageInfo.category) target.usedCategory = usageInfo.category;
        if (usageInfo.pyeong) target.usedPyeong = usageInfo.pyeong;
        localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(all));
      }
    }

    // Decrement member balance
    const member = getCurrentMember();
    if (member && member.ticketBalance > 0) {
      member.ticketBalance = Math.max(0, member.ticketBalance - 1);
      await saveCurrentMember(member);
    }
  }

  try {
    const ref = doc(db, 'tickets', ticketId);
    await updateDoc(ref, {
      status: 'used',
      usedAt: Date.now(),
      ...usageInfo,
    });
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// Saved Estimates Management (견적서 보관함)
// -------------------------------------------------------------

export function getSavedEstimates(userId?: string): StoredEstimate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ESTIMATES_KEY);
    if (!raw) return [];
    const all: StoredEstimate[] = JSON.parse(raw);
    if (userId) {
      return all.filter((e) => e.userId === userId);
    }
    return all;
  } catch {
    return [];
  }
}

export async function saveEstimate(estimate: StoredEstimate): Promise<void> {
  if (typeof window !== 'undefined') {
    const all = getSavedEstimates();
    all.unshift(estimate);
    localStorage.setItem(LOCAL_ESTIMATES_KEY, JSON.stringify(all));

    const member = getCurrentMember();
    if (member && member.id === estimate.userId) {
      member.totalSavedEstimates = (member.totalSavedEstimates || 0) + 1;
      await saveCurrentMember(member);
    }
  }

  try {
    const ref = doc(db, 'user_estimates', estimate.id);
    await setDoc(ref, estimate, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Estimate save skipped/failed:', err);
  }
}

// -------------------------------------------------------------
// Living Care Supplies Orders Management (생활관리용품 주문)
// -------------------------------------------------------------

export function getMemberOrders(userId?: string): SupplyOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const all: SupplyOrder[] = JSON.parse(raw);
    if (userId) {
      return all.filter((o) => o.userId === userId);
    }
    return all;
  } catch {
    return [];
  }
}

export async function saveSupplyOrder(order: SupplyOrder): Promise<void> {
  if (typeof window !== 'undefined') {
    const all = getMemberOrders();
    all.unshift(order);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(all));

    const member = getCurrentMember();
    if (member && member.id === order.userId) {
      member.totalOrdersCount = (member.totalOrdersCount || 0) + 1;
      await saveCurrentMember(member);
    }
  }

  try {
    const ref = doc(db, 'supply_orders', order.orderId);
    await setDoc(ref, order, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Supply order save skipped/failed:', err);
  }
}
