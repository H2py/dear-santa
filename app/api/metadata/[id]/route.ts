import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tree = await prisma.tree.findUnique({
    where: { id },
    select: {
      id: true,
      background: true,
      shape: true,
      owner: { select: { id: true } },
    },
  });

  if (!tree) {
    return NextResponse.json({ error: "Tree not found" }, { status: 404 });
  }

  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    process.env.VERCEL_URL?.replace(/\/$/, "") ??
    "";
  const image = base
    ? `${base}/bg/bg-${tree.background}.png`
    : `/bg/bg-${tree.background}.png`;

  const metadata = {
    name: `Zeta Tree #${tree.id.slice(0, 6)}`,
    description: "Zeta zmas Tree collectible",
    image,
    attributes: [
      { trait_type: "Background", value: tree.background },
      { trait_type: "Shape", value: tree.shape },
      { trait_type: "OwnerId", value: tree.owner.id },
    ],
  };

  return NextResponse.json(metadata);
}
