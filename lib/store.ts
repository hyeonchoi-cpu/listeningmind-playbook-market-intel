// 잡 상태(KV) + 완성 리포트(Blob) 저장소 — 서버 전용.
//
// 저장소 우선순위 (2026-07-31 AWS 어댑터 도입):
//   1) AWS — DynamoDB(잡 상태, TTL 자동 만료) + S3(리포트 JSON, 프라이빗 버킷)
//      환경변수: LM_AWS_REGION / LM_AWS_ACCESS_KEY_ID / LM_AWS_SECRET_ACCESS_KEY / LM_S3_BUCKET / LM_DDB_TABLE
//      (Vercel이 AWS_ 접두사 환경변수를 예약하므로 LM_AWS_* 커스텀 이름 사용)
//      선택 이유: 조직 표준(AWS·Bedrock 로드맵) 정합 + 리포트 JSON을 사내 에이전트가
//      같은 계정에서 컨텍스트로 직접 읽는 경로 확보 + 데이터 소유권.
//   2) Vercel Marketplace — Upstash Redis(KV_REST_API_*) + Vercel Blob(BLOB_READ_WRITE_TOKEN)
//   3) 로컬 파일 폴백 — 프로젝트 루트 .data/ (개발 전용, .gitignore 처리)
import { promises as fs } from "fs";
import path from "path";

const LOCAL_ROOT = path.join(process.cwd(), ".data");

// ── AWS (1순위) ──────────────────────────────────────────────────
function hasAws(): boolean {
  return !!(
    process.env.LM_AWS_ACCESS_KEY_ID &&
    process.env.LM_AWS_SECRET_ACCESS_KEY &&
    process.env.LM_S3_BUCKET &&
    process.env.LM_DDB_TABLE
  );
}

function awsCreds() {
  return {
    region: process.env.LM_AWS_REGION ?? "ap-northeast-2",
    credentials: {
      accessKeyId: process.env.LM_AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.LM_AWS_SECRET_ACCESS_KEY!,
    },
  };
}

async function getDdb() {
  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient } = await import("@aws-sdk/lib-dynamodb");
  return DynamoDBDocumentClient.from(new DynamoDBClient(awsCreds()), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

async function getS3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client(awsCreds());
}

// ── Vercel Marketplace (2순위) ───────────────────────────────────
function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── 로컬 파일 폴백 (3순위) ────────────────────────────────────────
async function localReadJson<T>(relPath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(LOCAL_ROOT, relPath), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function localWriteJson(relPath: string, value: unknown): Promise<void> {
  const full = path.join(LOCAL_ROOT, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(value), "utf-8");
}

// ── KV (잡/캐시 상태) ─────────────────────────────────────────────
export async function kvGet<T>(key: string): Promise<T | null> {
  if (hasAws()) {
    const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
    const ddb = await getDdb();
    const res = await ddb.send(new GetCommand({ TableName: process.env.LM_DDB_TABLE!, Key: { id: key } }));
    const item = res.Item as { value?: string; expiresAt?: number } | undefined;
    if (!item?.value) return null;
    // DynamoDB TTL 삭제는 최대 48h 지연될 수 있음 — 만료 시각을 직접 검사해 캐시 정확성 보장
    if (item.expiresAt && item.expiresAt * 1000 < Date.now()) return null;
    return JSON.parse(item.value) as T;
  }
  if (hasKv()) {
    const redis = await getRedis();
    const v = await redis.get<T>(key);
    return v ?? null;
  }
  return localReadJson<T>(path.join("kv", `${encodeURIComponent(key)}.json`));
}

export async function kvSet(key: string, value: unknown, opts: { ttlSeconds?: number } = {}): Promise<void> {
  if (hasAws()) {
    const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
    const ddb = await getDdb();
    await ddb.send(
      new PutCommand({
        TableName: process.env.LM_DDB_TABLE!,
        Item: {
          id: key,
          value: JSON.stringify(value),
          ...(opts.ttlSeconds ? { expiresAt: Math.floor(Date.now() / 1000) + opts.ttlSeconds } : {}),
        },
      }),
    );
    return;
  }
  if (hasKv()) {
    const redis = await getRedis();
    if (opts.ttlSeconds) await redis.set(key, value, { ex: opts.ttlSeconds });
    else await redis.set(key, value);
    return;
  }
  await localWriteJson(path.join("kv", `${encodeURIComponent(key)}.json`), value);
}

// ── Blob (완성된 리포트 JSON) ──────────────────────────────────────
// AWS 경로의 반환 URL은 "s3:<key>" 프리픽스 — 버킷이 프라이빗이므로 공개 URL 대신
// blobGetJson이 GetObject로 해석한다 (로컬 "local:" 프리픽스와 같은 패턴).
export async function blobPutJson(blobPath: string, data: unknown): Promise<{ url: string }> {
  if (hasAws()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await getS3();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.LM_S3_BUCKET!,
        Key: blobPath,
        Body: JSON.stringify(data),
        ContentType: "application/json",
      }),
    );
    return { url: `s3:${blobPath}` };
  }
  if (hasBlob()) {
    const { put } = await import("@vercel/blob");
    const res = await put(blobPath, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return { url: res.url };
  }
  await localWriteJson(path.join("blob", blobPath), data);
  // 로컬 폴백 URL — GET /api/reports/[jobId] 라우트가 local: 프리픽스를 blobGetJson으로 그대로 해석한다.
  return { url: `local:${blobPath}` };
}

export async function blobGetJson<T>(url: string): Promise<T | null> {
  if (url.startsWith("s3:")) {
    if (!hasAws()) return null;
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await getS3();
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: process.env.LM_S3_BUCKET!, Key: url.slice("s3:".length) }),
      );
      const body = await res.Body?.transformToString();
      return body ? (JSON.parse(body) as T) : null;
    } catch {
      return null;
    }
  }
  if (url.startsWith("local:")) {
    return localReadJson<T>(path.join("blob", url.slice("local:".length)));
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
