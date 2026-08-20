export type BuildPlatform = "web" | "android";
export type BuildMode = "development" | "production";
export type BuildFormat = "web" | "apk" | "aab";
export type BuildType = "debug" | "release";

export interface BuildIssueDto {
  severity: "error" | "warning";
  code: string;
  message: string;
}

export interface BuildArtifactDto {
  type: "web" | "apk" | "aab";
  /** Project-relative path (used for reveal). */
  path: string;
  /** Absolute filesystem path for display / copy. */
  absolutePath: string;
}

export interface BuildProgressEventDto {
  stage: string;
  message: string;
  progress?: number;
}

export interface BuildResultDto {
  ok: boolean;
  artifacts: BuildArtifactDto[];
  issues: BuildIssueDto[];
  logPath?: string;
  logAbsolutePath?: string;
}

export interface BuildRequestDto {
  platform: BuildPlatform;
  mode?: BuildMode;
  format?: BuildFormat;
  buildType?: BuildType;
}

export interface BuildApiClient {
  build(
    request: BuildRequestDto,
    onProgress?: (event: BuildProgressEventDto) => void,
  ): Promise<BuildResultDto>;
  reveal(projectRelativePath: string): Promise<void>;
  getAndroidSecretsStatus(): Promise<{ configured: boolean }>;
  saveAndroidSecrets(secrets: {
    keystorePassword: string;
    keyPassword: string;
  }): Promise<void>;
  generateAndroidKeystore(): Promise<{
    keystorePath: string;
    keyAlias: string;
    created: boolean;
  }>;
}

export function createFetchBuildApiClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): BuildApiClient {
  const root = baseUrl.replace(/\/$/, "");

  return {
    async build(request, onProgress) {
      const response = await fetchImpl(`${root}/build`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message ?? `Build failed (${String(response.status)})`,
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: BuildResultDto | undefined;

      const consumeLine = (line: string): void => {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
          return;
        }
        const parsed = JSON.parse(trimmed) as {
          type?: string;
          stage?: string;
          message?: string;
          progress?: number;
          ok?: boolean;
          artifacts?: BuildArtifactDto[];
          issues?: BuildIssueDto[];
          logPath?: string;
          logAbsolutePath?: string;
        };
        if (parsed.type === "progress" && parsed.stage && parsed.message) {
          onProgress?.({
            stage: parsed.stage,
            message: parsed.message,
            ...(parsed.progress !== undefined
              ? { progress: parsed.progress }
              : {}),
          });
          return;
        }
        if (parsed.type === "result") {
          finalResult = {
            ok: Boolean(parsed.ok),
            artifacts: (parsed.artifacts ?? []).map((artifact) => ({
              type: artifact.type,
              path: artifact.path,
              absolutePath: artifact.absolutePath ?? artifact.path,
            })),
            issues: parsed.issues ?? [],
            ...(parsed.logPath !== undefined
              ? { logPath: parsed.logPath }
              : {}),
            ...(parsed.logAbsolutePath !== undefined
              ? { logAbsolutePath: parsed.logAbsolutePath }
              : {}),
          };
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          consumeLine(line);
        }
      }
      if (buffer.trim().length > 0) {
        consumeLine(buffer);
      }

      if (!finalResult) {
        throw new Error("Build stream ended without a result");
      }
      return finalResult;
    },

    async reveal(projectRelativePath) {
      const response = await fetchImpl(`${root}/build/reveal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: projectRelativePath }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ?? `Reveal failed (${String(response.status)})`,
        );
      }
    },

    async getAndroidSecretsStatus() {
      const response = await fetchImpl(`${root}/project/android-secrets`);
      const payload = (await response.json()) as {
        ok?: boolean;
        configured?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ??
            `Secrets status failed (${String(response.status)})`,
        );
      }
      return { configured: Boolean(payload.configured) };
    },

    async saveAndroidSecrets(secrets) {
      const response = await fetchImpl(`${root}/project/android-secrets`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(secrets),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ?? `Save secrets failed (${String(response.status)})`,
        );
      }
    },

    async generateAndroidKeystore() {
      const response = await fetchImpl(`${root}/project/android-keystore`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        keystorePath?: string;
        keyAlias?: string;
        created?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok || !payload.keystorePath || !payload.keyAlias) {
        throw new Error(
          payload.message ??
            `Generate keystore failed (${String(response.status)})`,
        );
      }
      return {
        keystorePath: payload.keystorePath,
        keyAlias: payload.keyAlias,
        created: Boolean(payload.created),
      };
    },
  };
}
