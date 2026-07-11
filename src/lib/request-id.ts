import { NextResponse } from "next/server";

const HEADER = "x-request-id";

export function getRequestId(req: Request): string {
  const existing = req.headers.get(HEADER);
  if (existing) return existing;
  return crypto.randomUUID();
}

export function withRequestId(req: Request, res: NextResponse): NextResponse {
  const id = getRequestId(req);
  res.headers.set(HEADER, id);
  return res;
}

export function requestIdMiddleware(req: Request, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  const id = getRequestId(req);
  return handler().then((res) => {
    res.headers.set(HEADER, id);
    return res;
  });
}
