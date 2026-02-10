/**
 * Types partagés pour le système Connectors multi-plateforme.
 */

export type Provider =
  | "shopify"
  | "woocommerce"
  | "prestashop"
  | "bigcommerce"
  | "magento"
  | "wix"
  | "squarespace"
  | "opencart"
  | "ecwid"
  | "custom"
  | "other";

export type IntegrationStatus =
  | "not_connected"
  | "connected"
  | "error"
  | "disconnected";

export type ConnectType = "oauth" | "apikey" | "none";

export interface ConnectorConfig {
  provider: Provider;
  displayName: string;
  connectType: ConnectType;
  canFetchOrders: boolean;
  canFetchCustomers: boolean;
  canFetchProducts: boolean;
}

/** Paramètres pour démarrer une connexion OAuth (ex: Shopify) */
export interface OAuthStartParams {
  storeId: string;
  redirectUri: string;
  /** Pour Shopify: domaine du shop (ex: mystore.myshopify.com) */
  shop?: string;
  /** État OAuth (ex: storeId pour retrouver le store au callback) */
  state?: string;
}

/** Paramètres pour le callback OAuth */
export interface OAuthCallbackParams {
  code: string;
  state: string;
  shop?: string;
  hmac?: string;
}

/** Paramètres pour connexion API key (WooCommerce, PrestaShop) */
export interface ApiKeyConnectParams {
  storeId: string;
  storeUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
  apiKey?: string;
}

export interface Connector {
  config: ConnectorConfig;

  /** Retourne l'URL de redirection OAuth ou null si apikey/none */
  startConnect(params: OAuthStartParams): Promise<string | null>;

  /** Traite le callback OAuth (oauth only) */
  handleCallback?(params: OAuthCallbackParams): Promise<{ storeId: string }>;

  /** Teste la connexion (apikey: appelle l'API avec les credentials) */
  testConnection(params: ApiKeyConnectParams): Promise<boolean>;

  /** Sync initiale après connexion (orders 30j, customers, products count) */
  initialSync(storeId: string): Promise<void>;

  /** Sync delta (optionnel, plus tard) */
  syncDelta?(storeId: string): Promise<void>;
}

export interface StoreIntegrationRow {
  id: string;
  store_id: string;
  provider: Provider;
  status: IntegrationStatus;
  credentials_encrypted: string | null;
  scopes: string | null;
  shop_domain: string | null;
  metadata: Record<string, unknown> | null;
  connected_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreMetricsDailyRow {
  store_id: string;
  day: string;
  provider: string;
  revenue: number;
  orders_count: number;
  refunds: number;
  aov: number | null;
  new_customers: number;
  total_customers: number;
}
