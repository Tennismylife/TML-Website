export default function NotFound() {
  // Silent not-found to prevent the built-in 404 UI from being streamed during
  // SSR in dev. Keep minimal and side-effect free.
  return null;
}
