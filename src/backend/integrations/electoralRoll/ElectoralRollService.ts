/**
 * Electoral Roll Integration Service
 * 
 * Abstraction for verifying Voter ID / EPIC against official Electoral Roll databases.
 * 
 * MANDATE:
 * - Do NOT invent an API URL or API key.
 * - Set the integration to UNCONFIGURED until an authorized endpoint is provided.
 * - Do not require production credentials to start the application.
 */

export interface ElectoralRollLookupResult {
  status: 'VERIFIED' | 'NOT_FOUND' | 'INELIGIBLE_ALREADY_VOTED' | 'CONSTITUENCY_MISMATCH' | 'UNCONFIGURED' | 'UNAVAILABLE';
  message: string;
  record?: {
    voterId: string;
    fullNameMasked: string;
    constituency: string;
    state: string;
    isRegistered: boolean;
    hasVoted: boolean;
  };
}

export class ElectoralRollService {
  // Default to UNCONFIGURED unless authorized endpoint and key are provided
  private static environment: 'unconfigured' | 'authorized_endpoint' = 'unconfigured';
  private static apiUrl: string = (process.env.ELECTORAL_ROLL_API_URL || '').trim();
  private static apiKey: string = (process.env.ELECTORAL_ROLL_API_KEY || '').trim();

  // Registry of voters who have already cast their ballot in the active session
  private static votedRegistry = new Set<string>();

  static {
    // Check if an authorized endpoint is genuinely provided via environment
    if (this.apiUrl && this.apiKey) {
      this.environment = 'authorized_endpoint';
    } else {
      this.environment = 'unconfigured';
    }
  }

  public static isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey && this.environment === 'authorized_endpoint');
  }

  public static configureEndpoint(apiUrl: string, apiKey: string): void {
    if (apiUrl && apiKey) {
      this.apiUrl = apiUrl.trim();
      this.apiKey = apiKey.trim();
      this.environment = 'authorized_endpoint';
    } else {
      this.environment = 'unconfigured';
      this.apiUrl = '';
      this.apiKey = '';
    }
  }

  /**
   * Look up Voter ID / EPIC
   */
  public static async verifyVoterId(voterId: string, electionConstituency?: string): Promise<ElectoralRollLookupResult> {
    const cleaned = (voterId || '').trim().toUpperCase();

    // 1. Format validation: Standard Indian EPIC format is 3 uppercase letters followed by 7 digits (e.g. TNL1029384)
    const epicRegex = /^[A-Z]{3}\d{7}$/;
    if (!epicRegex.test(cleaned)) {
      return {
        status: 'NOT_FOUND',
        message: 'Invalid Voter ID / EPIC format. Expected 3 letters followed by 7 digits (e.g. TNL1029384).',
      };
    }

    // 2. Strict Check: If no authorized Electoral Roll endpoint is provided
    if (!this.isConfigured()) {
      return {
        status: 'UNCONFIGURED',
        message: 'Electoral roll integration is not configured or authorized in this environment. Provide an authorized endpoint (ELECTORAL_ROLL_API_URL) to enable real-time roll lookup.',
      };
    }

    // 3. Check already-voted state
    if (this.votedRegistry.has(cleaned)) {
      return {
        status: 'INELIGIBLE_ALREADY_VOTED',
        message: 'This Voter ID has already cast a vote in the active election cycle.',
        record: {
          voterId: cleaned,
          fullNameMasked: 'V***** D*****',
          constituency: electionConstituency || 'Central Chennai',
          state: 'Tamil Nadu',
          isRegistered: true,
          hasVoted: true,
        },
      };
    }

    // 4. In authorized endpoint mode, perform API call to the configured endpoint
    try {
      const response = await fetch(`${this.apiUrl}/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ voter_id: cleaned, constituency: electionConstituency }),
      });

      if (!response.ok) {
        return {
          status: 'UNAVAILABLE',
          message: `Electoral roll gateway returned HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        message: `Failed to connect to authorized Electoral Roll endpoint: ${err.message || 'Network error'}`,
      };
    }
  }

  /**
   * Atomically mark voter ID as having voted in identity registry.
   */
  public static markAsVoted(voterId: string): void {
    this.votedRegistry.add(voterId.trim().toUpperCase());
  }

  public static hasVoted(voterId: string): boolean {
    return this.votedRegistry.has(voterId.trim().toUpperCase());
  }

  public static getEnvironment(): string {
    return this.environment;
  }

  public static getStatusMessage(): string {
    if (!this.isConfigured()) {
      return 'Electoral roll integration is UNCONFIGURED. No external API URL or API key is configured.';
    }
    return `Electoral roll integration configured to authorized endpoint: ${this.apiUrl}`;
  }

  public static resetVotedRegistry(): void {
    this.votedRegistry.clear();
  }
}
