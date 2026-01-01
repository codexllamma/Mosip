export const VC_CONTEXT = [
  "https://www.w3.org/2018/credentials/v1"
];

export function buildVerifiableCredential({
  certificateId,
  issuer,
  issuanceDate,
  credentialSubject,
}: {
  certificateId: string;
  issuer: {
    id: string;
    name: string;
  };
  issuanceDate: string;
  credentialSubject: Record<string, any>;
}) {
  return {
    "@context": VC_CONTEXT,
    id: `urn:uuid:${certificateId}`,
    type: ["VerifiableCredential", "DigitalProductPassport"],
    issuer,
    issuanceDate,
    credentialSubject,
  };
}
