import React from 'react';
import AdminShell from '@/components/AdminShell';
import ApperIcon from '@/components/ApperIcon';

const definitions = {
  '/admin/players': ['Players', 'Accounts and access are managed by the Apper identity provider.', 'Users', 'Player analytics need a verified backend.'],
  '/admin/rewards': ['Rewards & lives', 'Three-life refill and XP grants require authoritative server checks.', 'Heart', 'Do not credit virtual rewards from browser scripts.'],
  '/admin/analytics': ['Analytics', 'Track real player retention after event collection is connected.', 'ChartNoAxesCombined', 'No fabricated activity or revenue measurements.'],
  '/admin/support': ['Support', 'Manage real support tickets when the service and profiles are connected.', 'Headset', 'Support inbox is not yet active.'],
  '/admin/settings': ['Settings', 'Manage release flags and secure configuration in the backend.', 'Settings', 'Production AdMob and secrets are not configured.'],
};
export function PlaceholderAdmin({ path }) {
  const [title, subtitle, icon, note] = definitions[path];
  return (
    <AdminShell title={title} subtitle={subtitle}>
      <section className="rounded-3xl border border-border bg-card p-10">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary">
          <ApperIcon name={icon} size={33} />
        </span>
        <h2 className="mt-6 font-heading text-2xl font-black">Module foundation</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{note}</p>
      </section>
    </AdminShell>
  );
}
