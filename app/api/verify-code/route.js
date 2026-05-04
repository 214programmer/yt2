import { isValidAccessCode } from "@/lib/access-codes";

export async function POST(request) {
  const { code } = await request.json();
  if (isValidAccessCode(code)) {
    return Response.json({ valid: true });
  } else {
    return Response.json({ valid: false }, { status: 401 });
  }
}
