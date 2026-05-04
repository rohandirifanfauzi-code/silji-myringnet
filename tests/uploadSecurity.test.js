const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const upload = require("../config/multer");

function runUpload(req) {
  return new Promise((resolve) => {
    upload.single("foto_bukti")(req, {}, (error) => resolve(error || null));
  });
}

test("upload rejects non-image evidence files", async () => {
  const boundary = "----silji-test";
  const body = Buffer.from(
    [
      `--${boundary}`,
      'Content-Disposition: form-data; name="foto_bukti"; filename="payload.txt"',
      "Content-Type: text/plain",
      "",
      "not an image",
      `--${boundary}--`,
      "",
    ].join("\r\n")
  );

  const req = Readable.from(body);
  req.headers = {
    "content-type": `multipart/form-data; boundary=${boundary}`,
    "content-length": String(body.length),
  };
  req.method = "POST";

  const error = await runUpload(req);

  assert.equal(error?.message, "File bukti harus berupa gambar JPG atau PNG.");
});
