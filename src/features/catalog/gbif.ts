import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogPlant, ExternalTaxonReference } from "./types";

export const GBIF_API = "https://api.gbif.org/v1";
export const LANG_LABELS: Record<string, string> = {
  rus: "Русский", eng: "English", deu: "Deutsch", fra: "Français", spa: "Español",
  ita: "Italiano", por: "Português", nld: "Nederlands", pol: "Polski", zho: "中文", jpn: "日本語",
};
const PAGE_SIZE = 24;
const SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000;

export interface GbifSearchResult {
  key: number; scientificName?: string; canonicalName?: string; vernacularName?: string;
  kingdom?: string; family?: string; genus?: string; rank?: string; status?: string;
}
export interface GbifMatch {
  usageKey: number; scientificName: string; canonicalName: string; kingdom: string; phylum: string;
  class: string; order: string; family: string; genus: string; confidence: number; matchType: string; status: string;
}
export interface GbifVernacular { vernacularName: string; language: string; source?: string }
export interface GbifOccurrenceMedia { identifier: string; title?: string; creator?: string; rightsHolder?: string }
export interface GbifData { match: GbifMatch; vernacularNames: GbifVernacular[]; photos: GbifOccurrenceMedia[] }
interface SearchPage { results: GbifSearchResult[]; endOfRecords: boolean; count: number }
interface CachedPage { savedAt: number; value: SearchPage }

export function toExternalTaxon(result: CatalogPlant): ExternalTaxonReference | undefined {
  if (result.source !== "gbif" || !result.gbifKey) return undefined;
  return {
    provider: "gbif", taxonKey: result.gbifKey, scientificName: result.latinName,
    canonicalName: result.latinName, rank: result.gbifRank,
    status: result.gbifStatus,
    fetchedAt: new Date().toISOString(),
  };
}

export function gbifResultToCatalogPlant(result: GbifSearchResult): CatalogPlant {
  const latinName = result.canonicalName || result.scientificName || "Неизвестный вид";
  return {
    id: `gbif-${result.key}`, name: result.vernacularName || latinName, latinName, emoji: "🌿", unsplashId: "",
    difficulty: "medium", watering: { summer: 7, winter: 14 }, tropical: false, needsMisting: false,
    description: `Запись глобального научного справочника GBIF${result.family ? ` · семейство ${result.family}` : ""}.`,
    careTip: "Для вида пока нет проверенной инструкции по уходу. Установите интервал вручную с учётом грунта, освещения, температуры и сезона.",
    diseases: [], seasonalTips: [],
    tags: ["GBIF", result.rank?.toLocaleLowerCase("ru-RU") || "таксон", ...(result.status === "ACCEPTED" ? ["принятое название"] : [])],
    source: "gbif", gbifKey: result.key, gbifRank: result.rank, gbifStatus: result.status,
  };
}

function readCache(key: string): SearchPage | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null") as CachedPage | null;
    return cached && Date.now() - cached.savedAt < SEARCH_CACHE_TTL ? cached.value : null;
  } catch { return null; }
}
function writeCache(key: string, value: SearchPage) {
  try { sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value })); } catch { /* cache is optional */ }
}

async function fetchSearchPage(query: string, offset: number, signal: AbortSignal): Promise<SearchPage> {
  const cacheKey = `plantcare:gbif:${query.toLocaleLowerCase()}:${offset}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const params = new URLSearchParams({ q: query, highertaxon_key: "6", limit: String(PAGE_SIZE), offset: String(offset) });
  const response = await fetch(`${GBIF_API}/species/search?${params}`, { signal });
  if (!response.ok) throw new Error("GBIF search failed");
  const payload = await response.json() as { results?: GbifSearchResult[]; endOfRecords?: boolean; count?: number };
  const value = { results: (payload.results ?? []).filter(item => item.key && item.kingdom === "Plantae"), endOfRecords: Boolean(payload.endOfRecords), count: payload.count ?? 0 };
  writeCache(cacheKey, value);
  return value;
}

export function useGbifSearch(query: string) {
  const [results, setResults] = useState<CatalogPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (reset: boolean) => {
    const normalized = query.trim();
    if (normalized.length < 3 || loading) return;
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    const offset = reset ? 0 : offsetRef.current;
    setLoading(true); setError(false);
    try {
      const page = await fetchSearchPage(normalized, offset, controller.signal);
      const mapped = page.results.map(gbifResultToCatalogPlant);
      setResults(previous => {
        const combined = reset ? mapped : [...previous, ...mapped];
        return [...new Map(combined.map(item => [item.id, item])).values()];
      });
      offsetRef.current = offset + PAGE_SIZE;
      setHasMore(!page.endOfRecords && offsetRef.current < page.count);
      setTotal(page.count);
    } catch (requestError) {
      if ((requestError as Error).name !== "AbortError") setError(true);
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [query, loading]);

  useEffect(() => {
    const normalized = query.trim();
    controllerRef.current?.abort(); offsetRef.current = 0;
    if (normalized.length < 3) { setResults([]); setHasMore(false); setTotal(0); setError(false); return; }
    const timer = window.setTimeout(() => void load(true), 450);
    return () => { window.clearTimeout(timer); controllerRef.current?.abort(); };
  // load changes with loading; only query should restart the search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return { results, loading, error, hasMore, total, loadMore: () => load(false) };
}

export function useGbif(latinName: string) {
  const [data, setData] = useState<GbifData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setLoading(true); setError(false);
    async function fetchAll() {
      try {
        const matchRes = await fetch(`${GBIF_API}/species/match?name=${encodeURIComponent(latinName)}&verbose=false`, { signal: controller.signal });
        if (!matchRes.ok) throw new Error("match failed");
        const match: GbifMatch = await matchRes.json();
        if (!match.usageKey || match.matchType === "NONE") throw new Error("no match");
        const [vernRes, occRes] = await Promise.all([
          fetch(`${GBIF_API}/species/${match.usageKey}/vernacularNames?limit=20`, { signal: controller.signal }),
          fetch(`${GBIF_API}/occurrence/search?taxonKey=${match.usageKey}&mediaType=StillImage&limit=6`, { signal: controller.signal }),
        ]);
        if (!vernRes.ok || !occRes.ok) throw new Error("details failed");
        const vernJson = await vernRes.json(); const occJson = await occRes.json();
        const seen = new Set<string>();
        const vernacularNames = (vernJson.results ?? []).filter((v: GbifVernacular) => v.language && !seen.has(v.language) && Boolean(seen.add(v.language))).slice(0, 8);
        const photos: GbifOccurrenceMedia[] = [];
        for (const occ of occJson.results ?? []) for (const media of occ.media ?? []) {
          if (media.type === "StillImage" && media.identifier && photos.length < 4) photos.push({ identifier: media.identifier, title: media.title, creator: media.creator ?? occ.recordedBy, rightsHolder: media.rightsHolder });
        }
        setData({ match, vernacularNames, photos });
      } catch (requestError) { if ((requestError as Error).name !== "AbortError") setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void fetchAll(); return () => controller.abort();
  }, [latinName]);
  return { data, loading, error };
}
