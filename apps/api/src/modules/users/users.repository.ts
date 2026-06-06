import type { CreateUserInput, UserSummary } from './users.types.js';

export class UsersRepository {
  async create(_input: CreateUserInput): Promise<UserSummary> {
    throw new Error('UsersRepository.create is not implemented yet.');
  }

  async findById(_id: string): Promise<UserSummary | null> {
    throw new Error('UsersRepository.findById is not implemented yet.');
  }
}
