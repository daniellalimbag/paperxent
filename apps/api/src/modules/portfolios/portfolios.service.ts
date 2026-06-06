import type { GetPortfolioInput, PortfolioPosition } from './portfolios.types.js';
import { PortfoliosRepository } from './portfolios.repository.js';

export class PortfoliosService {
  constructor(private readonly portfoliosRepository = new PortfoliosRepository()) {}

  getPortfolio(input: GetPortfolioInput): Promise<PortfolioPosition[]> {
    return this.portfoliosRepository.findByUserId(input);
  }
}
