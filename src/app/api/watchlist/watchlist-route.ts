// src/app/api/watchlist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { anilistId, title, image, status = "plan_to_watch" } = await req.json();
  const item = await prisma.watchlistItem.upsert({
    where: { userId_anilistId: { userId: session.user.id, anilistId } },
    update: { status, title, image, updatedAt: new Date() },
    create: { userId: session.user.id, anilistId, title, image, status },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { anilistId } = await req.json();
  await prisma.watchlistItem.delete({
    where: { userId_anilistId: { userId: session.user.id, anilistId } },
  });
  return NextResponse.json({ success: true });
}

// Add to existing watchlist route — GET with ?id= param
// In the GET handler, check for id param:
// const id = req.nextUrl.searchParams.get("id");
// if (id) {
//   const item = await prisma.watchlistItem.findUnique({
//     where: { userId_anilistId: { userId: session.user.id, anilistId: parseInt(id) } }
//   });
//   return NextResponse.json({ item });
// }
