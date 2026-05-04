const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

const { app } = require("../app");
const userModel = require("../models/userModel");
const dashboardModel = require("../models/dashboardModel");
const notifikasiModel = require("../models/notifikasiModel");
const tagihanModel = require("../models/tagihanModel");
const pembayaranModel = require("../models/pembayaranModel");
const tugasTeknisiModel = require("../models/tugasTeknisiModel");
const keluhanModel = require("../models/keluhanModel");
const accountService = require("../services/accountService");
const notificationService = require("../services/notificationService");
const billingService = require("../services/billingService");
const baseModel = require("../models/baseModel");
const { TASK_STATUS, BILL_STATUS, PAYMENT_STATUS } = require("../constants/statuses");

const TEST_PASSWORD_HASHES = {
  admin: "$2b$10$lWFzdy8z02V7i4Oetc4UTu3MR4IHvsaKeCkdJtEPvWfxLU/wV5VHe",
  pelanggan1: "$2b$10$VvdcCnyKUuWln.Gty.HqWeJ.xUexbTwV1m6I0rBG.uyi9MFba.s.K",
  teknisi1: "$2b$10$eefpaPAH8NVc9kIFQVR4HeRqJ93jP5SDgHcDC5r/u7VDBXhx1KSJm",
};

test.after(async () => {
  await baseModel.pool.end();
});

async function startTestServer() {
  const server = app.listen(0);
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

function createAgent(baseUrl) {
  const cookies = new Map();
  let csrfToken = null;

  function updateCookies(response) {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")]
          : [];

    setCookies.forEach((item) => {
      const [pair] = item.split(";");
      const [name, value] = pair.split("=");
      cookies.set(name, value);
    });
  }

  function cookieHeader() {
    return Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  return {
    async csrf() {
      if (csrfToken) {
        return csrfToken;
      }

      const response = await this.request("/login");
      const html = await response.text();
      const match = html.match(/name="_csrf" value="([^"]+)"/);
      assert.ok(match, "CSRF token should be rendered on login page");
      csrfToken = match[1];
      return csrfToken;
    },
    async request(path, options = {}) {
      const headers = new Headers(options.headers || {});
      const form =
        options.form && options.csrf !== false
          ? { _csrf: csrfToken, ...options.form }
          : options.form;
      const body = form ? new URLSearchParams(form).toString() : options.body;

      if (form) {
        headers.set("content-type", "application/x-www-form-urlencoded");
      }

      const cookieValue = cookieHeader();
      if (cookieValue) {
        headers.set("cookie", cookieValue);
      }

      const response = await fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        redirect: options.redirect || "manual",
        headers,
        body,
      });

      updateCookies(response);
      return response;
    },
  };
}

function stubMethod(target, methodName, replacement) {
  const original = target[methodName];
  target[methodName] = replacement;
  return () => {
    target[methodName] = original;
  };
}

test("HTTP flow: admin login then create pelanggan with automatic account and PSB notification", async () => {
  const server = await startTestServer();
  const agent = createAgent(server.baseUrl);
  const restores = [];

  try {
    restores.push(
      stubMethod(userModel, "findByUsername", async (username) => {
        if (username !== "admin") {
          return null;
        }
        return {
          id: 1,
          username: "admin",
          password: TEST_PASSWORD_HASHES.admin,
          role: "admin",
          admin_id: 10,
          nama_admin: "Administrator",
          email_admin: "admin@myringnet.id",
        };
      })
    );
    restores.push(stubMethod(notifikasiModel, "getLatest", async () => []));
    restores.push(stubMethod(accountService, "buildCustomerAccount", async () => ({
      username: "budi",
      password: "hashed-password",
      rawPassword: "Budi12345",
    })));

    const executedQueries = [];
    restores.push(
      stubMethod(baseModel.pool, "getConnection", async () => ({
        beginTransaction: async () => {},
        query: async (sql, payload) => {
          executedQueries.push({ sql, payload });
          if (String(sql).includes("INSERT INTO users")) {
            return [{ insertId: 20 }];
          }
          if (String(sql).includes("INSERT INTO pelanggan")) {
            return [{ insertId: 30 }];
          }
          return [{}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
      }))
    );

    const notifications = [];
    restores.push(
      stubMethod(notificationService, "createNotification", async (payload) => {
        notifications.push(payload);
      })
    );

    await agent.csrf();
    let response = await agent.request("/login", {
      method: "POST",
      form: { username: "admin", password: "admin123" },
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/dashboard");

    response = await agent.request("/pelanggan", {
      method: "POST",
      form: {
        nama: "Budi Santoso",
        no_hp: "081234567890",
        alamat: "Jl. Kenanga No. 10",
        id_paket: "1",
      },
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/pelanggan");
    assert.equal(executedQueries.length >= 2, true);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].role_tujuan, "teknisi");
    assert.equal(notifications[0].tipe, "psb");
  } finally {
    restores.reverse().forEach((restore) => restore());
    await server.close();
  }
});

test("HTTP flow: teknisi marks PSB task complete and triggers bill generation once", async () => {
  const server = await startTestServer();
  const agent = createAgent(server.baseUrl);
  const restores = [];

  try {
    restores.push(
      stubMethod(userModel, "findByUsername", async (username) => {
        if (username !== "teknisi1") {
          return null;
        }
        return {
          id: 2,
          username: "teknisi1",
          password: TEST_PASSWORD_HASHES.teknisi1,
          role: "teknisi",
          teknisi_id: 55,
          nama_teknisi: "Andi Teknisi",
          no_hp_teknisi: "081300000001",
          status_teknisi: "AKTIF",
        };
      })
    );
    restores.push(stubMethod(notifikasiModel, "getForTechnician", async () => ({ rows: [], pagination: {} })));
    restores.push(
      stubMethod(tugasTeknisiModel, "getById", async () => ({
        id: 88,
        id_pelanggan: 30,
        id_keluhan: null,
        id_teknisi: 55,
        tipe_tugas: "psb",
        status: TASK_STATUS.PENDING,
        detail_lokasi: "Jl. Kenanga No. 10",
      }))
    );

    const taskUpdates = [];
    restores.push(
      stubMethod(tugasTeknisiModel, "update", async (id, payload) => {
        taskUpdates.push({ id, payload });
        return 1;
      })
    );

    const generatedBills = [];
    restores.push(
      stubMethod(billingService, "generateBillAfterPsbCompletion", async (pelangganId) => {
        generatedBills.push(pelangganId);
        return { id: pelangganId };
      })
    );
    restores.push(stubMethod(notificationService, "createNotification", async () => {}));

    await agent.csrf();
    let response = await agent.request("/login", {
      method: "POST",
      form: { username: "teknisi1", password: "teknisi123" },
    });
    assert.equal(response.status, 302);

    response = await agent.request("/keluhan/tugas/88/status", {
      method: "POST",
      form: {
        status: TASK_STATUS.DONE,
        detail_lokasi: "Jl. Kenanga No. 10",
      },
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/keluhan");
    assert.equal(taskUpdates.length, 1);
    assert.equal(taskUpdates[0].payload.status, TASK_STATUS.DONE);
    assert.deepEqual(generatedBills, [30]);
  } finally {
    restores.reverse().forEach((restore) => restore());
    await server.close();
  }
});

test("HTTP flow: pelanggan prepares QRIS payment then confirms it", async () => {
  const server = await startTestServer();
  const agent = createAgent(server.baseUrl);
  const restores = [];

  try {
    restores.push(
      stubMethod(userModel, "findByUsername", async (username) => {
        if (username !== "pelanggan1") {
          return null;
        }
        return {
          id: 3,
          username: "pelanggan1",
          password: TEST_PASSWORD_HASHES.pelanggan1,
          role: "pelanggan",
          pelanggan_id: 40,
          nama_pelanggan: "Budi Santoso",
          alamat_pelanggan: "Jl. Kenanga No. 10",
          no_hp_pelanggan: "081234567890",
          paket_pelanggan: 1,
          tanggal_daftar_pelanggan: "2026-05-01",
        };
      })
    );
    restores.push(
      stubMethod(pembayaranModel, "getAll", async () => ({
        rows: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }))
    );
    restores.push(
      stubMethod(tagihanModel, "getAll", async () => ({
        rows: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      }))
    );
    restores.push(
      stubMethod(tagihanModel, "getById", async (id) => ({
        id: Number(id),
        id_pelanggan: 40,
        nama_pelanggan: "Budi Santoso",
        nama_paket: "Basic 20 Mbps",
        jumlah_tagihan: 250000,
      }))
    );
    restores.push(
      stubMethod(pembayaranModel, "getById", async (id) => ({
        id: Number(id),
        id_tagihan: 70,
        id_pelanggan: 40,
        metode: "qris",
        jumlah_bayar: 250000,
        va_number: null,
        status: PAYMENT_STATUS.PENDING,
      }))
    );

    const paymentUpdates = [];
    const billUpdates = [];
    restores.push(
      stubMethod(baseModel.pool, "getConnection", async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async (sql, payload) => {
          const statement = String(sql);
          if (statement.includes("SELECT tagihan.*")) {
            return [[{
              id: 70,
              id_pelanggan: 40,
              id_paket: 1,
              nama_pelanggan: "Budi Santoso",
              nama_paket: "Basic 20 Mbps",
              jumlah_tagihan: 250000,
              status_tagihan: BILL_STATUS.UNPAID,
            }]];
          }
          if (statement.includes("WHERE pembayaran.id_tagihan")) {
            return [[]];
          }
          if (statement.includes("INSERT INTO pembayaran")) {
            return [{ insertId: 501 }];
          }
          if (statement.includes("WHERE pembayaran.id =")) {
            return [[{
              id: 501,
              id_tagihan: 70,
              id_pelanggan: 40,
              metode: "qris",
              status: PAYMENT_STATUS.PENDING,
              status_pembayaran: PAYMENT_STATUS.PENDING,
              status_tagihan: BILL_STATUS.UNPAID,
            }]];
          }
          if (statement.includes("UPDATE pembayaran")) {
            paymentUpdates.push({ payload: payload[0], id: payload[1] });
            return [{ affectedRows: 1 }];
          }
          if (statement.includes("UPDATE tagihan")) {
            billUpdates.push({ payload: payload[0], id: payload[1] });
            return [{ affectedRows: 1 }];
          }
          return [{ insertId: 1, affectedRows: 1 }];
        },
      }))
    );
    restores.push(
      stubMethod(pembayaranModel, "update", async (id, payload) => {
        paymentUpdates.push({ id, payload });
        return 1;
      })
    );
    restores.push(
      stubMethod(tagihanModel, "update", async (id, payload) => {
        billUpdates.push({ id, payload });
        return 1;
      })
    );
    restores.push(stubMethod(notificationService, "createNotification", async () => {}));

    await agent.csrf();
    let response = await agent.request("/login", {
      method: "POST",
      form: { username: "pelanggan1", password: "pelanggan123" },
    });
    assert.equal(response.status, 302);

    response = await agent.request("/pembayaran/prepare", {
      method: "POST",
      form: {
        id_tagihan: "70",
        metode: "qris",
      },
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/pembayaran?payment_id=501");

    response = await agent.request("/pembayaran", {
      method: "POST",
      form: {
        payment_id: "501",
        metode: "qris",
      },
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/pembayaran");
    assert.equal(paymentUpdates.length, 1);
    assert.equal(paymentUpdates[0].payload.status, PAYMENT_STATUS.PAID);
    assert.equal(billUpdates.length, 1);
    assert.equal(billUpdates[0].payload.status_tagihan, BILL_STATUS.PAID);
  } finally {
    restores.reverse().forEach((restore) => restore());
    await server.close();
  }
});

test("HTTP flow: pelanggan creates complaint then admin assigns technician", async () => {
  const server = await startTestServer();
  const customerAgent = createAgent(server.baseUrl);
  const adminAgent = createAgent(server.baseUrl);
  const restores = [];

  try {
    restores.push(
      stubMethod(userModel, "findByUsername", async (username) => {
        if (username === "pelanggan1") {
          return {
            id: 3,
            username: "pelanggan1",
            password: TEST_PASSWORD_HASHES.pelanggan1,
            role: "pelanggan",
            pelanggan_id: 40,
            nama_pelanggan: "Budi Santoso",
            alamat_pelanggan: "Jl. Kenanga No. 10",
            no_hp_pelanggan: "081234567890",
            paket_pelanggan: 1,
            tanggal_daftar_pelanggan: "2026-05-01",
          };
        }

        if (username === "admin") {
          return {
            id: 1,
            username: "admin",
            password: TEST_PASSWORD_HASHES.admin,
            role: "admin",
            admin_id: 10,
            nama_admin: "Administrator",
            email_admin: "admin@myringnet.id",
          };
        }

        return null;
      })
    );
    restores.push(stubMethod(notifikasiModel, "getLatest", async () => []));

    const createdComplaints = [];
    restores.push(
      stubMethod(keluhanModel, "create", async (payload) => {
        createdComplaints.push(payload);
        return 71;
      })
    );

    const updatedComplaints = [];
    restores.push(
      stubMethod(keluhanModel, "update", async (id, payload) => {
        updatedComplaints.push({ id, payload });
        return 1;
      })
    );

    restores.push(
      stubMethod(keluhanModel, "getById", async (id) => ({
        id: Number(id),
        id_pelanggan: 40,
        nama_pelanggan: "Budi Santoso",
        deskripsi: "Internet sering putus",
      }))
    );

    const createdTasks = [];
    const assignmentQueries = [];
    restores.push(
      stubMethod(tugasTeknisiModel, "create", async (payload) => {
        createdTasks.push(payload);
        return 909;
      })
    );
    restores.push(
      stubMethod(baseModel.pool, "getConnection", async () => ({
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async (sql, payload) => {
          const statement = String(sql);
          assignmentQueries.push({ sql: statement, payload });
          if (statement.includes("SELECT keluhan.*")) {
            return [[{
              id: 71,
              id_pelanggan: 40,
              nama_pelanggan: "Budi Santoso",
              alamat_pelanggan: "Jl. Kenanga No. 10",
              status: "pending",
            }]];
          }
          if (statement.includes("INSERT INTO tugas_teknisi")) {
            createdTasks.push(payload);
            return [{ insertId: 909 }];
          }
          if (statement.includes("UPDATE keluhan")) {
            updatedComplaints.push({ id: payload[1], payload: payload[0] });
            return [{ affectedRows: 1 }];
          }
          return [{ insertId: 1, affectedRows: 1 }];
        },
      }))
    );

    const notifications = [];
    restores.push(
      stubMethod(notificationService, "createNotification", async (payload) => {
        notifications.push(payload);
      })
    );

    await customerAgent.csrf();
    let response = await customerAgent.request("/login", {
      method: "POST",
      form: { username: "pelanggan1", password: "pelanggan123" },
    });
    assert.equal(response.status, 302);

    response = await customerAgent.request("/keluhan", {
      method: "POST",
      form: {
        deskripsi: "Internet sering putus",
        tanggal: "2026-05-01",
      },
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/keluhan");
    assert.equal(createdComplaints.length, 1);
    assert.equal(createdComplaints[0].id_pelanggan, 40);

    await adminAgent.csrf();
    response = await adminAgent.request("/login", {
      method: "POST",
      form: { username: "admin", password: "admin123" },
    });
    assert.equal(response.status, 302);

    response = await adminAgent.request("/keluhan/assign", {
      method: "POST",
      form: {
        id_keluhan: "71",
        id_teknisi: "55",
        detail_lokasi: "Jl. Kenanga No. 10",
      },
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/keluhan");
    assert.equal(createdTasks.length, 1);
    assert.equal(createdTasks[0].tipe_tugas, "maintenance");
    assert.equal(updatedComplaints.length, 1);
    assert.equal(updatedComplaints[0].payload.status, "proses");
    assert.equal(notifications.length, 1);
    assert.equal(typeof notifications[0], "string");
    assert.equal(
      assignmentQueries.filter((item) => item.sql.includes("INSERT INTO notifikasi")).length,
      2
    );
  } finally {
    restores.reverse().forEach((restore) => restore());
    await server.close();
  }
});
