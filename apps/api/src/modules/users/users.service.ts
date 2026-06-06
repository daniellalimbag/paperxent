import type { CreateUserInput, UserSummary } from './users.types.js';
import { UsersRepository } from './users.repository.js';

export class UsersService {
  constructor(private readonly usersRepository = new UsersRepository()) {}

  createUser(input: CreateUserInput): Promise<UserSummary> {
    return this.usersRepository.create(input);
  }

  getUserById(id: string): Promise<UserSummary | null> {
    return this.usersRepository.findById(id);
  }
}
