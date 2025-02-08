# MultiSig Wallet - Hướng dẫn triển khai và sử dụng

## 1. Cấu trúc dự án
Dự án bao gồm hai phần chính:
- Smart Contract MultiSigWallet (Solidity)
- Frontend (React)

## 2. Triển khai Smart Contract

### 2.1. Deploy Contract
```solidity
// Constructor parameters
_owners = [
    "0xf9340cf908f039Db5F588b79286dc62D84ba5098",
    "0xE1B37097C7b93DE17fcFc988f9789e89A6cE836e",
    "0x394409D8630eC3bDA1A661b01424220Da42cdfaA"
];
_required = 2; // Số chữ ký cần thiết
```

### 2.2. Sau khi deploy
- Lưu lại địa chỉ contract đã deploy
- Cập nhật `MULTISIG_ADDRESS` trong file `App.js`
- Cập nhật `MULTISIG_ABI` với ABI của contract

## 3. Cài đặt và chạy Frontend

### 3.1. Cài đặt dependencies
```bash
npm install
npm install @tailwindcss/forms
npm install web3
```

### 3.2. Cấu hình MetaMask
1. Import các tài khoản owner vào MetaMask
2. Đảm bảo có đủ ETH trong các tài khoản
3. Kết nối MetaMask với mạng test phù hợp

## 4. Sử dụng MultiSig Wallet

### 4.1. Khởi tạo và Nạp tiền vào Wallet

1. Gửi ETH vào địa chỉ contract:
    - Từ một tài khoản owner
    - Gửi đến địa chỉ contract đã deploy (vd: 0xa08f3517Ee859b286bE99ea651724CB8BF04a31C)
    - Số lượng ETH cần gửi = Số ETH muốn giao dịch + Gas fee
      Ví dụ:
        * Nếu muốn gửi giao dịch 0.6 ETH
        * Nên nạp vào contract khoảng 0.7 ETH (0.6 ETH + 0.1 ETH gas fee)

2. Kiểm tra số dư contract:
    - Có thể kiểm tra trên Etherscan bằng địa chỉ contract
    - Hoặc dùng web3.eth.getBalance() để kiểm tra
    - Đảm bảo số dư luôn cao hơn giá trị giao dịch dự định

3. Quản lý số dư:
    - Nên duy trì một số dư tối thiểu trong contract
    - Theo dõi số dư trước mỗi giao dịch
    - Có thể nạp thêm ETH bất cứ lúc nào từ các owner

### 4.2. Tạo giao dịch mới
1. Điền form "Submit New Transaction":
    - To Address: Địa chỉ người nhận
    - Value (ETH): Số lượng ETH
    - Data (hex): Nhập "0x" nếu chỉ chuyển ETH
2. Bấm "Submit Transaction"
3. Xác nhận trong MetaMask

### 4.3. Phê duyệt giao dịch
1. Chuyển đổi tài khoản trong MetaMask sang owner khác
2. Refresh trang web
3. Tìm giao dich cần approve
4. Bấm "Approve"
5. Xác nhận trong MetaMask

### 4.4. Thực thi giao dịch
1. Sau khi đủ số lượng approval cần thiết
2. Bấm "Execute"
3. Trong MetaMask:
    - Tăng Gas Limit (khoảng 100000)
    - Xác nhận giao dịch

## 5. Xử lý lỗi thường gặp

### 5.1. Lỗi approve
- Đảm bảo đang dùng tài khoản owner
- Refresh trang sau khi chuyển tài khoản
- Kiểm tra giao dịch chưa được execute

### 5.2. Lỗi execute
- Kiểm tra số dư của contract:
    * Số dư phải >= Giá trị giao dịch + Gas fee
    * Ví dụ: Giao dịch 0.6 ETH cần contract có ít nhất 0.7 ETH
- Đảm bảo đủ số lượng approval (mặc định 2/3 chữ ký)
- Tăng Gas Limit trong MetaMask (khoảng 100000)
- Nếu thiếu tiền, nạp thêm ETH vào contract và thử lại

### 5.3. Quản lý số dư contract
- Lỗi "insufficient funds": Nạp thêm ETH vào contract
- Công thức tính số ETH cần nạp:
    * Minimum = Giá trị giao dịch + 0.1 ETH (gas fee)
    * Recommended = Giá trị giao dịch + 0.2 ETH (dự phòng)
- Có thể nạp nhiều hơn để thực hiện nhiều giao dịch

### 5.3. Lỗi submit transaction
- Kiểm tra format địa chỉ người nhận
- Data phải là "0x" nếu chỉ chuyển ETH
- Value phải là số hợp lệ

## 6. Best Practices
- Luôn kiểm tra kỹ thông tin trước khi approve/execute
- Nên có đủ ETH trong contract trước khi tạo giao dịch
- Refresh trang sau khi chuyển đổi tài khoản
- Kiểm tra số approval trước khi execute
- Backup private key của các tài khoản owner

## 7. Các tính năng chính
- Tạo giao dịch mới
- Phê duyệt giao dịch
- Hủy phê duyệt
- Thực thi giao dịch
- Xem danh sách owners
- Xem lịch sử giao dịch

--- 

Phần cần làm thêm

Hãy để tôi giải thích về luồng hoạt động của MultiSig Wallet:

1. Địa chỉ `0xa08f3517Ee859b286bE99ea651724CB8BF04a31C` là địa chỉ của smart contract MultiSig Wallet. Nó hoạt động như một "ví chung" hoặc "két sắt chung" của tất cả owners.

2. Quy trình hoạt động:
```
[Người gửi] -> [MultiSig Contract] -> [Người nhận]
   ↑               ↑
Phải nạp      Giữ tiền tạm thời
tiền vào      trong contract
```

3. Tại sao cần như vậy:
- MultiSig yêu cầu nhiều chữ ký (ví dụ 2/3)
- Tiền phải được giữ trong contract để đảm bảo chỉ được chuyển khi đủ số chữ ký
- Nếu chuyển trực tiếp giữa các tài khoản, không có cách nào để thực thi yêu cầu nhiều chữ ký

4. Ví dụ cụ thể:
```
Muốn chuyển 0.6 ETH từ A đến B qua MultiSig:

1. Nạp tiền vào contract:
   A -> 0xa08f3517Ee859b286bE99ea651724CB8BF04a31C (0.7 ETH)

2. Tạo giao dịch MultiSig:
   Yêu cầu chuyển 0.6 ETH đến B

3. Owners phê duyệt giao dịch

4. Khi đủ chữ ký, contract tự động chuyển:
   0xa08f3517...D84ba5098 -> B (0.6 ETH)
```

Đây giống như một "phòng giao dịch" nơi tiền được giữ an toàn và chỉ được chuyển đi khi đủ số người ký duyệt, thay vì chuyển trực tiếp giữa hai bên.