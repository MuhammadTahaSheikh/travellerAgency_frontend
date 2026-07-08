import { User } from '@/types';

type Resource =
  | 'customers'
  | 'packages'
  | 'bookings'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'users';

const USER_RESOURCES: Resource[] = ['customers', 'bookings'];

export function getUserRole(user: User | null): 'SUPER_ADMIN' | 'ADMIN' | 'USER' | null {
  const role = user?.role as User['role'] | string | undefined;
  if (!role) return null;
  if (typeof role === 'string') {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'USER') return role;
    return null;
  }
  return role.name ?? null;
}

export function isSuperAdmin(user: User | null): boolean {
  return getUserRole(user) === 'SUPER_ADMIN';
}

export function isAdminOrAbove(user: User | null): boolean {
  const role = getUserRole(user);
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function canEditResource(user: User | null, resource: Resource): boolean {
  if (!user) return false;
  if (isAdminOrAbove(user)) return true;
  return USER_RESOURCES.includes(resource);
}

export function canDeleteResource(user: User | null, resource: Resource): boolean {
  if (!user) return false;
  if (resource === 'payments' || resource === 'users') return isSuperAdmin(user);
  if (isSuperAdmin(user)) return true;
  if (getUserRole(user) === 'ADMIN') return true;
  return USER_RESOURCES.includes(resource);
}

export function canCreateResource(user: User | null, resource: Resource): boolean {
  return canEditResource(user, resource);
}

export function canManageUsers(user: User | null): boolean {
  return isAdminOrAbove(user);
}

export function canInviteUsers(user: User | null): boolean {
  return isSuperAdmin(user);
}

export function canChangeUserRole(user: User | null): boolean {
  return isSuperAdmin(user);
}

export function canModifyBooking(user: User | null, bookingStatus: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (getUserRole(user) === 'ADMIN') return true;
  return bookingStatus !== 'CONFIRMED' && bookingStatus !== 'REQUEST_CONFIRMATION';
}

export function canEditBookingVendorCost(user: User | null, bookingStatus: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user) || getUserRole(user) === 'ADMIN') return true;
  return bookingStatus === 'CONFIRMED';
}

export function canEditBookingPricing(user: User | null, bookingStatus: string): boolean {
  return canModifyBooking(user, bookingStatus) || canEditBookingVendorCost(user, bookingStatus);
}

export function canDirectConfirmBooking(user: User | null): boolean {
  return isSuperAdmin(user);
}

export function canDirectPostVendor(user: User | null): boolean {
  return isSuperAdmin(user);
}

export function canDeleteUser(user: User | null): boolean {
  return isSuperAdmin(user);
}
