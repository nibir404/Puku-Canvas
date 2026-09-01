import type { Scene } from '@puku/types';

/**
 * Encodes a scene into a URL-safe Base64 hash parameter.
 */
export function encodeSceneToUrl(scene: Scene): string {
  try {
    const jsonStr = JSON.stringify(scene);
    const base64 = btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
    const url = new URL(window.location.href);
    url.hash = `scene=${encodeURIComponent(base64)}`;
    return url.toString();
  } catch (e) {
    console.error('Failed to encode scene to URL:', e);
    return window.location.href;
  }
}

/**
 * Decodes a scene from the current URL hash (#scene=...).
 */
export function decodeSceneFromUrl(hash: string): Scene | null {
  try {
    if (!hash || !hash.includes('scene=')) return null;
    const match = hash.match(/scene=([^&]+)/);
    if (!match || !match[1]) return null;
    const base64 = decodeURIComponent(match[1]);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.shapes)) {
      return parsed as Scene;
    }
    return null;
  } catch (e) {
    console.error('Failed to decode scene from URL:', e);
    return null;
  }
}
