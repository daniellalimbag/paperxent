export interface PortfolioPosition {
  ticker: string;
  quantity: string;
  averageBuyPrice: string;
}

export interface GetPortfolioInput {
  userId: string;
}

export interface PortfolioValuationInput {
  userId: string;
}

export interface AssetValuation {
  ticker: string;
  quantity: string;
  averageBuyPrice: string;
  latestPrice: string;
  costBasis: string;
  marketValue: string;
  unrealizedPnl: string;
  roi: string;
  pricedAt: string;
}

export interface PortfolioValuation {
  userId: string;
  totalCostBasis: string;
  totalPortfolioValue: string;
  totalUnrealizedPnl: string;
  totalRoi: string;
  assets: AssetValuation[];
  valuedAt: string;
}
