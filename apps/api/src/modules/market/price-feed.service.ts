import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { logger } from '../../shared/logging/logger.js';
import { globalEventBus } from '../../shared/events/event-bus.js';
import type { PriceTickEvent } from '../../shared/events/event.types.js';
import { MarketRepository } from './market.repository.js';
import type { PriceTick } from './market.types.js';

const FEED_TICKERS = [
  'AAPL',
  'TSLA',
  'MSFT',
  'NVDA',
  'GOOGL',
  'AMZN',
  'META',
  'ROKU',
  'RDDT',
  'ALAB',
  'ARM',
  'KVUE',
  'BIRK',
  'CART',
] as const;
const ONE_SECOND_MS = 1000;

interface PriceState {
  ticker: string;
  price: number;
  anchorPrice: number;
  volatility: number;
  prng: SeededRandom;
}

class SeededRandom {
  constructor(private state: number) {}

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;

    return this.state / 2 ** 32;
  }
}

export class PriceFeedService {
  private readonly wss: WebSocketServer;
  private interval: NodeJS.Timeout | null = null;
  private readonly prices = new Map<string, PriceState>([
    [
      'AAPL',
      {
        ticker: 'AAPL',
        price: 195.25,
        anchorPrice: 195.25,
        volatility: 0.0035,
        prng: new SeededRandom(0x0aa71),
      },
    ],
    [
      'TSLA',
      {
        ticker: 'TSLA',
        price: 248.75,
        anchorPrice: 248.75,
        volatility: 0.0075,
        prng: new SeededRandom(0x751a),
      },
    ],
    [
      'MSFT',
      {
        ticker: 'MSFT',
        price: 425.1,
        anchorPrice: 425.1,
        volatility: 0.003,
        prng: new SeededRandom(0x45f7),
      },
    ],
    [
      'NVDA',
      {
        ticker: 'NVDA',
        price: 125.5,
        anchorPrice: 125.5,
        volatility: 0.012,
        prng: new SeededRandom(0x4e56da),
      },
    ],
    [
      'GOOGL',
      {
        ticker: 'GOOGL',
        price: 175.8,
        anchorPrice: 175.8,
        volatility: 0.004,
        prng: new SeededRandom(0x6006),
      },
    ],
    [
      'AMZN',
      {
        ticker: 'AMZN',
        price: 185.3,
        anchorPrice: 185.3,
        volatility: 0.005,
        prng: new SeededRandom(0x4d23),
      },
    ],
    [
      'META',
      {
        ticker: 'META',
        price: 505.2,
        anchorPrice: 505.2,
        volatility: 0.006,
        prng: new SeededRandom(0x3e7a),
      },
    ],
    [
      'ROKU',
      {
        ticker: 'ROKU',
        price: 65.4,
        anchorPrice: 65.4,
        volatility: 0.015,
        prng: new SeededRandom(0x8090),
      },
    ],
    [
      'RDDT',
      {
        ticker: 'RDDT',
        price: 55.2,
        anchorPrice: 55.2,
        volatility: 0.02,
        prng: new SeededRandom(0x8edd),
      },
    ],
    [
      'ALAB',
      {
        ticker: 'ALAB',
        price: 85.7,
        anchorPrice: 85.7,
        volatility: 0.018,
        prng: new SeededRandom(0x41ab),
      },
    ],
    [
      'ARM',
      {
        ticker: 'ARM',
        price: 155.4,
        anchorPrice: 155.4,
        volatility: 0.014,
        prng: new SeededRandom(0x483),
      },
    ],
    [
      'KVUE',
      {
        ticker: 'KVUE',
        price: 18.9,
        anchorPrice: 18.9,
        volatility: 0.003,
        prng: new SeededRandom(0x1234),
      },
    ],
    [
      'BIRK',
      {
        ticker: 'BIRK',
        price: 45.6,
        anchorPrice: 45.6,
        volatility: 0.008,
        prng: new SeededRandom(0x5678),
      },
    ],
    [
      'CART',
      {
        ticker: 'CART',
        price: 32.4,
        anchorPrice: 32.4,
        volatility: 0.012,
        prng: new SeededRandom(0x9abc),
      },
    ],
  ]);

  constructor(
    server: HttpServer,
    private readonly marketRepository = new MarketRepository(),
  ) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/prices',
    });
  }

  start() {
    if (this.interval) {
      return;
    }

    this.wss.on('connection', (socket) => {
      logger.info('Price feed client connected');
      this.sendSnapshot(socket);
    });

    this.interval = setInterval(() => {
      void this.publishNextTicks();
    }, ONE_SECOND_MS);

    logger.info('Simulated price feed started', {
      path: '/ws/prices',
      tickers: FEED_TICKERS,
      intervalMs: ONE_SECOND_MS,
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.wss.close();
  }

  private async publishNextTicks() {
    const ticks = Array.from(this.prices.values()).map((state) => this.nextTick(state));

    await Promise.all(ticks.map((tick) => this.marketRepository.saveQuote(tick)));

    // Emit PriceTick events for each ticker
    for (const tick of ticks) {
      const event: PriceTickEvent = {
        eventType: 'PriceTick',
        eventId: crypto.randomUUID(),
        timestamp: tick.timestamp,
        data: tick,
      };

      void globalEventBus.publish(event);
    }

    this.broadcast({
      type: 'price_ticks',
      data: ticks,
    });
  }

  private sendSnapshot(socket: WebSocket) {
    const ticks = Array.from(this.prices.values()).map((state) => this.toTick(state, state.price));

    socket.send(
      JSON.stringify({
        type: 'price_snapshot',
        data: ticks,
      }),
    );
  }

  private nextTick(state: PriceState): PriceTick {
    const previousPrice = state.price;
    const randomShock = this.randomNormal(state.prng) * state.volatility;
    const meanReversion = (state.anchorPrice - state.price) / state.price / 500;
    const nextPrice = Math.max(0.01, state.price * (1 + randomShock + meanReversion));

    state.price = Number(nextPrice.toFixed(4));

    return this.toTick(state, previousPrice);
  }

  private toTick(state: PriceState, previousPrice: number): PriceTick {
    const change = state.price - previousPrice;
    const changePercent = previousPrice === 0 ? 0 : change / previousPrice;

    return {
      ticker: state.ticker,
      price: state.price.toFixed(4),
      previousPrice: previousPrice.toFixed(4),
      change: change.toFixed(4),
      changePercent: changePercent.toFixed(6),
      timestamp: new Date().toISOString(),
    };
  }

  private broadcast(payload: unknown) {
    const message = JSON.stringify(payload);

    for (const client of this.wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }

  // Box-Muller transform gives smoother deterministic random-walk movement than uniform noise.
  private randomNormal(prng: SeededRandom) {
    const u1 = Math.max(prng.next(), Number.EPSILON);
    const u2 = prng.next();

    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
