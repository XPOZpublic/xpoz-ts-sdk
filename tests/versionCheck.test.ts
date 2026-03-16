import { describe, it, expect, vi, beforeEach } from "vitest";
import { isNewerVersion } from "../src/versionCheck.js";

describe("isNewerVersion", () => {
  it("returns true when latest major is higher", () => {
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(true);
  });

  it("returns true when latest minor is higher", () => {
    expect(isNewerVersion("1.1.0", "1.0.0")).toBe(true);
  });

  it("returns true when latest patch is higher", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns false when current is newer", () => {
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(false);
  });

  it("returns false when current minor is higher", () => {
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
  });

  it("returns false when current patch is higher", () => {
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
  });

  it("handles higher major but lower minor", () => {
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("handles higher minor but lower patch", () => {
    expect(isNewerVersion("1.2.0", "1.1.9")).toBe(true);
  });
});

describe("checkForUpdates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("warns when a newer version is available", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: "99.0.0" }), { status: 200 })
    );

    // Re-import to reset the hasWarned flag
    vi.resetModules();
    const { checkForUpdates } = await import("../src/versionCheck.js");
    await checkForUpdates();

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("newer version");
    expect(warnSpy.mock.calls[0]?.[0]).toContain("99.0.0");
  });

  it("does not warn when version is current", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.resetModules();
    const { VERSION } = await import("../src/version.js");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ version: VERSION }), { status: 200 })
    );

    const { checkForUpdates } = await import("../src/versionCheck.js");
    await checkForUpdates();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn on network error", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

    vi.resetModules();
    const { checkForUpdates } = await import("../src/versionCheck.js");
    await checkForUpdates();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn on non-200 response", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 })
    );

    vi.resetModules();
    const { checkForUpdates } = await import("../src/versionCheck.js");
    await checkForUpdates();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
