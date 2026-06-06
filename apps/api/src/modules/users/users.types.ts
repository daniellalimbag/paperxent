export interface UserSummary {
  id: string;
  email: string;
  balance: string;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}
