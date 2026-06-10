export function normalizeDomain(domain) {
  if (!domain) return "";
  return domain.toLowerCase().replace(/^www\./, "");
}

export function isWhitelisted(hostname, whitelist = []) {
  const host = normalizeDomain(hostname);
  return whitelist.some((entry) => {
    const normalized = normalizeDomain(entry);
    return host === normalized || host.endsWith(`.${normalized}`);
  });
}

export function validateDomain(input) {
  const trimmed = input.trim().toLowerCase().replace(/^www\./, "");
  if (!trimmed) return { valid: false, error: "Domain cannot be empty." };
  if (trimmed.includes("://") || trimmed.includes("/")) {
    return { valid: false, error: "Enter domain only (e.g. slack.com)." };
  }
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainRegex.test(trimmed)) {
    return { valid: false, error: "Invalid domain format." };
  }
  return { valid: true, domain: trimmed };
}
