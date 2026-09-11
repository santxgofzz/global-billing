import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, formatCOP, formatDate } from "@/lib/api";

afterEach(() => vi.unstubAllGlobals());

describe("formatos regionales", () => {
  it("formatea pesos COP sin decimales", () => {
    const output = formatCOP(1_250_000);
    expect(output).toContain("1.250.000");
    expect(output).not.toContain(",00");
  });

  it("interpreta fechas en America/Bogota", () => {
    expect(formatDate("2026-09-06T02:00:00Z")).toMatch(/05.*sept.*2026/i);
  });

  it("traduce fallos de red a un mensaje humano", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiFetch("/api/v1/dashboard/")).rejects.toThrow("No pudimos conectar con el servidor");
  });
});
