import Fastify, { FastifyInstance } from "fastify";
import { dashboardPage } from "./dashboard.js";
import { CreateOrderInput, ReleaseService } from "./release.js";

export function buildApp(service: ReleaseService): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/", async (_request, reply) => reply.type("text/html").send(dashboardPage()));

  app.post("/api/orders", async (request, reply) => {
    try {
      return reply.code(201).send(service.create(request.body as CreateOrderInput));
    } catch (error) {
      return reply.code(422).send({ error: (error as Error).message });
    }
  });

  app.get("/api/orders", async () => service.list());

  app.get("/api/orders/:id", async (request, reply) => {
    try {
      const order = service.get((request.params as { id: string }).id);
      return { ...order, remainingCodes: service.remainingCodes(order.id) };
    } catch (error) {
      return reply.code(404).send({ error: (error as Error).message });
    }
  });

  app.post("/api/orders/:id/release", async (request, reply) => {
    try {
      const body = request.body as { code: string; approver: string };
      return service.release((request.params as { id: string }).id, body.code, body.approver);
    } catch (error) {
      return reply.code(422).send({ error: (error as Error).message });
    }
  });

  app.patch("/api/orders/:id/budget", async (request, reply) => {
    try {
      const body = request.body as { budgetAvailable: number; actor: string };
      return service.setBudget((request.params as { id: string }).id, body.budgetAvailable, body.actor);
    } catch (error) {
      return reply.code(422).send({ error: (error as Error).message });
    }
  });

  return app;
}
