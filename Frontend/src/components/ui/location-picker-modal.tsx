"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MapPin, Search, X, Check, Loader2, Navigation, ExternalLink } from "lucide-react";
import { Button } from "./button";

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    importance: number;
    address?: {
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
    };
}

export interface SelectedLocation {
    display_name: string;
    lat: number;
    lon: number;
    maps_url: string;
    short_name: string;
}

interface LocationPickerModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (location: SelectedLocation) => void;
    initialValue?: SelectedLocation | null;
}

function getShortName(result: NominatimResult): string {
    const addr = result.address;
    if (addr) {
        const city = addr.city || addr.town || addr.village;
        const country = addr.country;
        if (city && country) return `${city}, ${country}`;
        if (country) return country;
    }
    return result.display_name.split(",").slice(0, 2).join(",").trim();
}

/** Converts lat/lon to OpenStreetMap slippy tile coordinates at zoom 12 */
function latLonToTile(lat: number, lon: number, zoom: number) {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y, zoom };
}

/** Build a simple static map URL using the OpenStreetMap tile server */
function buildStaticMapUrl(lat: number, lon: number): string {
    const zoom = 12;
    const { x, y } = latLonToTile(lat, lon, zoom);
    // Return an array of 9 tile URLs for a 3x3 grid centered on the location
    return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

export function LocationPickerModal({
    open,
    onClose,
    onSelect,
    initialValue,
}: LocationPickerModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selected, setSelected] = useState<SelectedLocation | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset & sync when opened
    useEffect(() => {
        if (open) {
            setQuery(initialValue ? initialValue.short_name : "");
            setResults([]);
            setSelected(initialValue ?? null);
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [open, initialValue]);

    const search = useCallback(async (q: string) => {
        if (!q.trim() || q.trim().length < 2) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`,
                { headers: { "Accept-Language": "en" } }
            );
            const data: NominatimResult[] = await res.json();
            setResults(data);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (val.trim().length === 0) setSelected(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 420);
    };

    const handleSelect = (result: NominatimResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const maps_url = `https://www.google.com/maps?q=${lat},${lon}`;
        const short_name = getShortName(result);
        const loc: SelectedLocation = {
            display_name: result.display_name,
            lat,
            lon,
            maps_url,
            short_name,
        };
        setSelected(loc);
        setResults([]);
        setQuery(short_name);
    };

    const handleConfirm = () => {
        if (selected) {
            onSelect(selected);
            onClose();
        }
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setSelected(null);
        inputRef.current?.focus();
    };

    if (!open) return null;

    const tileUrl = selected ? buildStaticMapUrl(selected.lat, selected.lon) : null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="w-full max-w-md bg-card rounded-t-[28px] sm:rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: "92dvh" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 pt-5 pb-4"
                    style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)/0.1) 0%, transparent 100%)",
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{ background: "hsl(var(--primary)/0.15)" }}
                        >
                            <MapPin className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground leading-tight">
                                Pick a Location
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Search and pin your destination
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-4 pb-2">
                    <div
                        className="flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition-all"
                        style={{
                            borderColor: query ? "hsl(var(--primary)/0.5)" : "hsl(var(--border))",
                            background: "hsl(var(--background))",
                            boxShadow: query ? "0 0 0 3px hsl(var(--primary)/0.08)" : "none",
                        }}
                    >
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                        ) : (
                            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleInput}
                            placeholder="Search city, country or place…"
                            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                            autoComplete="off"
                        />
                        {(query || selected) && (
                            <button onClick={handleClear} className="flex-shrink-0">
                                <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search results */}
                {results.length > 0 && (
                    <div className="mx-4 rounded-2xl border bg-card shadow-lg overflow-hidden mb-2 divide-y divide-border/40">
                        {results.map((r) => {
                            const short = getShortName(r);
                            return (
                                <button
                                    key={r.place_id}
                                    onClick={() => handleSelect(r)}
                                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                                >
                                    <MapPin
                                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                                        style={{ color: "hsl(var(--primary))" }}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground leading-tight truncate">
                                            {short}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {r.display_name}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Map preview */}
                <div className="px-4 pb-3">
                    {selected && tileUrl ? (
                        <div
                            className="relative w-full rounded-2xl overflow-hidden"
                            style={{
                                height: 200,
                                border: "2px solid hsl(var(--primary)/0.25)",
                                background: "#e8f0e8",
                            }}
                        >
                            {/* 3×3 tile grid for a wider map view */}
                            <MapTileGrid lat={selected.lat} lon={selected.lon} />

                            {/* Pin overlay */}
                            <div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                style={{ zIndex: 10 }}
                            >
                                <div className="flex flex-col items-center" style={{ marginTop: -20 }}>
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                                        style={{ background: "hsl(var(--primary))" }}
                                    >
                                        <MapPin className="w-4 h-4 text-white" />
                                    </div>
                                    <div
                                        className="w-2 h-2 rounded-full mt-0.5"
                                        style={{ background: "hsl(var(--primary))" }}
                                    />
                                </div>
                            </div>

                            {/* Location name badge */}
                            <div
                                className="absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-xl px-3 py-1.5 shadow-md"
                                style={{
                                    background: "hsl(var(--card)/0.92)",
                                    backdropFilter: "blur(8px)",
                                    zIndex: 10,
                                }}
                            >
                                <Navigation className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                                <p className="text-xs font-semibold text-foreground truncate flex-1">
                                    {selected.short_name}
                                </p>
                                <a
                                    href={selected.maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3"
                            style={{
                                height: 180,
                                borderColor: "hsl(var(--border))",
                                background: "hsl(var(--muted)/0.3)",
                            }}
                        >
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center"
                                style={{ background: "hsl(var(--primary)/0.1)" }}
                            >
                                <MapPin
                                    className="w-7 h-7"
                                    style={{ color: "hsl(var(--primary)/0.4)" }}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Search a destination above
                                </p>
                                <p
                                    className="text-xs mt-0.5"
                                    style={{ color: "hsl(var(--muted-foreground)/0.6)" }}
                                >
                                    Map preview will appear here
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-5 pt-1 flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 rounded-xl h-11 font-bold"
                        onClick={handleConfirm}
                        disabled={!selected}
                    >
                        <Check className="w-4 h-4 mr-1.5" />
                        Confirm Location
                    </Button>
                </div>
            </div>
        </div>
    );
}

/** Renders a 3×3 grid of OSM tiles to create a mini-map without iframes */
function MapTileGrid({ lat, lon }: { lat: number; lon: number }) {
    const zoom = 11;
    const n = Math.pow(2, zoom);
    const cx = ((lon + 180) / 360) * n;
    const latRad = (lat * Math.PI) / 180;
    const cy =
        (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2 *
        n;

    const baseTileX = Math.floor(cx);
    const baseTileY = Math.floor(cy);

    const tiles: { x: number; y: number; col: number; row: number }[] = [];
    for (let row = -1; row <= 1; row++) {
        for (let col = -1; col <= 1; col++) {
            tiles.push({ x: baseTileX + col, y: baseTileY + row, col, row });
        }
    }

    // Each tile is 256px; we show 3*256=768px total but clip to the container
    const tileSize = 256;
    const gridSize = tileSize * 3;

    // Fractional offset within the center tile (so the pin is exactly on the location)
    const fracX = cx - baseTileX; // 0-1
    const fracY = cy - baseTileY; // 0-1

    // The center tile starts at col=0 in the grid → pixel offset = tileSize * (1 + fracX)
    // We want the pin (center of container 200px wide) to align with this point
    const containerW = 340; // approx modal width minus padding
    const containerH = 200;
    const pinPixelX = tileSize * (1 + fracX); // absolute x in 768px grid
    const pinPixelY = tileSize * (1 + fracY);
    const offsetX = containerW / 2 - pinPixelX;
    const offsetY = containerH / 2 - pinPixelY;

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    width: gridSize,
                    height: gridSize,
                    left: offsetX,
                    top: offsetY,
                }}
            >
                {tiles.map(({ x, y, col, row }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        key={`${x}-${y}`}
                        src={`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`}
                        alt=""
                        width={tileSize}
                        height={tileSize}
                        style={{
                            position: "absolute",
                            left: (col + 1) * tileSize,
                            top: (row + 1) * tileSize,
                            display: "block",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
