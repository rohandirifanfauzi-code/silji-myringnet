require("../config/loadEnv");

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const backupDir = path.join(__dirname, "..", "backups");
fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(backupDir, `myringnet-${timestamp}.sql`);
const output = fs.createWriteStream(outputPath);

const args = [
  "-h",
  process.env.DB_HOST || "localhost",
  "-u",
  process.env.DB_USER || "root",
  `--password=${process.env.DB_PASSWORD || ""}`,
  process.env.DB_NAME || "myringnet",
];

const dump = spawn("mysqldump", args, { stdio: ["ignore", "pipe", "inherit"] });
dump.stdout.pipe(output);

dump.on("close", (code) => {
  if (code !== 0) {
    console.error("Backup database gagal.");
    process.exit(code);
  }
  console.log(`Backup database tersimpan: ${outputPath}`);
});
