import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface UploadDigitalAssetInput {
  userId: string;
  storeId?: string | null;
  title: string;
  kind: "ebook" | "template" | "course" | "bundle" | "other";
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

export interface UploadDigitalAssetResult {
  assetId: string;
  filePath: string;
  checksumSha256: string;
  bytes: number;
}

export interface CreateDeliveryLinkInput {
  userId: string;
  assetId: string;
  customerEmail: string;
  orderRef?: string;
  ttlSeconds?: number;
  maxDownloads?: number;
}

export interface CreateDeliveryLinkResult {
  deliveryId: string;
  signedUrl: string;
  expiresAt: string;
}

const DIGITAL_BUCKET = "digital-assets";

function getDownloadTtlSeconds(override?: number): number {
  if (override && override > 0) return override;
  const fromEnv = Number(process.env.DIGITAL_DOWNLOAD_URL_TTL_SECONDS ?? 86400);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 86400;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "-").replace(/\-+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "file.bin";
}

export async function uploadDigitalAsset(
  input: UploadDigitalAssetInput
): Promise<UploadDigitalAssetResult> {
  const admin = getSupabaseAdmin();
  const checksumSha256 = createHash("sha256").update(input.fileBuffer).digest("hex");
  const safeName = sanitizeFileName(input.fileName);
  const filePath = `${input.userId}/${randomUUID()}-${safeName}`;

  const upload = await admin.storage
    .from(DIGITAL_BUCKET)
    .upload(filePath, input.fileBuffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (upload.error) {
    throw new Error(`UPLOAD_FAILED:${upload.error.message}`);
  }

  const assetInsert = await admin
    .from("digital_assets")
    .insert({
      user_id: input.userId,
      store_id: input.storeId ?? null,
      asset_kind: input.kind,
      title: input.title,
      file_path: filePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size_bytes: input.fileBuffer.byteLength,
      checksum_sha256: checksumSha256,
      status: "ready",
      metadata: {},
    })
    .select("id")
    .single();

  if (assetInsert.error || !assetInsert.data) {
    throw new Error(`ASSET_INSERT_FAILED:${assetInsert.error?.message ?? "unknown"}`);
  }

  return {
    assetId: assetInsert.data.id,
    filePath,
    checksumSha256,
    bytes: input.fileBuffer.byteLength,
  };
}

export async function createDeliveryLink(
  input: CreateDeliveryLinkInput
): Promise<CreateDeliveryLinkResult> {
  const admin = getSupabaseAdmin();
  const asset = await admin
    .from("digital_assets")
    .select("id, user_id, file_path")
    .eq("id", input.assetId)
    .single();

  if (asset.error || !asset.data || asset.data.user_id !== input.userId) {
    throw new Error("ASSET_NOT_FOUND_OR_FORBIDDEN");
  }

  const ttlSeconds = getDownloadTtlSeconds(input.ttlSeconds);
  const signed = await admin.storage
    .from(DIGITAL_BUCKET)
    .createSignedUrl(asset.data.file_path, ttlSeconds);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`SIGNED_URL_FAILED:${signed.error?.message ?? "unknown"}`);
  }

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const inserted = await admin
    .from("digital_deliveries")
    .insert({
      user_id: input.userId,
      asset_id: input.assetId,
      order_ref: input.orderRef ?? null,
      customer_email: input.customerEmail,
      signed_url: signed.data.signedUrl,
      expires_at: expiresAt,
      delivered_at: new Date().toISOString(),
      max_downloads: input.maxDownloads ?? 3,
      status: "sent",
      metadata: {},
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(`DELIVERY_INSERT_FAILED:${inserted.error?.message ?? "unknown"}`);
  }

  return {
    deliveryId: inserted.data.id,
    signedUrl: signed.data.signedUrl,
    expiresAt,
  };
}

export async function markDeliveryOpened(deliveryId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const delivery = await admin
    .from("digital_deliveries")
    .select("id, status, download_count, max_downloads, expires_at")
    .eq("id", deliveryId)
    .single();
  if (delivery.error || !delivery.data) return;

  const expired = delivery.data.expires_at ? new Date(delivery.data.expires_at).getTime() < Date.now() : false;
  const nextCount = (delivery.data.download_count ?? 0) + 1;
  const reachedLimit = nextCount >= (delivery.data.max_downloads ?? 1);
  const nextStatus = expired ? "expired" : reachedLimit ? "opened" : "sent";

  await admin
    .from("digital_deliveries")
    .update({
      download_count: nextCount,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deliveryId);
}
