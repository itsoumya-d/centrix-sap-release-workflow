export type ReleaseStatus = "draft" | "blocked" | "partially_released" | "released";

export interface Release {
  code: string;
  approver: string;
  at: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  companyCode: string;
  currency: string;
  netAmount: number;
  taxRateBps: number;
  taxAmount: number;
  totalAmount: number;
  budgetAvailable: number;
  requiredCodes: string[];
  releases: Release[];
  status: ReleaseStatus;
  createdAt: string;
  audit: { type: string; actor: string; detail: string; at: string }[];
}

export interface CreateOrderInput {
  supplier: string;
  companyCode: string;
  currency: string;
  netAmount: number;
  taxRateBps?: number;
  budgetAvailable: number;
}

export function releaseCodesFor(total: number): string[] {
  if (total <= 10_000) return [];
  if (total <= 50_000) return ["A"];
  if (total <= 250_000) return ["A", "B"];
  return ["A", "B", "C"];
}

function round(value: number): number {
  return Math.round(value);
}

export class ReleaseService {
  private seq = 0;
  private readonly orders = new Map<string, PurchaseOrder>();

  create(input: CreateOrderInput): PurchaseOrder {
    if (!input.supplier?.trim() || !input.companyCode?.trim() || !input.currency?.trim()) {
      throw new Error("supplier, companyCode and currency are required");
    }
    if (!Number.isFinite(input.netAmount) || input.netAmount < 0) throw new Error("netAmount cannot be negative");
    if (!Number.isFinite(input.budgetAvailable) || input.budgetAvailable < 0) throw new Error("budgetAvailable cannot be negative");
    const taxRateBps = input.taxRateBps ?? 1500;
    if (!Number.isInteger(taxRateBps) || taxRateBps < 0) throw new Error("taxRateBps must be a non-negative integer");

    this.seq += 1;
    const taxAmount = round((input.netAmount * taxRateBps) / 10_000);
    const totalAmount = input.netAmount + taxAmount;
    const requiredCodes = releaseCodesFor(totalAmount);
    const blocked = totalAmount > input.budgetAvailable;
    const order: PurchaseOrder = {
      id: `po_${Date.now()}_${this.seq}`,
      supplier: input.supplier.trim(),
      companyCode: input.companyCode.trim(),
      currency: input.currency.trim().toUpperCase(),
      netAmount: input.netAmount,
      taxRateBps,
      taxAmount,
      totalAmount,
      budgetAvailable: input.budgetAvailable,
      requiredCodes,
      releases: [],
      status: blocked ? "blocked" : requiredCodes.length === 0 ? "released" : "draft",
      createdAt: new Date().toISOString(),
      audit: [{ type: "created", actor: "system", detail: `total ${totalAmount}`, at: new Date().toISOString() }]
    };
    this.orders.set(order.id, order);
    return order;
  }

  release(id: string, code: string, approver: string, at = new Date()): PurchaseOrder {
    const order = this.get(id);
    if (order.status === "blocked") throw new Error("order is blocked by budget");
    if (order.status === "released") throw new Error("order is already fully released");
    if (!order.requiredCodes.includes(code)) throw new Error("release code is not required for this order");
    if (order.releases.some((release) => release.code === code)) throw new Error("release code already used");
    if (!approver.trim()) throw new Error("approver is required");

    order.releases.push({ code, approver: approver.trim(), at: at.toISOString() });
    order.status = order.requiredCodes.every((required) => order.releases.some((release) => release.code === required))
      ? "released"
      : "partially_released";
    order.audit.push({ type: "released", actor: approver.trim(), detail: code, at: at.toISOString() });
    return order;
  }

  setBudget(id: string, budgetAvailable: number, actor: string, at = new Date()): PurchaseOrder {
    const order = this.get(id);
    if (!Number.isFinite(budgetAvailable) || budgetAvailable < 0) throw new Error("budgetAvailable cannot be negative");
    order.budgetAvailable = budgetAvailable;
    order.status = budgetAvailable < order.totalAmount
      ? "blocked"
      : order.requiredCodes.every((required) => order.releases.some((release) => release.code === required))
        ? "released"
        : order.releases.length > 0
          ? "partially_released"
          : "draft";
    order.audit.push({ type: "budget_updated", actor: actor.trim() || "system", detail: String(budgetAvailable), at: at.toISOString() });
    return order;
  }

  get(id: string): PurchaseOrder {
    const order = this.orders.get(id);
    if (!order) throw new Error("purchase order not found");
    return order;
  }

  list(): PurchaseOrder[] {
    return [...this.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  remainingCodes(id: string): string[] {
    const order = this.get(id);
    return order.requiredCodes.filter((code) => !order.releases.some((release) => release.code === code));
  }
}
