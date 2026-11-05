import { buildApp } from "./app.js";
import { ReleaseService } from "./release.js";

const service = new ReleaseService();
service.create({ supplier: "Kōwhai Components", companyCode: "1000", currency: "NZD", netAmount: 8_000, budgetAvailable: 50_000 });
const draft = service.create({ supplier: "Southern Steel", companyCode: "1000", currency: "NZD", netAmount: 12_000, budgetAvailable: 50_000 });
const partial = service.create({ supplier: "Pacific Packaging", companyCode: "2000", currency: "NZD", netAmount: 100_000, budgetAvailable: 200_000 });
service.release(partial.id, "A", "release.manager");
service.create({ supplier: "Atlas Industrial", companyCode: "3000", currency: "NZD", netAmount: 300_000, budgetAvailable: 200_000 });
void draft;

const app = buildApp(service);
const port = Number(process.env.PORT ?? 8096);
await app.listen({ host: "0.0.0.0", port });
console.log(`centrix-sap-release-workflow listening on :${port}`);
