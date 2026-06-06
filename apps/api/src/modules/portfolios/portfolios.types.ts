export interface PortfolioPosition {
  ticker: string;
  quantity: string;
  averageBuyPrice: string;
}

export interface GetPortfolioInput {
  userId: string;
}
