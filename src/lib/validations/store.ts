import { z } from "zod";

export const storeGoalEnum = z.enum([
  "sales",
  "roas",
  "conversion",
  "traffic",
  "trust",
  "other",
]);

export const platformEnum = z.enum([
  "shopify",
  "woocommerce",
  "prestashop",
  "bigcommerce",
  "magento",
  "wix",
  "squarespace",
  "opencart",
  "ecwid",
  "custom",
  "other",
]);

export const stageEnum = z.enum([
  "unknown",
  "0_sales",
  "some_sales",
  "regular_sales",
  "profitable",
]);

export const trafficSourceEnum = z.enum([
  "meta",
  "google",
  "seo",
  "email",
  "influence",
  "other",
]);

export const aovBucketEnum = z.enum([
  "0_30",
  "30_80",
  "80_150",
  "150_plus",
]);

export const createStoreSchema = z.object({
  name: z.string().min(1, "Nom requis").max(100),
  website_url: z
    .string()
    .min(1, "URL requise")
    .refine(
      (url) => url.startsWith("http://") || url.startsWith("https://"),
      "URL doit commencer par http:// ou https://"
    ),
  goal: storeGoalEnum,
  platform: platformEnum.default("other"),
  stage: stageEnum.default("0_sales"),
  traffic_source: trafficSourceEnum.default("other"),
  aov_bucket: aovBucketEnum.default("0_30"),
  country: z.string().min(2).max(2).default("FR"),
});

export const updateStoreSchema = createStoreSchema.partial();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
