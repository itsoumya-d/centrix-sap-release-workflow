import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { releaseCodesFor, ReleaseService } from "../src/release.js";

function order(netAmount: number, budgetAvailable = 1_000_000) {
  return {
    supplier: "Kōwhai Components",
    companyCode: "1000",
    currency: "NZD",
    netAmount,
    budgetAvailable
  };
}

describe("SAP purchase-order release strategy", () => {
  it("calculates tax-inclusive total", () => {
    const service = new ReleaseService();
    const po = service.create(order(8_000));
    expect(po.taxAmount).toBe(1_200);
    expect(po.totalAmount).toBe(9_200);
  });

  it("requires no release below the first threshold", () => {
    const service = new ReleaseService();
    const po = service.create(order(8_000));
    expect(po.requiredCodes).toEqual([]);
    expect(po.status).toBe("released");
  });

  it("uses no codes at exactly 10,000 total", () => {
    expect(releaseCodesFor(10_000)).toEqual([]);
  });

  it("requires A above 10,000", () => {
    expect(releaseCodesFor(10_001)).toEqual(["A"]);
  });

  it("requires A at exactly 50,000", () => {
    expect(releaseCodesFor(50_000)).toEqual(["A"]);
  });

  it("requires A and B above 50,000", () => {
    expect(releaseCodesFor(50_001)).toEqual(["A", "B"]);
  });

  it("requires A and B at exactly 250,000", () => {
    expect(releaseCodesFor(250_000)).toEqual(["A", "B"]);
  });

  it("requires A, B and C above 250,000", () => {
    expect(releaseCodesFor(250_001)).toEqual(["A", "B", "C"]);
  });

  it("blocks an order over budget", () => {
    const service = new ReleaseService();
    const po = service.create(order(300_000, 200_000));
    expect(po.status).toBe("blocked");
    expect(() => service.release(po.id, "A", "release.manager")).toThrow("blocked by budget");
  });

  it("partially releases after the first code", () => {
    const service = new ReleaseService();
    const po = service.create(order(100_000));
    const released = service.release(po.id, "A", "release.manager");
    expect(released.status).toBe("partially_released");
    expect(service.remainingCodes(po.id)).toEqual(["B"]);
  });

  it("fully releases when every required code is approved", () => {
    const service = new ReleaseService();
    const po = service.create(order(100_000));
    service.release(po.id, "A", "release.manager");
    const released = service.release(po.id, "B", "finance.manager");
    expect(released.status).toBe("released");
  });

  it("rejects a code that is not required", () => {
    const service = new ReleaseService();
    const po = service.create(order(100_000));
    expect(() => service.release(po.id, "C", "release.manager")).toThrow("not required");
  });

  it("rejects a duplicate release code", () => {
    const service = new ReleaseService();
    const po = service.create(order(100_000));
    service.release(po.id, "A", "release.manager");
    expect(() => service.release(po.id, "A", "another.manager")).toThrow("already used");
  });

  it("rejects releasing an already fully released order", () => {
    const service = new ReleaseService();
    const po = service.create(order(8_000));
    expect(() => service.release(po.id, "A", "release.manager")).toThrow("already fully released");
  });

  it("requires an approver", () => {
    const service = new ReleaseService();
    const po = service.create(order(100_000));
    expect(() => service.release(po.id, "A", " ")).toThrow("approver is required");
  });

  it("rejects an unknown order", () => {
    const service = new ReleaseService();
    expect(() => service.get("missing")).toThrow("not found");
  });

  it("rounds tax to the nearest cent", () => {
    const service = new ReleaseService();
    const po = service.create(order(1_001));
    expect(po.taxAmount).toBe(150);
    expect(po.totalAmount).toBe(1_151);
  });

  it("raises the budget and unblocks the order", () => {
    const service = new ReleaseService();
    const po = service.create(order(300_000, 200_000));
    const updated = service.setBudget(po.id, 400_000, "finance.manager");
    expect(updated.status).toBe("draft");
    expect(service.remainingCodes(po.id)).toEqual(["A", "B", "C"]);
  });

  it("records an audit trail", () => {
    const service = new ReleaseService();
    const po = service.create(order(100_000));
    service.release(po.id, "A", "release.manager");
    expect(po.audit.map((event) => event.type)).toEqual(["created", "released"]);
  });

  it("lists purchase orders", () => {
    const service = new ReleaseService();
    service.create(order(8_000));
    service.create(order(100_000));
    expect(service.list()).toHaveLength(2);
  });

  it("serves create/list/get/release and the dashboard", async () => {
    const service = new ReleaseService();
    const app = buildApp(service);
    const created = await app.inject({
      method: "POST",
      url: "/api/orders",
      payload: order(100_000)
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    expect((await app.inject({ method: "GET", url: "/api/orders" })).json()).toHaveLength(1);
    expect((await app.inject({ method: "GET", url: `/api/orders/${id}` })).json().remainingCodes).toEqual(["A", "B"]);
    const released = await app.inject({ method: "POST", url: `/api/orders/${id}/release`, payload: { code: "A", approver: "release.manager" } });
    expect(released.json().status).toBe("partially_released");
    const dashboard = await app.inject({ method: "GET", url: "/" });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.body).toContain("Purchase Order Release Workflow");
    expect(dashboard.body).toContain("#FCAF17");
  });
});
