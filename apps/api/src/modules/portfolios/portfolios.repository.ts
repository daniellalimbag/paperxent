import type { GetPortfolioInput, PortfolioPosition } from './portfolios.types.js';

export class PortfoliosRepository {
  async findByUserId(_input: GetPortfolioInput): Promise<PortfolioPosition[]> {
    throw new Error('PortfoliosRepository.findByUserId is not implemented yet.');
  }
}
