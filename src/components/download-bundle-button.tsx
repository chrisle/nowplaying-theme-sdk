import { useCallback, useState } from "react";

/** Dev-server endpoint that builds the bundle and streams it back. */
const DOWNLOAD_ENDPOINT = "/__np3theme/download";

/**
 * Builds the `.np3theme` bundle (the same build `npm run build` runs) and
 * downloads it in the browser, so a theme can go from the playground to the
 * Now Playing dashboard without touching the terminal.
 *
 * Only works under `npm run dev` — the endpoint lives in the Vite dev server.
 */
export function DownloadBundleButton() {
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch(DOWNLOAD_ENDPOINT);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Build failed (HTTP ${res.status})`);
      }

      // Prefer the filename the build chose (derived from bundle.config.json).
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const fileName =
        /filename="([^"]+)"/.exec(disposition)?.[1] ?? "themes.np3theme";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={building}
        title="Build every theme in bundle.config.json and download the .np3theme"
        className="px-4 py-2 bg-emerald-500 text-black font-medium rounded hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {building ? "Building…" : "Download .np3theme"}
      </button>
      {error && (
        <span
          className="text-red-400 text-xs max-w-[320px] truncate"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
