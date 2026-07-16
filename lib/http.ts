import { NextResponse } from "next/server";
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (msg: string, status = 400) => NextResponse.json({ detail: msg }, { status });
export const DEFAULT_QUOTA = 500;
