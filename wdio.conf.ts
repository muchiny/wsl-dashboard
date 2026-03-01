import { spawn, type ChildProcess } from "child_process";
import { platform } from "os";
import { join } from "path";

const isWindows = platform() === "win32";
const binaryExt = isWindows ? ".exe" : "";
const tauriDriverBin = isWindows ? "tauri-driver.exe" : "tauri-driver";
const appBinary = join("src-tauri", "target", "debug", `wsl-nexus${binaryExt}`);

let tauriDriver: ChildProcess;

export const config: WebdriverIO.Config = {
  hostname: "127.0.0.1",
  port: 4444,

  specs: ["./e2e-wdio/specs/**/*.ts"],
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  runner: "local",

  capabilities: [
    {
      "tauri:options": {
        application: appBinary,
      },
    } as WebdriverIO.Capabilities,
  ],

  mochaOpts: {
    ui: "bdd",
    timeout: 60_000,
  },

  outputDir: "./e2e-wdio/results",

  beforeSession() {
    tauriDriver = spawn(tauriDriverBin, ["--port", "4444"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    tauriDriver.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[tauri-driver] ${msg}`);
    });

    // Give tauri-driver time to start
    return new Promise<void>((resolve) => setTimeout(resolve, 2000));
  },

  afterSession() {
    if (tauriDriver) {
      tauriDriver.kill();
    }
  },
};
