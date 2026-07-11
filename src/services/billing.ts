/**
 * Monetización — apagada por defecto, pero cableada para que activar ads o
 * suscripciones NO requiera reescribir la app (requisito del producto).
 *
 * Cómo activar en serio:
 *  - Suscripciones web: Stripe Checkout → implementar purchase() llamando a tu
 *    backend, persistir el planId del usuario y listo: los gates ya existen.
 *  - Stores (Capacitor): RevenueCat (@revenuecat/purchases-capacitor) expone
 *    getCustomerInfo() → mapear entitlement → PlanId.
 *  - Ads: poner ADS_ENABLED=true y renderizar el SDK dentro de <AdSlot/>
 *    (AdMob vía @capacitor-community/admob en stores, o AdSense en web).
 */
export type PlanId = "free" | "pro" | "org";

export interface PlanSpec {
  id: PlanId;
  label: string;
  maxOrgs: number;
  maxMembersPerOrg: number;
  metricsExport: boolean;
  showsAds: boolean;
  priceHint: string;
}

export const PLANS: Record<PlanId, PlanSpec> = {
  free: {
    id: "free",
    label: "Free",
    maxOrgs: 1,
    maxMembersPerOrg: 30,
    metricsExport: false,
    showsAds: true,
    priceHint: "$0"
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxOrgs: 5,
    maxMembersPerOrg: 150,
    metricsExport: true,
    showsAds: false,
    priceHint: "próximamente"
  },
  org: {
    id: "org",
    label: "Organización",
    maxOrgs: 99,
    maxMembersPerOrg: 1000,
    metricsExport: true,
    showsAds: false,
    priceHint: "próximamente"
  }
};

/** Flag global de ads. Dejar en false hasta integrar un SDK real. */
export const ADS_ENABLED = false;

export type GatedFeature = "metricsExport";

export function can(plan: PlanId, feature: GatedFeature): boolean {
  return PLANS[plan][feature];
}

export function shouldShowAds(plan: PlanId): boolean {
  return ADS_ENABLED && PLANS[plan].showsAds;
}

/** Stub de compra: reemplazar por Stripe / RevenueCat. */
export async function purchase(plan: PlanId): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: `Checkout de "${PLANS[plan].label}" no conectado todavía (ver src/services/billing.ts).`
  };
}
