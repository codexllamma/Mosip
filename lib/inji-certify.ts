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
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(
        `${this.config.baseUrl}/v1/credentials/issue`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            credential: {
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://www.w3.org/2018/credentials/examples/v1",
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
        const error = await response.text();
        throw new Error(
          `Inji Certify API error: ${response.status} - ${error}`
        );
      }

      const result = await response.json();

      return {
        credentialId: result.credentialId || result.id,
        credential: result.credential || result.verifiableCredential,
        credentialUrl:
          result.credentialUrl ||
          `${this.config.baseUrl}/v1/credentials/${result.credentialId}`,
        qrCode: result.qrCode,
      };
    } catch (error: any) {
      console.error("Inji Certify issuance failed:", error);
      throw new Error(`Failed to issue credential: ${error.message}`);
    }
  }

  generateWalletImportUrl(credentialUrl: string): string {
    const encodedUrl = encodeURIComponent(credentialUrl);
    return `openid-vc://?credential_offer_uri=${encodedUrl}`;
  }

  generateVerifyUrl(credentialId: string): string {
    return `${this.config.baseUrl}/verify/${credentialId}`;
  }
}

export const injiCertify = new InjiCertifyClient({
  baseUrl: process.env.INJI_CERTIFY_URL || "https://certify.example.com",
  apiKey: process.env.INJI_CERTIFY_API_KEY,
});