// Great-circle distance between two lat/lng points, in kilometers.
// Good enough for "profiles near me" filtering at dating-app scale;
// not meant for high-precision navigation.
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}
