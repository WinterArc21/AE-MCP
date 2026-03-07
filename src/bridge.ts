import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const COMMANDS_DIR_NAME = "ae-mcp-commands";
const CONFIG_FILE_NAME = "ae-mcp-commands-dir.txt";
const POLL_INTERVAL = 100;
const COMMAND_TIMEOUT = 60000;

function getConfigFilePath(): string {
  return path.join(os.homedir(), "Documents", CONFIG_FILE_NAME);
}

function resolveCommandsDir(): string {
  // 1. Primary: AE_MCP_COMMANDS_DIR (explicit user override)
  const envOverride = process.env.AE_MCP_COMMANDS_DIR;
  if (envOverride && envOverride.trim().length > 0) {
    const resolved = path.resolve(envOverride.trim());
    try {
      fs.writeFileSync(getConfigFilePath(), resolved, "utf-8");
    } catch {
      /* ignore — config write is best-effort for CEP sync */
    }
    return resolved;
  }
  // 2. Fallback: config file (so CEP panel can share the same override)
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8").trim();
      if (content.length > 0) return path.resolve(content);
    }
  } catch {
    /* ignore */
  }
  // 3. Default: platform Documents folder
  return path.join(os.homedir(), "Documents", COMMANDS_DIR_NAME);
}

interface PendingCommand {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  commandFile: string;
}

interface CommandPayload {
  id: string;
  script: string;
}

interface ResponseResult {
  success: boolean;
  data?: unknown;
  error?: { message: string; code?: string; line?: number };
}

interface ResponsePayload {
  id: string;
  result: ResponseResult;
}

export class AEBridge {
  private readonly _commandsDir: string;
  private readonly _clientPrefix: string;
  private readonly _pendingCommands = new Map<string, PendingCommand>();
  private _pollTimer: ReturnType<typeof setInterval> | null = null;
  private _isShuttingDown = false;

  constructor() {
    this._commandsDir = resolveCommandsDir();
    this._clientPrefix = `aemcp_${process.pid}_${Date.now().toString(36)}`;
    this.ensureCommandsDir();
    this.cleanStaleFiles();
    this.startPolling();
    const cleanup = () => this.cleanup();
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", cleanup);
  }

  get commandsDirectory(): string { return this._commandsDir; }
  get prefix(): string { return this._clientPrefix; }
  get pendingCount(): number { return this._pendingCommands.size; }

  private ensureCommandsDir(): void {
    try {
      if (!fs.existsSync(this._commandsDir)) {
        fs.mkdirSync(this._commandsDir, { recursive: true });
      }
    } catch (err) {
      process.stderr.write("[ae-mcp] Warning: could not create commands directory: " + err + "\n");
    }
  }

  private cleanStaleFiles(): void {
    try {
      if (!fs.existsSync(this._commandsDir)) return;
      const files = fs.readdirSync(this._commandsDir);
      for (const file of files) {
        if (file.startsWith(this._clientPrefix)) {
          try { fs.unlinkSync(path.join(this._commandsDir, file)); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }

  private startPolling(): void {
    this._pollTimer = setInterval(() => {
      if (!this._isShuttingDown) this.checkResponses();
    }, POLL_INTERVAL);
    if (this._pollTimer.unref) this._pollTimer.unref();
  }

  private checkResponses(): void {
    let files: string[];
    try { files = fs.readdirSync(this._commandsDir); } catch { return; }
    const responseFiles = files.filter(
      (f) => f.startsWith(this._clientPrefix) && f.endsWith(".json.response")
    );
    for (const fn of responseFiles) {
      this.processResponseFile(path.join(this._commandsDir, fn));
    }
  }

  private processResponseFile(responsePath: string): void {
    let content: string;
    try { content = fs.readFileSync(responsePath, "utf-8"); } catch { return; }
    const trimmed = content.trim();
    if (!trimmed || !trimmed.endsWith("}")) return;
    let response: ResponsePayload;
    try { response = JSON.parse(trimmed) as ResponsePayload; } catch { return; }
    if (!response.id || response.result === undefined) {
      this.safeDelete(responsePath);
      return;
    }
    const pending = this._pendingCommands.get(response.id);
    if (!pending) { this.safeDelete(responsePath); return; }
    clearTimeout(pending.timeout);
    this._pendingCommands.delete(response.id);
    this.safeDelete(responsePath);
    this.safeDelete(responsePath.replace(/\.json\.response$/, ".json.processed"));
    this.safeDelete(responsePath.replace(/\.json\.response$/, ".json"));
    if (response.result.success === false) {
      const msg = response.result.error?.message ?? "Unknown error from After Effects";
      const code = response.result.error?.code ?? "AE_ERROR";
      pending.reject(new Error("[" + code + "] " + msg));
    } else {
      pending.resolve(response.result.data ?? response.result);
    }
  }

  async executeScript(script: string, toolName: string): Promise<unknown> {
    if (this._isShuttingDown) throw new Error("AEBridge is shutting down");
    this.ensureCommandsDir();
    const randomSuffix = Math.random().toString(36).slice(2, 9);
    const id = `${this._clientPrefix}_${toolName}_${Date.now()}_${randomSuffix}`;
    const commandFile = path.join(this._commandsDir, `${id}.json`);
    const payload: CommandPayload = { id, script };
    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._pendingCommands.delete(id);
        const processedFile = commandFile + ".processed";
        const responseFile = commandFile + ".response";
        const wasProcessed = fs.existsSync(processedFile) || fs.existsSync(responseFile);
        const hint = wasProcessed
          ? "After Effects processed the command but no response was written."
          : "After Effects did not pick up the command — is the AE MCP Bridge panel open?";
        this.safeDelete(commandFile);
        this.safeDelete(processedFile);
        this.safeDelete(responseFile);
        reject(new Error(`[TIMEOUT] Tool "${toolName}" timed out after ${COMMAND_TIMEOUT / 1000}s. ${hint}`));
      }, COMMAND_TIMEOUT);
      this._pendingCommands.set(id, { resolve, reject, timeout, commandFile });
      try {
        fs.writeFileSync(commandFile, JSON.stringify(payload, null, 2), { encoding: "utf-8", flag: "w" });
      } catch (writeErr) {
        clearTimeout(timeout);
        this._pendingCommands.delete(id);
        reject(new Error("[BRIDGE_WRITE_ERROR] Could not write command file: " + writeErr));
      }
    });
  }

  cleanup(): void {
    if (this._isShuttingDown) return;
    this._isShuttingDown = true;
    if (this._pollTimer !== null) { clearInterval(this._pollTimer); this._pollTimer = null; }
    for (const [, cmd] of this._pendingCommands) {
      clearTimeout(cmd.timeout);
      this.safeDelete(cmd.commandFile);
      cmd.reject(new Error("[BRIDGE_SHUTDOWN] AE bridge shutting down"));
    }
    this._pendingCommands.clear();
  }

  private safeDelete(filePath: string): void {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

export const bridge = new AEBridge();
