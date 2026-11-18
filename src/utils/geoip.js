// In-memory cache to prevent redundant external API calls
const geoCache = new Map();

/**
 * Lookup geographical location (City, Region, Country, ISP) from an IP address
 * Non-blocking with 1.5s timeout and memory caching
 */
export async function lookupIpLocation(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.")) {
    return {
      city: "Localhost",
      region: "Local Network",
      country: "Internal",
      isp: "Local"
    };
  }

  // Normalize IP (strip ::ffff: ipv6 prefix if present)
  const cleanIp = ip.replace(/^::ffff:/, "").trim();

  if (geoCache.has(cleanIp)) {
    return geoCache.get(cleanIp);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,isp`, {
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const info = {
          city: data.city || "",
          region: data.regionName || "",
          country: data.country || "",
          isp: data.isp || ""
        };
        geoCache.set(cleanIp, info);
        return info;
      }
    }
  } catch (err) {
    // Non-fatal: fail open with empty strings
  }

  const fallback = { city: "", region: "", country: "", isp: "" };
  geoCache.set(cleanIp, fallback);
  return fallback;
}

/**
 * Format a human-readable location string, e.g.:
 * "Lucknow, Uttar Pradesh, India (Bharti Airtel)"
 */
export function formatLocation(geo) {
  if (!geo) return "Unknown Location";
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  if (parts.length === 0) return "Unknown Location";
  const loc = parts.join(", ");
  return geo.isp ? `${loc} • ${geo.isp}` : loc;
}
