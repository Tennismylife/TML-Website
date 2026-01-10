// app/api/_events/collect/route.ts
import { handleGa4Post } from '../../_ga4/handler';

export async function POST(req: Request) {
  return handleGa4Post(req);
}
