import { PlayerCard } from 'spartan';

const noop = () => {};
const base = {
  id: 'p1',
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  phone: '(555) 123-4567',
  jerseyNumber: null,
  carNumber: 13,
  racingClass: 'Formula LGB4',
  emergencyContact: null,
  emergencyPhone: null,
  fmsciLicenseNumber: null,
};

export const MemberView = () => (
  <div style={{ maxWidth: 340 }}>
    <PlayerCard player={base as any} isAdmin={false} teamId="t1" onEdit={noop} />
  </div>
);

export const AdminView = () => (
  <div style={{ maxWidth: 340 }}>
    <PlayerCard
      player={{ ...base, emergencyContact: 'Jordan Morgan', emergencyPhone: '(555) 987-6543', fmsciLicenseNumber: 'FMSCI-2029-4471' } as any}
      isAdmin
      teamId="t1"
      onEdit={noop}
    />
  </div>
);
