function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isPlatformOwner(user) {
  const configuredOwnerEmail = normalizeEmail(process.env.PLATFORM_OWNER_EMAIL);
  return user?.is_platform_owner === true
    || user?.role === "platform_owner"
    || (configuredOwnerEmail !== "" && normalizeEmail(user?.email) === configuredOwnerEmail);
}

export function normalizePlatformOwner(user) {
  if (!isPlatformOwner(user)) return user;
  return { ...user, role: "platform_owner", is_platform_owner: true };
}
