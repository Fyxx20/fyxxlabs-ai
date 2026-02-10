import type { Provider, Connector } from "./types";
import { shopifyConnector } from "./shopify";

export const CONNECTABLE_PROVIDERS: Provider[] = ["shopify"];

export const PLATFORM_UI_LIST: { value: Provider; label: string; connectable: boolean }[] = [
  { value: "shopify", label: "Shopify", connectable: true },
  { value: "custom", label: "URL uniquement", connectable: false },
];

const connectors = new Map<Provider, Connector>([
  ["shopify", shopifyConnector],
]);

export function getConnector(provider: Provider) {
  return connectors.get(provider) ?? null;
}

export function isConnectable(provider: Provider): boolean {
  return CONNECTABLE_PROVIDERS.includes(provider);
}
