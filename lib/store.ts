// 잡 상태(KV) + 완성 리포트(Blob) 저장소 — 서버 전용.
//
// 설계 결정(docs/market-intelligence-webapp-design.md §8 결정 2): "Vercel KV + Vercel Blob".
// 단, @vercel/kv 패키지는 설치 시점에 deprecated로 확인돼(Vercel이 Upstash Redis 직접 사용을 공식
// 권장) 실제 구현체는 @upstash/redis를 쓴다 — Vercel 마켓플레이스의 Redis 연동을 프로젝트에 붙이면
// 동일한 KV_REST_API_URL/KV_REST_API_TOKEN 환경변수가 주입되므로 "결정 2"의 의도(관리형 KV 사용)는
// 그대로 유지된다.
// 로컬 개발 시 실제 Vercel 리소스가 연결돼 있지 않아도 기능을 통째로 검증할 수 있도록,
// 관련 환경변수(KV_REST_API_URL / BLOB_READ_WRITE_TOKEN)가 없으면 프로젝트 루트 `.data/`에
// 파일로 대체 저장한다(.gitignore 처리됨). Vercel에 KV/Blob을 연결하면 env var가 자동 주입되어
// 코드 변경 없이 그대로 실서비스 저장소로 전환된다.
import { promises as fs } from "fs";
import path from "path";

const LOCAL_ROOT = path.join(process.cwd(), ".data");

function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Redis.fromEnv()는 UPSTASH_REDIS_REST_URL/_TOKEN 이름을 기대하는데, Vercel Marketplace의
// Redis(Upstash) 연동은 KV_REST_API_URL/KV_REST_API_TOKEN으로 주입한다 — 이름 불일치를 피하려고
// 명시적으로 생성한다.
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
  if (hasKv()) {
    const redis = await getRedis();
    const v = await redis.get<T>(key);
    return v ?? null;
  }
  return localReadJson<T>(path.join("kv", `${encodeURIComponent(key)}.json`));
}

export async function kvSet(key: string, value: unknown, opts: { ttlSeconds?: number } = {}): Promise<void> {
  if (hasKv()) {
    const redis = await getRedis();
    if (opts.ttlSeconds) await redis.set(key, value, { ex: opts.ttlSeconds });
    else await redis.set(key, value);
    return;
  }
  await localWriteJson(path.join("kv", `${encodeURIComponent(key)}.json`), value);
}

// ── Blob (완성된 리포트 JSON) ──────────────────────────────────────
export async function blobPutJson(blobPath: string, data: unknown): Promise<{ url: string }> {
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
  if (url.startsWith("local:")) {
    return localReadJson<T>(path.join("blob", url.slice("local:".length)));
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
