import { Contract, Signer, providers } from "ethers";
import deployment from "./deployment.json";

export const certificateRegistryAbi = [
  "function owner() view returns (address)",
  "function roles(address account) view returns (uint8)",
  "function createAsset(string assetId,string holderName,string assetName,string metadataURI,string issuedDate) returns (bytes32)",
  "function issueAsset(string assetId,string note)",
  "function suspendAsset(string assetId,string note)",
  "function revokeAsset(string assetId,string note)",
  "function updateStatus(string assetId,uint8 newStatus,string note)",
  "function verifyAsset(string assetId) view returns (bool exists,bool valid,uint8 status,address issuer)",
  "function getAsset(string assetId) view returns (tuple(string assetId,string holderName,string assetName,string metadataURI,string issuedDate,address issuer,uint8 status,uint256 createdAt,uint256 updatedAt,bool exists))",
  "function getHistory(string assetId) view returns (tuple(uint8 status,address actor,string note,uint256 timestamp)[])",
  "function setRole(address account,uint8 role)",
  "event AssetCreated(bytes32 indexed assetKey,string assetId,string holderName,string assetName,address indexed issuer)",
  "event AssetStatusUpdated(bytes32 indexed assetKey,string assetId,uint8 indexed oldStatus,uint8 indexed newStatus,address actor,string note)",
] as const;

export const certificateRegistryAddress = deployment.address;
export const certificateRegistryChainId = deployment.chainId;

export enum CertificateStatus {
  Created = 0,
  Issued = 1,
  Suspended = 2,
  Revoked = 3,
}

export function getCertificateRegistry(providerOrSigner: providers.Provider | Signer) {
  return new Contract(certificateRegistryAddress, certificateRegistryAbi, providerOrSigner);
}

export async function canManageCertificates(providerOrSigner: providers.Provider | Signer, account?: string) {
  const contract = getCertificateRegistry(providerOrSigner);
  const address = account || (await (providerOrSigner as Signer).getAddress());
  const [owner, role] = await Promise.all([contract.owner(), contract.roles(address)]);
  const roleValue = typeof role === "number" ? role : role.toNumber();

  return owner.toLowerCase() === address.toLowerCase() || roleValue === 1 || roleValue === 2;
}
