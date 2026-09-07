import { Injectable, Logger } from '@nestjs/common';

export type QueryIntent =
  | 'AUTH_INTENT'
  | 'CHECKOUT_INTENT'
  | 'ORDER_INTENT'
  | 'DATABASE_CONFIG_INTENT'
  | 'ARCHITECTURE_INTENT'
  | 'GENERAL_CODE_INTENT';

export interface ProcessedQuery {
  rawQuery: string;
  cleanedQuery: string;
  intent: QueryIntent;
  targetSymbols: string[];
  targetFiles: string[];
  keywords: string[];
  expandedTerms: string[];
  isSpecificQuestion: boolean;
}

@Injectable()
export class QueryProcessorService {
  private readonly logger = new Logger(QueryProcessorService.name);

  process(rawQuery: string): ProcessedQuery {
    const trimmed = rawQuery.trim();
    const lower = trimmed.toLowerCase();

    // 1. Intent Detection
    let intent: QueryIntent = 'GENERAL_CODE_INTENT';
    const targetSymbols: string[] = [];
    const targetFiles: string[] = [];
    const keywords: string[] = [];
    const expandedTerms: string[] = [];

    // Check specific intent patterns
    if (
      lower.includes('auth') ||
      lower.includes('jwt') ||
      lower.includes('login') ||
      lower.includes('register') ||
      lower.includes('password') ||
      lower.includes('guard') ||
      lower.includes('token')
    ) {
      intent = 'AUTH_INTENT';
      targetSymbols.push('AuthController', 'AuthService', 'JwtAuthGuard', 'validateUser', 'generateTokens', 'login', 'register');
      targetFiles.push('auth.controller.ts', 'auth.service.ts', 'jwt-auth.guard.ts');
      expandedTerms.push('authentication', 'jwt', 'bearer', 'token', 'bcrypt', 'canActivate', 'guards');
    } else if (
      lower.includes('checkout') ||
      lower.includes('payment') ||
      lower.includes('cart') ||
      lower.includes('billing')
    ) {
      intent = 'CHECKOUT_INTENT';
      targetSymbols.push('CheckoutService', 'processCheckout', 'validateCart', 'authorizePayment', 'createOrderTransaction');
      targetFiles.push('checkout.service.ts', 'orders.service.ts', 'schema.sql');
      expandedTerms.push('checkout', 'payment', 'cart', 'transaction', 'taxes', 'order_created');
    } else if (
      lower.includes('order') ||
      lower.includes('order is created') ||
      lower.includes('create order') ||
      lower.includes('orders')
    ) {
      intent = 'ORDER_INTENT';
      targetSymbols.push('OrdersService', 'createOrder', 'handleOrderCreatedEvent', 'reserveInventory', 'orders');
      targetFiles.push('orders.service.ts', 'checkout.service.ts', 'schema.sql');
      expandedTerms.push('orders', 'order_items', 'inventory', 'invoice', 'status', 'ORDER_CREATED');
    } else if (
      lower.includes('postgres') ||
      lower.includes('postgresql') ||
      lower.includes('database') ||
      lower.includes('schema') ||
      lower.includes('sql') ||
      lower.includes('datasource')
    ) {
      intent = 'DATABASE_CONFIG_INTENT';
      targetSymbols.push('databaseUrl', 'postgresHost', 'postgresPort', 'users', 'workspaces', 'orders', 'poolConfig');
      targetFiles.push('configuration.ts', 'schema.sql', 'data-source.ts');
      expandedTerms.push('PostgreSQL', 'DATABASE_URL', 'PGPORT', 'connection pool', 'CREATE TABLE', 'UUID PRIMARY KEY');
    } else if (
      lower.includes('explain this repository') ||
      lower.includes('explain repository') ||
      lower.includes('what is this repo') ||
      lower.includes('architecture') ||
      lower.includes('how does devflow work') ||
      lower.includes('overview')
    ) {
      intent = 'ARCHITECTURE_INTENT';
      targetSymbols.push('IntelligenceService', 'JobsService', 'AuthService', 'WorkspaceService', 'GitHubService');
      targetFiles.push('app.module.ts', 'main.ts', 'configuration.ts');
      expandedTerms.push('DevFlow', 'NestJS', 'modular monolith', 'microservices', 'RAG pipeline', 'code graph', 'Kafka', 'Redis');
    }

    // 2. Keyword Extraction (filtering stop words)
    const stopWords = new Set([
      'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
      'is', 'are', 'was', 'were', 'what', 'where', 'how', 'when', 'why', 'which',
      'does', 'do', 'happens', 'configured', 'implemented', 'work', 'this', 'that',
    ]);

    const words = lower
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));

    keywords.push(...Array.from(new Set(words)));

    // 3. Cleaned Query
    const cleanedQuery = words.join(' ');

    return {
      rawQuery: trimmed,
      cleanedQuery,
      intent,
      targetSymbols,
      targetFiles,
      keywords,
      expandedTerms,
      isSpecificQuestion: trimmed.endsWith('?') || words.length <= 6,
    };
  }
}
