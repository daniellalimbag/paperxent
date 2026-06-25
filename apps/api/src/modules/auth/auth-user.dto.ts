import type { User } from '@prisma/client';

export function formatAuthUser(user: Pick<User, 'id' | 'email' | 'balance' | 'startingBalance' | 'createdAt'>) {
  return {
    id: user.id,
    email: user.email,
    balance: user.balance.toString(),
    startingBalance: user.startingBalance.toString(),
    createdAt: user.createdAt.toISOString(),
  };
}
