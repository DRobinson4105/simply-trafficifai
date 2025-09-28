export type LatLng = { latitude: number; longitude: number };

export type Props = {
    currentPosition: LatLng;
    steps: google.maps.DirectionsStep[] | undefined;
    className?: string;
    lanes: number[];
    style?: React.CSSProperties;
};

export function measureDistance(a: LatLng, b: LatLng)
{
    const RAD_EARTH = 6378.137;
    const DIFF_LAT = b.latitude * Math.PI / 180 - a.latitude * Math.PI / 180;
    const DIFF_LON = b.longitude * Math.PI / 180 - a.longitude * Math.PI / 180;
    const temp = Math.sin(DIFF_LAT / 2) * Math.sin(DIFF_LAT / 2) +
        Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
        Math.sin(DIFF_LON / 2) * Math.sin(DIFF_LON / 2);
    var temp_2 = 2 * Math.atan2(Math.sqrt(temp), Math.sqrt(1 - temp));
    var temp_3 = RAD_EARTH * temp_2;
    return temp_3 * 1000; // In Meters from https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
}

export function metersToMiles(m: number) {
    return m / 1609.344;
}

export function projectOntoSegment(pos: LatLng, a: LatLng, b: LatLng) {
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos(Math.PI * pos.latitude / 180);

    const ax = (a.longitude - pos.longitude) * mPerDegLon;
    const ay = (a.latitude - pos.latitude) * mPerDegLat;
    const bx = (b.longitude - pos.longitude) * mPerDegLon;
    const by = (b.latitude - pos.latitude) * mPerDegLat;

    const vx = bx - ax;
    const vy = by - ay;
    const wx = -ax;
    const wy = -ay;

    const vv = vx * vx + vy * vy;
    let t = vv === 0 ? 0 : (wx * vx + wy * vy) / vv;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * vx;
    const projY = ay + t * vy;

    const projLon = projX / mPerDegLon + pos.longitude;
    const projLat = projY / mPerDegLat + pos.latitude;

    return { t, lat: projLat, lng: projLon };
}

export function remainingMetersOnStep(
    step: google.maps.DirectionsStep,
    currentPosition: LatLng
) {
    const path = (step as unknown as { path?: google.maps.LatLng[] }).path || [];
    const end = step.end_location;

    if (!path.length && end) {
        return measureDistance(currentPosition, {
            latitude: end.lat(),
            longitude: end.lng(),
        });
    }
    if (path.length <= 1) return 0;

    let best = {
        distToProj: Number.POSITIVE_INFINITY,
        seg: 0,
        proj: { lat: path[0].lat(), lng: path[0].lng() },
    };

    for (let i = 0; i < path.length - 1; i++) {
        const a = { latitude: path[i].lat(), longitude: path[i].lng() };
        const b = { latitude: path[i + 1].lat(), longitude: path[i + 1].lng() };
        const proj = projectOntoSegment(currentPosition, a, b);
        const d = measureDistance(currentPosition, {
            latitude: proj.lat,
            longitude: proj.lng,
        });
        if (d < best.distToProj) {
            best = { distToProj: d, seg: i, proj: { lat: proj.lat, lng: proj.lng } };
        }
    }

    let remaining = 0;

    const nextIdx = best.seg + 1;
    if (nextIdx >= path.length) return 0;
    const firstNext = {
        latitude: path[nextIdx].lat(),
        longitude: path[nextIdx].lng(),
    };
    remaining += measureDistance(
        { latitude: best.proj.lat, longitude: best.proj.lng },
        firstNext
    );

    for (let j = nextIdx; j < path.length - 1; j++) {
        const u = { latitude: path[j].lat(), longitude: path[j].lng() };
        const v = { latitude: path[j + 1].lat(), longitude: path[j + 1].lng() };
        remaining += measureDistance(u, v);
    }

    return remaining;
}

export function distance(
  a: {latitude: number; longitude: number},
  b: {latitude: number; longitude: number}
) {
  const dx = b.latitude - a.latitude;
  const dy = b.longitude - a.longitude;
  return Math.sqrt(dx * dx + dy * dy);
}

export function bearing(
  a: {latitude: number; longitude: number},
  b: {latitude: number; longitude: number}
) {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}