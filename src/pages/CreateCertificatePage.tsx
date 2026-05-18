import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import formIcon from "@/assets/form.png";
import chainIcon2 from "@/assets/blockchain2.png";
import shareIcon from "@/assets/share.png";
import { canManageCertificates, getCertificateRegistry } from "@/contracts/certificateRegistry";
import { useEthersSigner } from "@/lib/wagmi";

const highlights = [
  {
    icon: formIcon,
    title: "Nhập thông tin cơ bản",
    desc: "Điền dữ liệu người học, khóa học và thông tin cần thiết trước khi phát hành.",
  },
  {
    icon: chainIcon2,
    title: "Ghi nhận blockchain",
    desc: "Dữ liệu được lưu vĩnh viễn minh bạch, dễ dàng tra cứu về sau.",
  },
  {
    icon: shareIcon,
    title: "Chia sẻ dễ dàng",
    desc: "Chứng nhận có mã xác thực để kiểm tra nhanh từ bất kỳ đâu.",
  },
];

const formFields = [
  {
    label: "Mã chứng nhận",
    placeholder: "VD: CERT-2024-001",
    type: "text" as const,
  },
  {
    label: "Họ tên người học",
    placeholder: "VD: Nguyễn Văn A",
    type: "text" as const,
  },
  {
    label: "Tên khóa học",
    placeholder: "VD: Nguyên lý Blockchain",
    type: "text" as const,
  },
  {
    label: "Ngày cấp",
    placeholder: "VD: 2026-04-20",
    type: "date" as const,
  },
];

const formFieldNames = ["assetId", "holderName", "assetName", "issuedDate"] as const;

function CreateCertificatePage() {
  const signer = useEthersSigner();
  const [form, setForm] = useState({
    assetId: "",
    holderName: "",
    assetName: "",
    issuedDate: "",
    metadataURI: "",
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [canManage, setCanManage] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkPermission = async () => {
      if (!signer) {
        setCanManage(null);
        return;
      }

      try {
        const hasPermission = await canManageCertificates(signer);
        if (isMounted) setCanManage(hasPermission);
      } catch {
        if (isMounted) setCanManage(false);
      }
    };

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [signer]);

  const handleCreate = async () => {
    if (!signer) {
      setMessage("Vui lòng kết nối ví trước khi tạo chứng nhận.");
      return;
    }
    if (canManage === false) {
      setMessage("Bạn không có quyền tạo chứng nhận. Chỉ ví của đơn vị phát hành hoặc quản trị viên mới được thực hiện thao tác này.");
      return;
    }
    if (!form.assetId || !form.holderName || !form.assetName || !form.issuedDate) {
      setMessage("Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("Đang gửi giao dịch lên blockchain...");
      const contract = getCertificateRegistry(signer);
      const createTx = await contract.createAsset(
        form.assetId,
        form.holderName,
        form.assetName,
        form.metadataURI,
        form.issuedDate,
        { gasLimit: 500000 }
      );
      await createTx.wait();
      const issueTx = await contract.issueAsset(form.assetId, "Issued from frontend", { gasLimit: 300000 });
      await issueTx.wait();
      setMessage(`Đã tạo và phát hành chứng nhận ${form.assetId}.`);
    } catch (error) {
      const reason = (error as { reason?: string; message?: string }).reason;
      setMessage(reason ? `Giao dịch thất bại: ${reason}` : "Giao dịch thất bại. Kiểm tra MetaMask, gas hoặc mã chứng nhận đã tồn tại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 md:py-16 lg:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 lg:px-8">
        {/* HERO */}
        <section className="mx-auto max-w-5xl text-center">
          <span className="inline-flex rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
            TẠO CHỨNG NHẬN MỚI
          </span>

          <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Tạo chứng nhận học tập
            <br className="hidden md:block" />
            <span className="text-primary"> minh bạch trên blockchain</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-muted-foreground md:text-3xl">
            Nhập thông tin cơ bản và phát hành chứng nhận. Dữ liệu sẽ được ghi nhận an toàn trên Ethereum Sepolia.
          </p>
        </section>

        {/* FORM */}
        <section className="mx-auto w-full max-w-4xl">
          <div className="overflow-hidden rounded-[28px] border border-border/50 bg-card/85 p-8 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.18)] ring-1 ring-border/10 backdrop-blur-sm md:p-10 lg:p-12">
            <div className="mb-10 text-center">
              <span className="inline-flex rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                NHẬP THÔNG TIN
              </span>

              <h2 className="mt-4 text-3xl font-bold leading-tight text-foreground">
                Dữ liệu chứng nhận mới
              </h2>

              <p className="mx-auto mt-3 max-w-0xl text-base leading-7 text-muted-foreground">
                Hoàn thiện các trường thông tin cơ bản trước khi thực hiện bước phát hành
                chứng nhận trên blockchain.
              </p>
            </div>

            <div className="grid gap-7">
              {canManage === false && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  Bạn không có quyền tạo chứng nhận. Ví hiện tại chỉ có thể xác thực và xem chi tiết chứng nhận.
                </p>
              )}
              {formFields.map((field, index) => {
                const fieldName = formFieldNames[index];
                return (
                <div key={field.label} className="space-y-3">
                  <label className="block text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {field.label}
                  </label>

                  <input
                    type={field.type}
                    value={form[fieldName]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [fieldName]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="h-15 w-full rounded-2xl border border-border/60 bg-background px-5 py-4 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/80 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col gap-4 md:flex-row">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting || canManage === false}
                className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-lg font-semibold text-white shadow-[0_18px_44px_-18px_rgba(16,185,129,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-18px_rgba(16,185,129,0.52)] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Tạo & Phát hành
              </button>

              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex-1 rounded-2xl border border-border bg-background px-8 py-4 text-lg font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                Xem trước chứng nhận
              </button>
            </div>
            {message && (
              <p className="mt-5 rounded-2xl border border-border bg-background px-5 py-4 text-sm font-semibold text-foreground">
                {message}
              </p>
            )}
          </div>
        </section>

        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Đóng xem trước"
              onClick={() => setShowPreview(false)}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
            />

            <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-background shadow-[0_40px_120px_-32px_rgba(15,23,42,0.35)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                      BẢN XEM TRƯỚC
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-foreground">
                      Chứng nhận học tập
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-xl font-bold text-muted-foreground transition hover:bg-accent"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 rounded-[24px] border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/70 to-blue-50/70 p-6 text-center shadow-inner dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/20 dark:to-blue-950/20 md:p-8">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                    CertChain
                  </p>
                  <h4 className="mt-4 text-3xl font-black text-slate-950 dark:text-white md:text-4xl">
                    Chứng nhận hoàn thành
                  </h4>
                  <p className="mt-5 text-base text-slate-600 dark:text-slate-300">
                    Xác nhận rằng
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                    {form.holderName || "Tên người nhận"}
                  </p>
                  <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                    đã hoàn thành khóa học
                    <span className="font-bold text-slate-950 dark:text-white">
                      {" "}
                      {form.assetName || "Tên khóa học"}
                    </span>
                    .
                  </p>

                  <div className="mt-8 grid gap-4 text-left md:grid-cols-2">
                    <PreviewItem label="Mã chứng nhận" value={form.assetId || "CERT-2026-001"} />
                    <PreviewItem label="Ngày cấp" value={formatPreviewDate(form.issuedDate)} />
                    <PreviewItem label="Mạng" value="Ethereum Sepolia" />
                    <PreviewItem label="Trạng thái" value="Bản nháp trước khi phát hành" />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-700"
                  >
                    Đóng xem trước
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HIGHLIGHTS */}
        <section className="mx-auto w-full max-w-6xl">
          <div className="rounded-[32px] border border-border/50 bg-card/55 px-6 py-10 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.14)] ring-1 ring-border/10 backdrop-blur-sm md:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                QUY TRÌNH PHÁT HÀNH
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-foreground md:text-4xl">
                Tạo chứng nhận nhanh, rõ ràng và dễ kiểm tra
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                Giao diện được thiết kế để hỗ trợ thao tác nhập liệu, phát hành và chia sẻ
                chứng nhận theo quy trình đơn giản, phù hợp cho bản demo PoC.
              </p>
            </div>

            <div className="mt-12 grid items-start gap-8 md:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="group flex h-full flex-col items-center rounded-[28px] px-5 py-6 text-center transition-all duration-300 hover:bg-background/80 hover:shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)]"
                >
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 shadow-sm ring-1 ring-slate-200/70 transition-transform duration-300 group-hover:scale-[1.04] dark:bg-slate-800 dark:ring-slate-700/60">
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="h-10 w-10 object-contain"
                    />
                  </div>

                  <h3 className="flex min-h-[72px] items-center justify-center text-center text-2xl font-bold tracking-[-0.02em] text-foreground">
                    {item.title}
                  </h3>

                  <p className="mt-4 max-w-[320px] text-balance text-lg leading-8 text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                to="/verify"
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-6 py-3 text-base font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent"
              >
                Chuyển sang trang xác thực
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function formatPreviewDate(date: string) {
  if (!date) return "Chưa chọn ngày cấp";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default CreateCertificatePage;
