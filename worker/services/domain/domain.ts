/**
 * Domain Service
 * Handles domain availability checking via WHOIS/DNS lookup
 */

import { createLogger } from '../../logger';

const logger = createLogger('DomainService');

export interface DomainAvailabilityResult {
    domain: string;
    available: boolean;
    premium?: boolean;
    error?: string;
}

export interface DomainSuggestion {
    domain: string;
    available: boolean;
}

/**
 * Domain Service for checking availability
 */
export class DomainService {
    /**
     * Check if a domain is available using DNS lookup
     * If DNS resolution fails, domain is likely available
     */
    async checkAvailability(domain: string): Promise<DomainAvailabilityResult> {
        try {
            // Normalize domain
            const normalizedDomain = this.normalizeDomain(domain);

            if (!this.isValidDomain(normalizedDomain)) {
                return {
                    domain: normalizedDomain,
                    available: false,
                    error: 'Invalid domain format'
                };
            }

            // Use DNS lookup to check availability
            // If DNS resolves, domain is taken; if it fails, likely available
            const isAvailable = await this.checkDNS(normalizedDomain);

            logger.info('Domain availability check', { domain: normalizedDomain, available: isAvailable });

            return {
                domain: normalizedDomain,
                available: isAvailable
            };
        } catch (error) {
            logger.error('Error checking domain availability', { domain, error });
            return {
                domain,
                available: false,
                error: 'Failed to check availability'
            };
        }
    }

    /**
     * Generate domain suggestions based on a search query
     */
    generateSuggestions(query: string): string[] {
        const baseName = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const tlds = ['.com', '.net', '.org', '.io', '.co', '.shop', '.store'];

        return tlds.map(tld => `${baseName}${tld}`);
    }

    /**
     * Get the Namecheap purchase URL for a domain
     */
    getPurchaseUrl(domain: string): string {
        const normalizedDomain = this.normalizeDomain(domain);
        return `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(normalizedDomain)}`;
    }

    /**
     * Normalize domain name
     */
    private normalizeDomain(domain: string): string {
        let normalized = domain.toLowerCase().trim();

        // Remove protocol if present
        normalized = normalized.replace(/^https?:\/\//, '');

        // Remove www. prefix
        normalized = normalized.replace(/^www\./, '');

        // Remove trailing slashes and paths
        normalized = normalized.split('/')[0];

        return normalized;
    }

    /**
     * Validate domain format
     */
    private isValidDomain(domain: string): boolean {
        // Basic domain validation regex
        const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;
        return domainRegex.test(domain);
    }

    /**
     * Check DNS to determine if domain is registered
     * Uses Cloudflare's DNS-over-HTTPS
     */
    private async checkDNS(domain: string): Promise<boolean> {
        try {
            // Query Cloudflare DoH for A or NS records
            const response = await fetch(
                `https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`,
                {
                    headers: {
                        'Accept': 'application/dns-json'
                    }
                }
            );

            if (!response.ok) {
                // If DNS query fails, assume we can't determine - default to not available
                return false;
            }

            const data = await response.json() as { Status: number; Answer?: unknown[] };

            // Status 0 = NOERROR (domain exists), Status 3 = NXDOMAIN (domain doesn't exist)
            // If NXDOMAIN (status 3), domain is likely available
            if (data.Status === 3) {
                return true; // Available
            }

            // If we got answers, domain is registered
            if (data.Answer && data.Answer.length > 0) {
                return false; // Not available
            }

            // No NS records but not NXDOMAIN - could be available
            return true;
        } catch (error) {
            logger.warn('DNS check failed, assuming unavailable', { domain, error });
            return false;
        }
    }
}
