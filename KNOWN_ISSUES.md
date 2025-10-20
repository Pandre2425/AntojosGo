# Known Issues / Edge Cases

- Web support is minimal; primary targets are Android/iOS. Map behaviors may differ on web.
- If device and server are not on the same network, local backend (http://localhost:8800) will not be reachable from device. Use `.env.dev.local` with LAN IP.
- Location accuracy depends on device sensors; indoor environments might show reduced accuracy.
- Dark mode map styling uses default provider theme; custom dark styles are not included yet.
- If backend omits `base64Image` in /profile, avatar placeholder is shown until a new upload returns preview.
- Very large images may increase upload time; compression quality is set in the picker but user images vary.
- If Google Play services are outdated or blocked on device, map may show degraded experience.
- Expo Go limitations may differ from EAS build; always validate on a development build before releasing.