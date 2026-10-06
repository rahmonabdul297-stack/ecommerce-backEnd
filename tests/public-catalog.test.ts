import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import cookieParser from "cookie-parser";
import express from "express";

process.env.JWT_USER_SECRET = "public-catalog-test-secret";
process.env.CLOUD_NAME = "test-cloud";
process.env.CLOUD_API_KEY = "test-key";
process.env.CLOUD_API_SECRET = "test-secret";

let server: Server;
let baseUrl: string;
let Product: any;
let Category: any;

before(async () => {
  const [publicRoutes, adminRoutes, productModel, categoryModel] =
    await Promise.all([
      import("../src/routes/public/public-routes.ts"),
      import("../src/routes/admin/admin-routes.ts"),
      import("../src/models/products.ts"),
      import("../src/models/category.ts"),
    ]);
  Product = productModel.Product;
  Category = categoryModel.Category;

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/v1", publicRoutes.default);
  app.use("/api/v1/admin", adminRoutes.default);

  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

const replaceStatic = (
  model: any,
  name: string,
  replacement: (...args: any[]) => any,
) => {
  const original = model[name];
  model[name] = replacement;
  return () => {
    model[name] = original;
  };
};

test("unauthenticated product list returns only published catalog fields", async () => {
  let queryFilter: unknown;
  let selectedFields = "";
  const product = {
    _id: "507f1f77bcf86cd799439011",
    title: "Published item",
    slug: "published-item",
    category: { name: "Active category", slug: "active-category" },
  };
  const restore = replaceStatic(Product, "find", (filter) => {
    queryFilter = filter;
    let query: any;
    query = {
      select(fields: string) {
        selectedFields = fields;
        return query;
      },
      populate() {
        return query;
      },
      sort() {
        return query;
      },
      async lean() {
        return [product];
      },
    };
    return query;
  });

  try {
    const response = await fetch(`${baseUrl}/api/v1/products`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(queryFilter, { isPublished: true });
    assert.match(selectedFields, /title slug description price/);
    assert.doesNotMatch(selectedFields, /password|isPublished|admin/i);
    assert.deepEqual(body.data, { count: 1, products: [product] });
  } finally {
    restore();
  }
});

test("product detail rejects unpublished products with 404", async () => {
  let queryFilter: unknown;
  const restore = replaceStatic(Product, "findOne", (filter) => {
    queryFilter = filter;
    let query: any;
    query = {
      select() {
        return query;
      },
      populate() {
        return query;
      },
      async lean() {
        return null;
      },
    };
    return query;
  });

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/products/not-published-yet`,
    );
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(queryFilter, {
      slug: "not-published-yet",
      isPublished: true,
    });
    assert.equal(body.success, false);
  } finally {
    restore();
  }
});

test("unauthenticated category list returns active categories", async () => {
  let queryFilter: unknown;
  let selectedFields = "";
  const category = { name: "Active", slug: "active" };
  const restore = replaceStatic(Category, "find", (filter) => {
    queryFilter = filter;
    let query: any;
    query = {
      select(fields: string) {
        selectedFields = fields;
        return query;
      },
      sort() {
        return query;
      },
      async lean() {
        return [category];
      },
    };
    return query;
  });

  try {
    const response = await fetch(`${baseUrl}/api/v1/categories`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(queryFilter, { isActive: true });
    assert.match(selectedFields, /name slug/);
    assert.deepEqual(body.data, { count: 1, categories: [category] });
  } finally {
    restore();
  }
});

test("admin product endpoints still reject unauthenticated requests", async () => {
  const response = await fetch(`${baseUrl}/api/v1/admin/products`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});
