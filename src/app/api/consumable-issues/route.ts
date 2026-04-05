import { NextRequest, NextResponse } from "next/server";
import prisma from "@backend/lib/prisma";
import { getUserFromRequest } from "@backend/lib/jwt";
import { getManagerSiteIds } from "@backend/lib/siteAccess";

// GET issue logs (admin and manager can view)
export async function GET(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const managerSiteIds = getManagerSiteIds(currentUser);
  const where = {
    consumable: {
      product: { productType: { type: "Consumable" as const } },
      ...(currentUser.role === "manager" ? { siteId: { in: managerSiteIds } } : {}),
    },
  };

  const prismaAny = prisma as any;
  const logs = await prismaAny.consumableIssueLog.findMany({
    where,
    include: {
      consumable: {
        include: {
          product: { include: { category: true, productType: true } },
          site: true,
        },
      },
      issuedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    logs: logs.map((log: any) => ({
      _id: log.id,
      id: log.id,
      quantity: log.quantity,
      issuedTo: log.issuedTo || "",
      notes: log.notes || "",
      createdAt: log.createdAt,
      consumable: {
        _id: log.consumable.id,
        id: log.consumable.id,
        name: log.consumable.name,
        assetTag: log.consumable.assetTag,
        quantity: log.consumable.quantity,
        site: log.consumable.site ? { _id: log.consumable.site.id, name: log.consumable.site.name } : null,
        product: log.consumable.product
          ? {
              _id: log.consumable.product.id,
              name: log.consumable.product.name,
              category: log.consumable.product.category
                ? { _id: log.consumable.product.category.id, name: log.consumable.product.category.name }
                : null,
            }
          : null,
      },
      issuedBy: {
        _id: log.issuedBy.id,
        name: `${log.issuedBy.firstName} ${log.issuedBy.lastName}`.trim(),
        email: log.issuedBy.email,
      },
    })),
  });
}

// POST issue consumable (admin only)
export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const consumableId = typeof body.consumableId === "string" ? body.consumableId : "";
  const issueQty = Number(body.quantity);
  const issuedTo = typeof body.issuedTo === "string" ? body.issuedTo.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!consumableId || !Number.isFinite(issueQty) || issueQty <= 0) {
    return NextResponse.json({ message: "Valid consumable and quantity are required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const consumable = await txAny.asset.findUnique({
        where: { id: consumableId },
        include: { product: { include: { productType: true } } },
      });

      if (!consumable || consumable.product?.productType?.type !== "Consumable") {
        throw new Error("NOT_CONSUMABLE");
      }

      if ((consumable.quantity ?? 0) < issueQty) {
        throw new Error("INSUFFICIENT_QTY");
      }

      const updated = await txAny.asset.update({
        where: { id: consumableId },
        data: { quantity: { decrement: issueQty } },
      });

      const log = await txAny.consumableIssueLog.create({
        data: {
          consumableId,
          quantity: issueQty,
          issuedTo: issuedTo || null,
          notes: notes || null,
          issuedById: currentUser.id,
        },
      });

      return { updated, log };
    });

    return NextResponse.json({
      message: "Consumable issued",
      remainingQuantity: result.updated.quantity,
      log: {
        _id: result.log.id,
        id: result.log.id,
        quantity: result.log.quantity,
        issuedTo: result.log.issuedTo || "",
        notes: result.log.notes || "",
        createdAt: result.log.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CONSUMABLE") {
      return NextResponse.json({ message: "Selected item is not a consumable" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_QTY") {
      return NextResponse.json({ message: "Insufficient quantity available" }, { status: 400 });
    }
    throw error;
  }
}
