'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '@/lib/api';
import { RootState } from '@/store';
import { User, ApiResponse } from '@/types';
import {
  canManageUsers,
  canChangeUserRole,
  canDeleteUser,
  isSuperAdmin,
} from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, Badge, EmptyState } from '@/components/ui/Common';
import { RowActions, confirmDelete } from '@/components/ui/RowActions';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface Role {
  id: string;
  name: string;
  description?: string;
}

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', roleId: '', isActive: true, newPassword: '' };

export default function UsersPage() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<User[]>>('/users'),
      api.get<ApiResponse<Role[]>>('/users/roles'),
    ])
      .then(([usersRes, rolesRes]) => {
        setUsers(usersRes.data || []);
        setRoles(rolesRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone || '',
      roleId: u.role.id,
      isActive: u.isActive,
      newPassword: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      };
      if (canChangeUserRole(currentUser)) {
        payload.roleId = form.roleId;
        payload.isActive = form.isActive;
      }
      await api.put(`/users/${editingId}`, payload);
      if (form.newPassword && isSuperAdmin(currentUser)) {
        await api.post(`/users/${editingId}/reset-password`, { newPassword: form.newPassword });
      }
      resetForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!await confirmDelete(`${u.firstName} ${u.lastName}`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (!canManageUsers(currentUser)) {
    return (
      <div>
        <PageHeader title="User Management" subtitle="Manage system users, roles, and permissions" />
        <EmptyState message="You do not have permission to manage users." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage system users, roles, and permissions" />

      {showForm && editingId && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">Edit User</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} disabled />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {canChangeUserRole(currentUser) && (
                <>
                  <Select
                    label="Role"
                    value={form.roleId}
                    onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                    options={roles.map((r) => ({ value: r.id, label: r.name.replace('_', ' ') }))}
                    required
                  />
                  <Select
                    label="Status"
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    options={[
                      { value: 'true', label: 'Active' },
                      { value: 'false', label: 'Inactive' },
                    ]}
                  />
                  <Input
                    label="New Password (optional)"
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current"
                  />
                </>
              )}
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Update User</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? <LoadingSpinner label="Loading users..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {users.length === 0 ? (
              <EmptyState message="No users found." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Email</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Phone</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{u.firstName} {u.lastName}</p>
                            <p className="sm:hidden text-xs text-slate-500 mt-0.5">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{u.email}</TableCell>
                        <TableCell className="hidden md:table-cell">{u.phone || '—'}</TableCell>
                        <TableCell className="capitalize">{u.role.name.replace('_', ' ').toLowerCase()}</TableCell>
                        <TableCell>
                          <Badge status={u.isActive ? 'CONFIRMED' : 'CANCELLED'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                        </TableCell>
                        <TableCell align="right">
                          <RowActions
                            onEdit={() => startEdit(u)}
                            onDelete={() => handleDelete(u)}
                            canEdit={canManageUsers(currentUser)}
                            canDelete={canDeleteUser(currentUser) && u.id !== currentUser?.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
