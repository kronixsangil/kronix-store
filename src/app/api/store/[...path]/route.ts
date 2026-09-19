//src\app\api\store\[...path]\route.ts
import { NextRequest } from "next/server";

const configuredApi = String(process.env.NEXT_PUBLIC_API || "").trim();
const isDevelopment = process.env.NODE_ENV !== "production";
const allowRemoteDevApi = process.env.KRONIX_ALLOW_REMOTE_API_IN_DEV === "true";

// Seguridad de desarrollo: una Store App levantada con `npm run dev` NO debe
// crear órdenes reales por accidente aunque .env.local conserve la URL de Railway.
// Para probar deliberadamente contra una API remota en desarrollo se requiere
// KRONIX_ALLOW_REMOTE_API_IN_DEV=true.
const API_BASE =
  isDevelopment && !allowRemoteDevApi
    ? "http://localhost:3004"
    : configuredApi || "http://localhost:3004";

function buildTargetUrl(req: NextRequest, pathParts: string[]) {
  const path = pathParts.join("/");
  const url = new URL(req.url);
  const target = new URL(`${API_BASE.replace(/\/$/, "")}/${path}`);

  url.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return target.toString();
}

function buildProxyHeaders(sourceHeaders: Headers) {
  const headers = new Headers(sourceHeaders);

  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("proxy-authenticate");
  headers.delete("proxy-authorization");
  headers.delete("te");
  headers.delete("trailer");
  headers.delete("upgrade");

  return headers;
}

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(req, path || []);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-ct-app", "store");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const res = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = buildProxyHeaders(res.headers);
  const responseBody = await res.arrayBuffer();

  return new Response(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, context);
}

export async function OPTIONS(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(req, context);
}