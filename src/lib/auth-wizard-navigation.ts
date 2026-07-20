export function hardNavigate(path: string) {
  window.location.assign(path);
}

export function tenantsPath(returnTo?: string | null) {
  return returnTo?.startsWith("/")
    ? `/tenants?returnTo=${encodeURIComponent(returnTo)}`
    : "/tenants";
}

export function organizationsPath(returnTo?: string | null) {
  return returnTo?.startsWith("/")
    ? `/organizations?returnTo=${encodeURIComponent(returnTo)}`
    : "/organizations";
}

export function consolePath(returnTo?: string | null) {
  return returnTo?.startsWith("/") ? returnTo : "/console";
}

export function mfaPath(returnTo?: string | null) {
  return returnTo?.startsWith("/")
    ? `/login?step=mfa&returnTo=${encodeURIComponent(returnTo)}`
    : "/login?step=mfa";
}
