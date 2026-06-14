# certificate-verification-dapp
# CertChain - Certificate Verification dApp

## 1. Thông tin nhóm

> Cập nhật lại đúng tên nhóm, MSSV và vai trò trước khi nộp.

| Thông tin | Nội dung |
| --- | --- |
| Tên nhóm | Nhóm D |
| Đề tài | dApp quản lý và xác thực chứng nhận trên Ethereum testnet |
| Repository | `certificate-verification-dapp` |

| STT | Họ tên | MSSV | 
| --- | --- | --- | 
| 1 | Nguyễn Cáp Bảo Huyền | 31231026043 |
| 2 | Phạm Tiến Thành | 31231025969 |
| 3 | Nguyễn Phùng Thu Hà | 31231022138 | 
| 4 | Võ Ngọc Cẩm Tâm | 31231022186 |
| 5 | Nguyễn Dương Phong | 31231021957 | 

## 2. Giới thiệu đề tài

CertChain là proof-of-concept dApp dùng để quản lý và xác thực chứng nhận học tập trên Ethereum Sepolia testnet. Hệ thống cho phép đơn vị phát hành tạo chứng nhận, phát hành chứng nhận, cập nhật trạng thái và cho phép người dùng bất kỳ xác thực chứng nhận bằng mã chứng nhận.

Smart contract được thiết kế theo mô hình registry, không triển khai theo chuẩn ERC-20, ERC-721 hoặc ERC-1155 vì mục tiêu chính là lưu trữ và xác thực trạng thái chứng nhận, không phải phát hành token hoặc NFT có thể giao dịch.

## 3. Chức năng chính

| Nhóm chức năng | Mô tả |
| --- | --- |
| Kết nối ví | Kết nối MetaMask và hiển thị địa chỉ ví đang đăng nhập |
| Phân quyền | Chỉ `Owner`, `Admin` hoặc `Issuer` được tạo/cập nhật chứng nhận |
| Tạo chứng nhận | Tạo chứng nhận mới với mã chứng nhận, người nhận, tên chứng nhận và ngày cấp |
| Xem trước chứng nhận | Hiển thị bản xem trước trước khi phát hành lên blockchain |
| Phát hành chứng nhận | Chuyển chứng nhận sang trạng thái `Issued` |
| Xác thực chứng nhận | Người dùng nhập mã chứng nhận để kiểm tra tính hợp lệ |
| Xem chi tiết | Hiển thị thông tin chi tiết và lịch sử trạng thái của chứng nhận |
| Cập nhật trạng thái | Cập nhật sang `Issued`, `Suspended` hoặc `Revoked` |
| Hoạt động hệ thống | Hiển thị hoạt động gần đây từ event của smart contract |
| Trạng thái hệ thống | Hiển thị network, chainId, contract address, block và gas price |

## 4. Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Styling | Tailwind CSS |
| Wallet | MetaMask, RainbowKit, wagmi |
| Blockchain library | ethers.js v5 |
| Smart contract | Solidity `^0.8.24` |
| Development framework | Hardhat |
| Testnet | Ethereum Sepolia |
| Source control | Git, GitHub |

## 5. Thông tin smart contract đã deploy

Thông tin này được lưu trong file `src/contracts/deployment.json`.

| Nội dung | Giá trị |
| --- | --- |
| Network | Sepolia Testnet |
| Chain ID | `11155111` |
| Contract Name | `CertificateSupplyChain` |
| Contract Address | `0xA0edfD9ea1e27342ED0aFadDf0e87e303496b090` |
| Deployment Time | `2026-06-08T13:31:51.513Z` |

## 6. Cấu trúc thư mục chính

```text
certificate-verification-dapp/
├── contracts/                         # Smart contract Solidity
├── scripts/                           # Script deploy contract
├── test/                              # Test smart contract bằng Hardhat
├── src/                               # Mã nguồn frontend
│   └── contracts/                     # ABI, deployment.json, contract adapter
├── docs/                              # Tài liệu báo cáo và ảnh minh chứng
├── .env.example                       # Mẫu biến môi trường
└── README.md
```

## 7. Hướng dẫn cài đặt và chạy local

### 7.1. Yêu cầu môi trường

- Node.js
- npm
- MetaMask extension
- Ví có SepoliaETH để gửi transaction testnet
- RPC Sepolia từ Alchemy, Infura hoặc nhà cung cấp tương đương

### 7.2. Cài đặt dependency

```bash
npm install
```

### 7.3. Cấu hình biến môi trường

Tạo file `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Điền các giá trị:

```env
BASE=/
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=YOUR_DEPLOYER_PRIVATE_KEY_WITHOUT_0X
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

Lưu ý:

- Không commit file `.env` lên GitHub.
- Không chia sẻ private key hoặc seed phrase MetaMask.
- `PRIVATE_KEY` trong `.env` không cần tiền tố `0x`.

### 7.4. Biên dịch smart contract

```bash
npm run compile
```

### 7.5. Chạy kiểm thử smart contract

```bash
npm run test:contract
```

Kết quả mong đợi:

```text
3 passing
```

### 7.6. Deploy contract lên Sepolia

Chỉ chạy bước này khi muốn deploy contract mới:

```bash
npm run deploy:sepolia
```

Sau khi deploy, script sẽ cập nhật:

- `src/contracts/deployment.json`
- `src/contracts/CertificateSupplyChain.abi.json`

Lưu ý: deploy lại sẽ tạo contract address mới, cần cập nhật lại báo cáo nếu sử dụng địa chỉ mới.

### 7.7. Chạy frontend

```bash
npm run dev
```

Mở trình duyệt tại địa chỉ Vite hiển thị, thường là:

```text
http://localhost:5173
```

Sau đó:

1. Kết nối MetaMask.
2. Chuyển ví sang mạng Sepolia.
3. Dùng ví có quyền `Admin` hoặc `Issuer` để tạo/cập nhật chứng nhận.
4. Dùng ví bất kỳ để xác thực chứng nhận.

## 8. Kịch bản demo nhanh

| Bước | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Mở dApp CertChain | Giao diện hiển thị bình thường |
| 2 | Kết nối MetaMask | Hiển thị địa chỉ ví |
| 3 | Kiểm tra network | Ví đang ở Sepolia |
| 4 | Tạo chứng nhận mới | MetaMask yêu cầu confirm transaction |
| 5 | Phát hành chứng nhận | Trạng thái chuyển sang `Issued` |
| 6 | Xác thực mã chứng nhận | UI hiển thị thông tin chứng nhận hợp lệ |
| 7 | Cập nhật trạng thái | Status chuyển sang `Suspended` hoặc `Revoked` |
| 8 | Xem chi tiết/lịch sử | UI hiển thị thông tin và lịch sử cập nhật |

## 9. Kiểm thử

### 9.1. Kiểm thử chức năng

- Kết nối ví MetaMask.
- Kiểm tra đúng/sai network.
- Kiểm tra ví có quyền và không có quyền.
- Tạo chứng nhận hợp lệ.
- Xem trước chứng nhận trước khi phát hành.
- Tạo trùng mã chứng nhận.
- Xác thực mã tồn tại và mã không tồn tại.
- Cập nhật trạng thái `Issued`, `Suspended`, `Revoked`.
- Không cho cập nhật chứng nhận đã `Revoked`.
- Xem lịch sử và hoạt động hệ thống.

### 9.2. Kiểm thử smart contract

Bộ test Hardhat hiện kiểm tra 3 nhóm chính:

| Test | Nội dung |
| --- | --- |
| `creates, issues, verifies, and records history` | Tạo, phát hành, xác thực, lấy chi tiết và lấy lịch sử |
| `blocks unauthorized users from creating or updating assets` | Chặn ví không có quyền tạo/cập nhật chứng nhận |
| `does not allow updates after revocation` | Không cho cập nhật chứng nhận đã thu hồi |

Chạy test:

```bash
npm run test:contract
```

## 10. Ảnh chụp màn hình

### 10.1. Trang chủ

<img width="991" height="599" alt="image" src="https://github.com/user-attachments/assets/db10a9da-e2a7-432a-953d-1d7de769f768" />

### 10.2. Kết nối ví

<img width="1319" height="597" alt="image" src="https://github.com/user-attachments/assets/121fa9cd-384f-4121-b5cc-05b81cd66661" />

### 10.3. Tạo chứng nhận

<img width="991" height="532" alt="image" src="https://github.com/user-attachments/assets/3f5bb3c5-7fe0-4ea9-b75d-c41e04e1038f" />

### 10.4. Xem trước chứng nhận

<img width="992" height="526" alt="image" src="https://github.com/user-attachments/assets/d47622b9-54a1-4574-821b-4898bfce57d7" />

### 10.5. Xác thực chứng nhận

<img width="991" height="526" alt="image" src="https://github.com/user-attachments/assets/cf314d49-d5c1-4240-b518-bdd5d75392a8" />

### 10.6. Chi tiết chứng nhận 

<img width="992" height="525" alt="image" src="https://github.com/user-attachments/assets/f691a4e2-6261-4c22-a33b-eefc33b64501" />

### 10.7. Cập nhật chứng nhận

<img width="812" height="672" alt="image" src="https://github.com/user-attachments/assets/5740d04b-605a-4a48-bbec-b57014954cc5" />

### 10.8. Xem trước để chọn chứng nhận cần cập nhật

<img width="993" height="524" alt="image" src="https://github.com/user-attachments/assets/b810aa95-5214-4861-a3ba-08170e22d3d1" />

### 10.9. Xem lịch sử hoạt động

<img width="991" height="527" alt="image" src="https://github.com/user-attachments/assets/ec0cde76-76f1-4667-8fbb-47143e9ce5f5" />

