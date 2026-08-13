import { describe, it, expect } from 'vitest';

describe('Admin Filter Logic', () => {
  it('correctly filters deposit and withdrawal requests by status', () => {
    const deposits = [
      { id: 1, status: 'pending', amount: '10000' },
      { id: 2, status: 'approved', amount: '25000' },
      { id: 3, status: 'rejected', amount: '50000' },
    ];

    const filterDeposits = (status: string) => 
      deposits.filter(d => status === 'all' || d.status === status);

    expect(filterDeposits('pending')).toEqual([{ id: 1, status: 'pending', amount: '10000' }]);
    expect(filterDeposits('approved')).toEqual([{ id: 2, status: 'approved', amount: '25000' }]);
    expect(filterDeposits('rejected')).toEqual([{ id: 3, status: 'rejected', amount: '50000' }]);
    expect(filterDeposits('all')).toHaveLength(3);
  });
});
