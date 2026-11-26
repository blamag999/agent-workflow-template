# Đề xuất: Tối ưu Token & Trình bày Markdown trong Repo

> **Status: DRAFT – chờ phản biện**

**TL;DR:** Plan 7 mục (≤60 dòng) · Code module ≤300 dòng + `REUSE.md` · Checkpoint 1 màn hình + trình bày L1/L2/L3.

## 1. Luồng tổng
`Plan (7 mục) → Code (module nhỏ + REUSE) → Verify (T1→T2→T3) → Merge (diff nhỏ) → Checkpoint (script) → Plan`

## 2. Ước lượng token nạp ngữ cảnh đầu phiên
| Cách nạp | Ước lượng |
| :--- | :--- |
| Đọc cả repo | ~150k |
| Docs + grep | ~40k |
| `CHECKPOINT.md` + diff | ~8k |
| Dòng L1 | ~0.1k |

## 3. Lập kế hoạch: Work file 7 mục (`docs/agent/work/<ID>.md`)
| Mục | Nội dung | Tiết kiệm gì |
| :--- | :--- | :--- |
| Goal | Mục tiêu 1–2 câu | Không đoán ý |
| Scope files | File được phép sửa | Không lục repo |
| Entry points | Hàm/route + số dòng | Đọc trúng chỗ |
| Reuse | Util/component có sẵn | Không viết trùng |
| Acceptance | 3–5 tiêu chí kiểm tra | Review nhanh |
| Verify tier | T1 / T2 / T3 + lệnh | Không chạy thừa |
| Out of scope | Việc không làm & gate duyệt | Không phình phạm vi |

## 4. Khi code: 8 nguyên tắc
| Nguyên tắc | Cách làm |
| :--- | :--- |
| Module ≤300 dòng | 1 file = 1 trách nhiệm |
| Contract trước | Tách `types.ts` / `schemas/` |
| Barrel `index.ts` | Export rõ như mục lục |
| `REUSE.md` | Bảng `Tên \| Đường dẫn \| 1 dòng` |
| Grep trước, đọc sau | `rg` tìm symbol, đọc đúng dải dòng |
| Diff & commit nhỏ | 1 commit = 1 ý |
| Test cạnh code | `foo.test.ts` cạnh `foo.ts` |
| Do-not-read list | Loại lockfile, `dist/`, fixture lớn |

## 5. Hệ thống Checkpoint định kỳ
Cấu trúc: `docs/agent/{CHECKPOINT.md, checkpoints/YYYY-MM-DD.md, MAP.md, REUSE.md}` + `scripts/checkpoint.mjs`

| Trigger | Hành động |
| :--- | :--- |
| Merge task vào `test` | Cập nhật `CHECKPOINT.md` |
| Hằng tuần / sau 5 task | Lưu `checkpoints/<date>.md` |
| Trước `/compact` / handoff | Đối chiếu nhanh checkpoint |

Luồng phiên mới: `Đọc CHECKPOINT.md → git log HEAD_cp..HEAD --oneline → git diff --stat → Chỉ đọc file trong diff`

## 6. Trình bày 3 mức (L1 / L2 / L3)
| Mức | Dùng khi | Ví dụ |
| :--- | :--- | :--- |
| **L1** | Đầu phiên, cuối lượt | `🟢 test@f4aac47 · T1 13/13 · 1 hold (E26) · next: review E26` |
| **L2** | Đánh giá nhanh repo | Dashboard bảng ≤40 dòng |
| **L3** | Đào sâu 1 task | Work file, `git diff`, log chi tiết |

## 7. Quy chuẩn trình bày file trong repo
| File | Quy chuẩn |
| :--- | :--- |
| `README.md` | TL;DR 3 dòng + bảng lệnh/cấu trúc |
| `MAP.md` | Cây thư mục + 1 dòng vai trò |
| `REUSE.md` | `Tên \| Đường dẫn \| 1 dòng` |
| Work file | 7 mục, ≤60 dòng |
| `CHECKPOINT.md` | Dashboard L2 ≤40 dòng |
| `ADR` | Context / Decision / Consequence (≤3 dòng/mục) |

Quy tắc: icon `✅ 🔄 ⏸ ❌ ⚠`, ≤1 màn hình, chỉ ghi delta, dẫn `file#Lx` thay vì dán code.

## 8. Lộ trình triển khai
`1. Sửa templates/work.md (~10p) → 2. Tạo REUSE.md, CHECKPOINT.md, checkpoint.mjs (~20p) → 3. Cập nhật AGENTS.md (~10p) → 4. Thử trên my-learning-hub rồi đưa vào template (~15p)`

## 9. Phản biện & câu hỏi mở

- **Checkpoint lệch thực tế:** Nếu có commit ngoài luồng, `CHECKPOINT.md` sẽ cũ. *Giảm thiểu:* ghi `HEAD sha` ở dòng đầu; nếu `sha ≠ HEAD`, chạy lại script hoặc chỉ đọc `git log <sha>..HEAD` + `git diff --stat`.
- **Trùng lặp với Section A & `INDEX.md`:** *Đề xuất ranh giới:* `CHECKPOINT.md` ở cấp repo, work file ở cấp task, `INDEX.md` chỉ ghi danh sách task đã đóng.
- **Giới hạn module ≤300 dòng:** Chỉ là hướng dẫn để gắn cờ hotspot, không phải luật cứng ép tách file máy móc.
- **`REUSE.md` dễ lỗi thời:** Chỉ cập nhật khi thêm code dùng chung thực sự, tại bước kết thúc phiên của Coder.
- **`checkpoint.mjs` phụ thuộc stack:** Template chỉ cung cấp mẫu markdown (`templates/checkpoint.md`); mỗi repo tự thêm script phù hợp (xem ví dụ Node trong `ADOPT.md`).
- **Số liệu token hiện tại là ước lượng:** Cần đo thực tế bằng `token-guard` qua 5 task trước khi chốt áp dụng rộng.
- **Chi phí cập nhật:** Planner cập nhật sau mỗi lần merge tốn khoảng ~1–2k token/lần, đổi lại tiết kiệm cho các phiên sau.

### Tiêu chí chấp nhận để áp dụng rộng
- [ ] Thử nghiệm trên 3–5 task thực tế (vd: `my-learning-hub`) và đo mức giảm token đầu phiên bằng `token-guard`.
- [ ] `CHECKPOINT.md` giữ được ≤40 dòng và không gây nhiễu hoặc mâu thuẫn với `INDEX.md` / work file.
- [ ] Reviewer/Planner xác nhận quy trình mới không làm tăng số lượt handoff.
