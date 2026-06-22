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

export function getUserRole(user: User | null): User['role']['name'] | null {
  return user?.role?.name ?? null;
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

export function canChangeUserRole(user: User | null): boolean {
  return isSuperAdmin(user);
}

export function canDeleteUser(user: User | null): boolean {
  return isSuperAdmin(user);
}
