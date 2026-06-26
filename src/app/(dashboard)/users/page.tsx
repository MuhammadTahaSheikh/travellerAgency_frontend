'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Mail, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { RootState } from '@/store';
import { User, ApiResponse } from '@/types';
import {
  canManageUsers,
  canChangeUserRole,
  canDeleteUser,
  canInviteUsers,
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

const emptyInviteForm = { firstName: '', lastName: '', email: '', phone: '', roleId: '' };
const emptyEditForm = { firstName: '', lastName: '', email: '', phone: '', roleId: '', isActive: true, newPassword: '' };

interface InviteResult {
  success: boolean;
  emailSent: boolean;
  message: string;
  setupUrl?: string;
}

export default function UsersPage() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'invite' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

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
    setInviteForm(emptyInviteForm);
    setEditForm(emptyEditForm);
    setEditingId(null);
    setMode(null);
  };

  const startInvite = () => {
    resetForm();
    setInviteResult(null);
    const defaultRole = roles.find((r) => r.name === 'USER');
    setInviteForm({ ...emptyInviteForm, roleId: defaultRole?.id || '' });
    setMode('invite');
  };

  const copySetupLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone || '',
      roleId: u.role.id,
      isActive: u.isActive,
      newPassword: '',
    });
    setMode('edit');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post<ApiResponse<User> & { emailSent?: boolean; setupUrl?: string; message?: string }>(
        '/users/invite',
        inviteForm,
      );
      setInviteResult({
        success: true,
        emailSent: Boolean(res.emailSent),
        message: res.message || (res.emailSent ? 'Invite email sent.' : 'User invited.'),
        setupUrl: res.setupUrl,
      });
      if (res.setupUrl) await copySetupLink(res.setupUrl);
      setMode(null);
      setInviteForm(emptyInviteForm);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
      };
      if (canChangeUserRole(currentUser)) {
        payload.roleId = editForm.roleId;
        payload.isActive = editForm.isActive;
      }
      await api.put(`/users/${editingId}`, payload);
      if (editForm.newPassword && isSuperAdmin(currentUser)) {
        await api.post(`/users/${editingId}/reset-password`, { newPassword: editForm.newPassword });
      }
      resetForm();
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (u: User) => {
    try {
      const res = await api.post<{ success: boolean; emailSent?: boolean; setupUrl?: string; message?: string }>(
        `/users/${u.id}/resend-invite`,
        {},
      );
      if (res.emailSent) {
        alert(res.message || 'Invite email resent.');
      } else if (res.setupUrl) {
        await navigator.clipboard.writeText(res.setupUrl);
        alert(`${res.message}\n\nSetup link copied to clipboard.`);
      } else {
        alert(res.message || 'Invite resent.');
      }
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (u: User) => {
    if (!await confirmDelete(`${u.firstName} ${u.lastName}`)) return;
    try {
      const res = await api.delete<{ success: boolean; message?: string }>(`/users/${u.id}`);
      loadData();
      if (res.message) alert(res.message);
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
      <PageHeader
        title="User Management"
        subtitle="Invite team members, assign roles, and manage access"
        action={canInviteUsers(currentUser) ? (
          <Button onClick={startInvite}><Plus className="w-4 h-4 mr-2" />Invite Member</Button>
        ) : undefined}
      />

      {inviteResult && (
        <Card className={`mb-6 border ${inviteResult.emailSent ? 'border-teal-200 bg-teal-50' : 'border-amber-200 bg-amber-50'}`}>
          <CardBody>
            <div className="flex gap-3">
              {inviteResult.emailSent ? (
                <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">
                  {inviteResult.emailSent ? 'Invite email sent' : 'User invited — email not sent'}
                </p>
                <p className="text-sm text-slate-600 mt-1">{inviteResult.message}</p>
                {!inviteResult.emailSent && inviteResult.setupUrl && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <code className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 break-all text-slate-700">
                      {inviteResult.setupUrl}
                    </code>
                    <Button type="button" variant="secondary" onClick={() => copySetupLink(inviteResult.setupUrl!)}>
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy link'}
                    </Button>
                  </div>
                )}
                {!inviteResult.emailSent && (
                  <p className="text-xs text-slate-500 mt-3">
                    To send emails automatically, add Gmail SMTP settings to the backend <code className="text-slate-700">.env</code> (SMTP_USER + SMTP_PASS app password).
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setInviteResult(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
          </CardBody>
        </Card>
      )}

      {mode === 'invite' && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-1">Invite team member</h3>
            <p className="text-sm text-slate-500 mb-4">They will receive an email to create their password and log in.</p>
            <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="First Name" value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} required />
              <Input label="Last Name" value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} required />
              <Input label="Email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
              <Input label="Phone (optional)" value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} />
              <Select
                label="Role"
                value={inviteForm.roleId}
                onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                options={roles.map((r) => ({ value: r.id, label: r.name.replace('_', ' ') }))}
                required
              />
              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <Button type="submit" loading={saving}>Send Invite</Button>
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {mode === 'edit' && editingId && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-bold text-slate-900 mb-4">Edit User</h3>
            <form onSubmit={handleEdit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="First Name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required />
              <Input label="Last Name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required />
              <Input label="Email" type="email" value={editForm.email} disabled />
              <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              {canChangeUserRole(currentUser) && (
                <>
                  <Select
                    label="Role"
                    value={editForm.roleId}
                    onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                    options={roles.map((r) => ({ value: r.id, label: r.name.replace('_', ' ') }))}
                    required
                  />
                  <Select
                    label="Status"
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                    options={[
                      { value: 'true', label: 'Active' },
                      { value: 'false', label: 'Inactive' },
                    ]}
                  />
                  <Input
                    label="New Password (optional)"
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
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
                          {u.invitePending ? (
                            <Badge status={u.inviteExpired ? 'OVERDUE' : 'PENDING'}>
                              {u.inviteExpired ? 'Invite expired' : 'Pending setup'}
                            </Badge>
                          ) : (
                            <Badge status={u.isActive ? 'CONFIRMED' : 'CANCELLED'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            {u.invitePending && canInviteUsers(currentUser) && (
                              <Button variant="secondary" onClick={() => handleResendInvite(u)} title="Resend invite">
                                <Mail className="w-4 h-4" />
                              </Button>
                            )}
                            <RowActions
                              onEdit={() => startEdit(u)}
                              onDelete={() => handleDelete(u)}
                              canEdit={canManageUsers(currentUser)}
                              canDelete={canDeleteUser(currentUser) && u.id !== currentUser?.id}
                            />
                          </div>
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
