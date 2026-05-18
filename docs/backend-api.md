# Backend API Mapping

## Status mapping

| UI label | Contract enum | Value |
| --- | --- | --- |
| Da tao | `Created` | `0` |
| Hop le | `Issued` | `1` |
| Tam dung | `Suspended` | `2` |
| Thu hoi | `Revoked` | `3` |

## Create page

Input tu frontend:

- Ma chung nhan -> `assetId`
- Ho ten nguoi hoc -> `holderName`
- Ten khoa hoc -> `assetName`
- Ngay cap -> `issuedDate`
- Metadata/PDF hash neu co -> `metadataURI`

Contract call:

```ts
await contract.createAsset(assetId, holderName, assetName, metadataURI, issuedDate);
await contract.issueAsset(assetId, "Issued from frontend");
```

## Update page

Contract call theo trang thai:

```ts
await contract.issueAsset(assetId, note);
await contract.suspendAsset(assetId, note);
await contract.revokeAsset(assetId, note);
```

Hoac dung ham tong quat:

```ts
await contract.updateStatus(assetId, statusValue, note);
```

## Verify page

```ts
const [exists, valid, status, issuer] = await contract.verifyAsset(assetId);
const asset = exists ? await contract.getAsset(assetId) : null;
```

## Detail page

```ts
const asset = await contract.getAsset(assetId);
const history = await contract.getHistory(assetId);
```
