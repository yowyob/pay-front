const APP_BASE_PATH = "/pay";

export function appPath(path: string) {
  if (!path.startsWith("/")) {
    return path;
  }
  if (path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) {
    return path;
  }
  return `${APP_BASE_PATH}${path}`;
}

function normalizeReturnTo(returnTo?: string | null) {
  if (!returnTo?.startsWith("/")) {
    return null;
  }
  return appPath(returnTo);
}

export function hardNavigate(path: string) {
  window.location.assign(appPath(path));
}

export function tenantsPath(returnTo?: string | null) {
  const normalizedReturnTo = normalizeReturnTo(returnTo);
  return normalizedReturnTo
    ? appPath(`/tenants?returnTo=${encodeURIComponent(normalizedReturnTo)}`)
    : appPath("/tenants");
}

export function organizationsPath(returnTo?: string | null) {
  const normalizedReturnTo = normalizeReturnTo(returnTo);
  return normalizedReturnTo
    ? appPath(`/organizations?returnTo=${encodeURIComponent(normalizedReturnTo)}`)
    : appPath("/organizations");
}

export function consolePath(returnTo?: string | null) {
  const normalizedReturnTo = normalizeReturnTo(returnTo);
  return normalizedReturnTo ?? appPath("/console");
}

export function mfaPath(returnTo?: string | null) {
  const normalizedReturnTo = normalizeReturnTo(returnTo);
  return normalizedReturnTo
    ? appPath(`/login?step=mfa&returnTo=${encodeURIComponent(normalizedReturnTo)}`)
    : appPath("/login?step=mfa");
}
