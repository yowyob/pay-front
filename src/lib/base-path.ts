export function withBasePath(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  const subpathMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const currentSubpath = subpathMatch ? `/${subpathMatch[1]}` : "";
  const basePath = envBasePath || (currentSubpath === "/pay" ? "/pay" : "");

  if (basePath && path.startsWith("/") && !path.startsWith(basePath)) {
    return `${basePath.replace(/\/$/, "")}${path}`;
  }
  return path;
}
