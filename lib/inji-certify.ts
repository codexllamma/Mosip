// lib/inji-certify.ts

interface InjiCertifyConfig {
  baseUrl: string;
  apiKey?: string;
}

interface IssueCredentialRequest {
  credentialSubject: {
    id?: string;
    batchNumber: string;
    productType: string;
    exporterName: string;
    exporterOrganization?: string;
    origin: string;
    destination: string;
    quantity: number;
    unit: string;
    qualityMetrics: {
      moisture: string;
      pesticideResidue: string;
      organic: boolean;
      grade: string;
    };
    inspectionDate: string;
    inspector: {
      name: string;
      organization: string;
    };
  };
  issuer: {
    id: string;
    name: string;
  };
  type: string[];
  expirationDate?: string;
}

interface IssueCredentialResponse {
  credentialId: string;
  credential: any;
  credentialUrl: string;
  qrCode?: string;
}

export class InjiCertifyClient {
  private config: InjiCertifyConfig;

  constructor(config: InjiCertifyConfig) {
    this.config = config;
  }

  async issueCredential(
    request: IssueCredentialRequest
  ): Promise<IssueCredentialResponse> {
    
    // [OPTIMIZATION] Fail fast if using dummy environment variables
    if (this.config.baseUrl.includes("example.com")) {
      console.warn("Skipping Inji API call (Mock Mode detected: example.com)");
      throw new Error("Mock Mode: Skipping network call");
    }
    
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      // Base URL check
      const baseUrl = this.config.baseUrl.replace(/\/$/, ""); 

      const response = await fetch(
        `${baseUrl}/v1/credentials/issue`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            credential: {
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://www.w3.org/2018/credentials/examples/v1",
                // [IMPORTANT] Add your Custom Context URL here so fields are recognized
                `${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/contexts/food-export.json`
              ],
              type: request.type,
              issuer: request.issuer,
              issuanceDate: new Date().toISOString(),
              expirationDate: request.expirationDate,
              credentialSubject: request.credentialSubject,
            },
            options: {
              proofType: "Ed25519Signature2020",
              created: new Date().toISOString(),
              verificationMethod: `${request.issuer.id}#keys-1`,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Inji Certify API error: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();

      return {
        credentialId: result.credentialId || result.id,
        credential: result.credential || result.verifiableCredential,
        credentialUrl:
          result.credentialUrl ||
          `${baseUrl}/v1/credentials/${result.credentialId}`,
        qrCode: result.qrCode,
      };
    } catch (error: any) {
      console.error("Inji Certify issuance failed:", error);
      throw error; // Re-throw so the route knows to fallback to DB-only mode
    }
  }

  generateWalletImportUrl(credentialUrl: string): string {
    const encodedUrl = encodeURIComponent(credentialUrl);
    return `openid-vc://?credential_offer_uri=${encodedUrl}`;
  }

  generateVerifyUrl(credentialId: string): string {
  return `${this.config.baseUrl}/vc/${credentialId}`;  
}

}

export const injiCertify = new InjiCertifyClient({
  baseUrl: process.env.INJI_CERTIFY_URL || "https://certify.mosip.net",
  apiKey: process.env.INJI_CERTIFY_API_KEY,
});