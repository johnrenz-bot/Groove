'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FormError } from '@/components/ui/FormError';

export interface CreateUserData {
  email: string;
  password: string;
  role: 'client' | 'coach';
  firstname: string;
  middlename?: string;
  lastname: string;
  username?: string;
  contact?: string;
  talent?: string;
  talents?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (user: unknown) => void;
}

const initialForm: CreateUserData = {
  email: '',
  password: '',
  role: 'client',
  firstname: '',
  middlename: '',
  lastname: '',
  username: '',
  contact: '',
  talent: '',
  talents: '',
};

export function AdminCreateUserModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateUserData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const update = (key: keyof CreateUserData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email.trim() || !form.password || !form.firstname.trim() || !form.lastname.trim()) {
      setError('Email, password, first name, and last name are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.role === 'client' && !form.talent?.trim()) {
      // talent is optional but default to a sensible value
    }

    setSaving(true);
    try {
      const { createAdminUser } = await import('@/lib/admin/service');
      const created = await createAdminUser({
        ...form,
        email: form.email.trim(),
        firstname: form.firstname.trim(),
        lastname: form.lastname.trim(),
        middlename: form.middlename?.trim() || undefined,
        username: form.username?.trim() || undefined,
        contact: form.contact?.trim() || undefined,
        talent: form.role === 'client' ? form.talent?.trim() || 'N/A' : undefined,
        talents: form.role === 'coach' ? form.talents?.trim() || 'Dance' : undefined,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Create new account" description="Add a client or coach account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Role" value={form.role} onChange={(e) => update('role', e.target.value)}>
            <option value="client">Client / Performer</option>
            <option value="coach">Coach / Choreographer</option>
          </Select>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            required
          />
          <Input
            label="Username"
            value={form.username ?? ''}
            onChange={(e) => update('username', e.target.value)}
            hint="Defaults to the email prefix if left blank."
          />
          <Input
            label="First name"
            value={form.firstname}
            onChange={(e) => update('firstname', e.target.value)}
            required
          />
          <Input
            label="Middle name"
            value={form.middlename ?? ''}
            onChange={(e) => update('middlename', e.target.value)}
          />
          <Input
            label="Last name"
            value={form.lastname}
            onChange={(e) => update('lastname', e.target.value)}
            required
          />
          <Input
            label="Contact number"
            value={form.contact ?? ''}
            onChange={(e) => update('contact', e.target.value)}
          />
          {form.role === 'client' && (
            <Input
              label="Primary talent"
              value={form.talent ?? ''}
              onChange={(e) => update('talent', e.target.value)}
              hint="Defaults to N/A."
            />
          )}
          {form.role === 'coach' && (
            <Input
              label="Discipline / talents"
              value={form.talents ?? ''}
              onChange={(e) => update('talents', e.target.value)}
              hint="Defaults to Dance."
            />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-divider pt-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            Create account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
