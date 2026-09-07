import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

/**
 * DEVFLOW AI — SsrfProtectionService (Phase 13)
 *
 * Validates outbound webhook, integration, and external API URLs.
 * Strictly blocks internal network probes, loopbacks, private subnets,
 * and Cloud metadata endpoints (e.g. AWS/GCP 169.254.169.254).
 */
@Injectable()
export class SsrfProtectionService {
  private readonly logger = new Logger(SsrfProtectionService.name);

  // Prohibited hostnames and internal domain patterns
  private readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    'instance-data',
    '169.254.169.254',
  ]);

  /**
   * Validates target URL against SSRF vulnerability criteria
   */
  validateUrl(rawUrl: string): { isValid: boolean; hostname: string; protocol: string } {
    let parsed: URL;

    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new ForbiddenException(`Invalid URL format: "${rawUrl}".`);
    }

    // 1. Protocol validation (Only HTTP and HTTPS allowed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      this.logger.warn(`SSRF Blocked: Prohibited protocol "${parsed.protocol}" in URL: ${rawUrl}`);
      throw new ForbiddenException(
        `Security violation: Prohibited protocol "${parsed.protocol}". Only HTTP/HTTPS is permitted.`,
      );
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // 2. Direct blocked hostname match
    if (this.BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      this.logger.warn(`SSRF Blocked: Hostname "${hostname}" targeting internal/loopback resource.`);
      throw new ForbiddenException(
        `Security violation: Target hostname "${hostname}" is prohibited (Internal/Cloud Metadata).`,
      );
    }

    // 3. IP Subnet Validation (Private and link-local address spaces)
    if (this.isPrivateOrReservedIp(hostname)) {
      this.logger.warn(`SSRF Blocked: IP "${hostname}" is within private/link-local address space.`);
      throw new ForbiddenException(
        `Security violation: Target IP "${hostname}" is within a restricted private subnet.`,
      );
    }

    return {
      isValid: true,
      hostname,
      protocol: parsed.protocol,
    };
  }

  /**
   * Check whether an IP string falls into RFC 1918 or link-local reserved ranges
   */
  isPrivateOrReservedIp(ip: string): boolean {
    // IPv4 check
    const ipv4Parts = ip.split('.').map((p) => parseInt(p, 10));
    if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      const [a, b] = ipv4Parts;

      // 127.0.0.0/8 (Loopback)
      if (a === 127) return true;
      // 10.0.0.0/8 (Private Class A)
      if (a === 10) return true;
      // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 (Private Class C)
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 (Link-local / Cloud Metadata)
      if (a === 169 && b === 254) return true;
      // 0.0.0.0/8 (Current network)
      if (a === 0) return true;
    }

    // IPv6 checks (e.g. ::1 or fc00:: or fe80::)
    if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
      return true;
    }

    return false;
  }
}
