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

## Kịch bản Sử dụng Multisig Wallet

### 1. Quản lý Quỹ Đầu tư Tập thể

#### Bối cảnh
Một nhóm 5 nhà đầu tư muốn cùng quản lý quỹ đầu tư chung với cơ chế bảo vệ đa lớp.

#### Thiết lập Ban đầu
```javascript
{
  owners: [investorA (admin), investorB, investorC, investorD, investorE],
  required: 3,  // Yêu cầu 3/5 chữ ký
  threshold: 2 ETH  // Giao dịch trên 2 ETH cần phê duyệt đa chữ ký
}
```

#### Quy trình Hoạt động Chi tiết

1. Giao dịch Thông thường
   - Giao dịch dưới 2 ETH được tự động phê duyệt mà không cần thu thập chữ ký
   - Hệ thống tự động đánh dấu "auto-approved" và sẵn sàng thực thi
   - Dashboard hiển thị rõ trạng thái "Below Threshold - Auto Approved"

2. Giao dịch Lớn (> 2 ETH)
   - Người tạo giao dịch submit với deadline 2 phút
   - Cần thu thập 3/5 chữ ký trong thời hạn
   - Admin có thể gia hạn deadline nếu cần thêm thời gian
   - Giao dịch tự động hết hạn nếu không đủ chữ ký

3. Quản lý Khẩn cấp
   - Admin có quyền pause toàn bộ contract trong trường hợp khẩn cấp
   - Có thể hủy các giao dịch đang chờ khi phát hiện rủi ro
   - Điều chỉnh ngưỡng threshold khi thị trường biến động

### 2. Quản lý Chi tiêu Doanh nghiệp

#### Bối cảnh
Startup 10 người với 3 người trong ban điều hành cần quản lý chi tiêu minh bạch.

#### Thiết lập
```javascript
{
  owners: [CEO (admin), CFO, CTO],
  required: 2,  // Cần 2/3 chữ ký
  threshold: 1 ETH
}
```

#### Quy trình Chi tiết

1. Chi tiêu Vận hành
   - Chi tiêu dưới 1 ETH được auto-approve
   - Dashboard hiển thị rõ lịch sử chi tiêu theo thời gian thực
   - Các thành viên có thể theo dõi số dư và giao dịch

2. Chi tiêu Lớn
   - Submit với thời hạn 2 phút
   - Thu thập 2/3 chữ ký từ ban điều hành
   - Admin có thể extend deadline khi cần thảo luận thêm
   - Giao dịch expired sẽ cần tạo lại

3. Quyền Admin
   - CEO có quyền pause contract khi phát hiện bất thường
   - Thêm/xóa thành viên ban điều hành khi có thay đổi nhân sự
   - Hủy các giao dịch đáng ngờ
   - Điều chỉnh threshold theo chính sách mới

### 3. Quản lý Tài chính Dự án Phi lợi nhuận

#### Bối cảnh
Tổ chức phi lợi nhuận với 3 thành viên hội đồng quản trị cần quản lý minh bạch nguồn tài trợ.

#### Thiết lập
```javascript
{
  owners: [Chairman (admin), Treasurer, Secretary],
  required: 2, // 2/3 chữ ký
  threshold: 0.5 ETH 
}
```

#### Quy trình Vận hành

1. Chi tiêu Nhỏ
   - Dưới 0.5 ETH tự động được phê duyệt
   - Log đầy đủ thông tin người tạo, mục đích
   - Dashboard hiển thị chi tiết từng khoản chi

2. Chi tiêu Lớn
   - Submit kèm thông tin dự án và mục đích
   - Thu thập 2/3 chữ ký trong 2 phút
   - Admin có thể gia hạn nếu cần thẩm định kỹ
   - Revoke chữ ký nếu phát hiện vấn đề

3. Tính năng Đặc biệt
   - Pause contract khi audit
   - Cancel transaction khi phát hiện sai phạm
   - Điều chỉnh threshold theo quy mô dự án
   - Tracking đầy đủ lịch sử thay đổi

### 4. Quản lý Quỹ Đầu tư Mạo hiểm

#### Bối cảnh
Quỹ đầu tư với 3 partner cần cơ chế quản lý an toàn và linh hoạt.

#### Thiết lập
```javascript
{
  owners: [Managing Partner (admin), Partner B, Partner C],
  required: 2, // 2/3 chữ ký  
  threshold: 5 ETH // Ngưỡng cao do tính chất quỹ đầu tư
}
```

#### Quy trình Đầu tư

1. Giao dịch Thông thường
   - Dưới 5 ETH tự động phê duyệt
   - Dashboard tracking theo thời gian thực
   - Phân loại giao dịch theo dự án

2. Giao dịch Đầu tư Lớn
   - Submit với đầy đủ thông tin due diligence
   - Thu thập 2/3 chữ ký trong 2 phút
   - Gia hạn deadline nếu cần thẩm định thêm
   - Auto expire nếu không đủ chữ ký

3. Quản trị Rủi ro
   - Admin pause trong trường hợp khẩn cấp
   - Hủy giao dịch khi thị trường biến động
   - Điều chỉnh threshold theo chiến lược đầu tư
   - Add/remove partner khi cơ cấu thay đổi

