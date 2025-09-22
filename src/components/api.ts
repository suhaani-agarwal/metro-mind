import { OptimizationResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5005";

async function handleRes<T = unknown>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function generateData(): Promise<{
  message: string;
  data?: unknown;
}> {
  const res = await fetch(`${BASE}/generate-data`);
  return handleRes<{ message: string; data?: unknown }>(res);
}

export async function optimize(): Promise<OptimizationResponse> {
  const res = await fetch(`${BASE}/optimize`, { method: "POST" });
  return handleRes<OptimizationResponse>(res);
}

export async function getResults(): Promise<OptimizationResponse> {
  const res = await fetch(`${BASE}/results`);
  return handleRes<OptimizationResponse>(res);
}
