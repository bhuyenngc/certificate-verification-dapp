import { useState } from "react";
import { Link } from "react-router-dom";
import { BigNumber } from "ethers";
import { getCertificateRegistry } from "@/contracts/certificateRegistry";
import { useEthersProvider } from "@/lib/wagmi";
import { cn } from "@/lib/utils";

type CertificateStatus = "CREATED" | "ISSUED" | "SUSPENDED" | "REVOKED";

type CertificateResult = {
  id: string;
  student: string;
  course: string;
  status: CertificateStatus;
  issuer: string;
  issuedAt: string;
};

const quickSteps = [
  {
    step: "1",
    title: "Nhập mã chính xác",
    desc: "Sử dụng mã từ chứng nhận để hệ thống kiểm tra nhanh hơn.",
  },
  {
    step: "2",
    title: "Đối chiếu trạng thái",
    desc: "Kết quả sẽ hiển thị tình trạng chứng nhận ngay sau khi xác thực.",
  },
  {
    step: "3",
    title: "Xem chi tiết đầy đủ",
    desc: "Có thể chuyển đến trang chi tiết hoặc lịch sử hệ thống nếu cần.",
  },
];

function VerifyPage() {
  const provider = useEthersProvider();
  const [certificateId, setCertificateId] = useState("");
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [message, setMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyMock = () => {
    setResult({
      id: certificateId || "CERT001",
      student: "Nguyễn Văn A",
      course: "Nguyên lý Blockchain",
      status: "ISSUED",
      issuer: "0x1234...abcd",
      issuedAt: "15 tháng 4, 2024",
    });
  };

  const handleVerify = async () => {
    const normalizedId = certificateId.trim();
    if (!provider) {
      setMessage("Vui lòng kết nối ví Sepolia trước khi xác thực.");
      return;
    }
    if (!normalizedId) {
      setMessage("Vui lòng nhập mã chứng nhận.");
      return;
    }

    try {
      setIsVerifying(true);
      setMessage("Đang đọc dữ liệu từ blockchain...");
      const contract = getCertificateRegistry(provider);
      const [exists] = await contract.verifyAsset(normalizedId);

      if (!exists) {
        setResult(null);
        setMessage("Không tìm thấy chứng nhận trên blockchain.");
        return;
      }

      const asset = await contract.getAsset(normalizedId);
      setResult({
        id: asset.assetId,
        student: asset.holderName,
        course: asset.assetName,
        status: mapStatus(asset.status),
        issuer: asset.issuer,
        issuedAt: asset.issuedDate,
      });
      setMessage("");
    } catch (error) {
      setResult(null);
      setMessage((error as Error).message || "Không thể xác thực chứng nhận.");
    } finally {
      setIsVerifying(false);
    }
  };

  const mapStatus = (status: BigNumber | number): CertificateStatus => {
    const value = BigNumber.isBigNumber(status) ? status.toNumber() : status;
    if (value === 1) return "ISSUED";
    if (value === 2) return "SUSPENDED";
    if (value === 3) return "REVOKED";
    return "CREATED";
  };

  const getStatusLabel = (status: CertificateStatus) => {
    switch (status) {
      case "ISSUED":
        return "Hợp lệ";
      case "CREATED":
        return "Đã tạo";
      case "SUSPENDED":
        return "Tam dung";
      case "REVOKED":
        return "Thu hồi";
      default:
        return status;
    }
  };

  const getStatusVariant = (status: CertificateStatus) => {
    switch (status) {
      case "CREATED":
        return "border-amber-200/60 bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:border-amber-800/50 dark:text-amber-300";
      case "ISSUED":
        return "border-emerald-200/60 bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:border-emerald-800/50 dark:text-emerald-300";
      case "SUSPENDED":
        return "border-sky-200/60 bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:border-sky-800/50 dark:text-sky-300";
      case "REVOKED":
        return "border-red-200/60 bg-red-500/10 text-red-700 ring-red-500/20 dark:border-red-800/50 dark:text-red-300";
      default:
        return "border-border/60 bg-muted text-muted-foreground ring-border";
    }
  };

  return (
    <div className="py-12 md:py-16 lg:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 lg:px-8">
        {/* HERO + VERIFY PANEL */}
        <section className="relative overflow-hidden rounded-[32px] border border-border/50 bg-gradient-to-br from-background via-background to-emerald-50/40 p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.18)] ring-1 ring-border/10 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/10 md:p-8 lg:p-10">
          {/* animated background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-blue-400/10 blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 dark:opacity-20" />
          </div>

          <div className="relative grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            {/* left */}
            <div>
              <span className="inline-flex rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                XÁC THỰC CHỨNG NHẬN
              </span>

              <h1 className="mt-7 max-w-3xl text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Kiểm tra chứng
                <br className="hidden md:block" />
                <span className="text-primary">nhận học tập</span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                Nhập mã chứng nhận để kiểm tra tính hợp lệ. Hệ thống sẽ hiển thị
                thông tin tóm tắt và trạng thái ngay lập tức theo dữ liệu mô phỏng
                từ blockchain.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-700 dark:text-emerald-300">
                  Ethereum Sepolia
                </span>
                <span className="rounded-full border border-border bg-background/70 px-4 py-2 font-medium text-muted-foreground backdrop-blur-sm">
                  Verification Flow
                </span>
                <span className="rounded-full border border-border bg-background/70 px-4 py-2 font-medium text-muted-foreground backdrop-blur-sm">
                  PoC Demo
                </span>
              </div>

              <div className="mt-10 rounded-[28px] border border-border/50 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
                <label className="sr-only" htmlFor="certificate-id">
                  Mã chứng nhận
                </label>

                <div className="flex flex-col gap-4">
                  <input
                    id="certificate-id"
                    type="text"
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    placeholder="VD: CERT001"
                    className="h-16 w-full rounded-2xl border border-border/60 bg-background px-6 text-lg font-semibold text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/80 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full rounded-2xl bg-gradient-to-r from-primary to-emerald-500 px-8 py-4 text-lg font-semibold text-primary-foreground shadow-[0_18px_44px_-18px_rgba(16,185,129,0.42)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-18px_rgba(16,185,129,0.48)] focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Xác thực ngay
                  </button>
                </div>
                {message && (
                  <p className="mt-4 rounded-2xl border border-border bg-background px-5 py-4 text-sm font-semibold text-foreground">
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* right */}
            <div className="rounded-[28px] border border-border/50 bg-background/80 p-6 shadow-sm backdrop-blur-sm">
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-[0.12em] text-muted-foreground ring-1 ring-border">
                HƯỚNG DẪN NHANH
              </span>

              <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-3xl">
                Cách kiểm tra chứng nhận
              </h2>

              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Quy trình được thiết kế ngắn gọn để người dùng có thể kiểm tra
                nhanh trong bối cảnh demo và trình bày capstone.
              </p>

              <div className="mt-8 space-y-4">
                {quickSteps.map((item) => (
                  <div
                    key={item.step}
                    className="group flex gap-4 rounded-2xl border border-border/50 bg-muted/40 p-5 transition-all duration-200 hover:bg-muted/70 hover:shadow-sm"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                      {item.step}
                    </span>

                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RESULT / EMPTY */}
        {result ? (
          <section className="rounded-[32px] border border-border/50 bg-card/70 p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.14)] ring-1 ring-border/10 backdrop-blur-sm md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                  KẾT QUẢ XÁC THỰC
                </span>
                <h2 className="mt-4 text-3xl font-bold text-foreground">
                  Thông tin chứng nhận
                </h2>
              </div>

              <span
                className={cn(
                  "inline-flex rounded-full border px-4 py-2 text-sm font-semibold ring-1 shadow-sm",
                  getStatusVariant(result.status)
                )}
              >
                {getStatusLabel(result.status)}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <InfoCard label="Mã chứng nhận" value={result.id} />
              <InfoCard label="Người nhận" value={result.student} />
              <InfoCard label="Khóa học" value={result.course} />
              <InfoCard label="Ngày cấp" value={result.issuedAt} />
              <div className="md:col-span-2 xl:col-span-2">
                <InfoCard label="Đơn vị phát hành" value={result.issuer} mono />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to={`/certificate/${result.id}`}
                className="flex-1 rounded-2xl bg-primary px-8 py-4 text-center text-lg font-semibold text-primary-foreground shadow-[0_18px_44px_-18px_rgba(37,99,235,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-18px_rgba(37,99,235,0.42)]"
              >
                Xem chi tiết đầy đủ
              </Link>

              <Link
                to="/activity"
                className="flex-1 rounded-2xl border border-border bg-background px-8 py-4 text-center text-lg font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:shadow-sm"
              >
                Xem hoạt động hệ thống
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-[32px] border border-dashed border-border/60 bg-card/40 px-6 py-10 shadow-sm ring-1 ring-border/10 backdrop-blur-sm md:px-8 md:py-12">
            <div className="mx-auto max-w-2xl text-center">
              <div className="relative mx-auto mb-6 h-24 w-24">
                <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-pulse" />
                <div className="absolute inset-[10px] rounded-full bg-cyan-400/10 animate-pulse" />
                <div className="absolute inset-[18px] rounded-full border border-emerald-200/60 bg-white/80 shadow-[0_16px_40px_-18px_rgba(16,185,129,0.22)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-100 via-cyan-50 to-blue-100 text-3xl shadow-sm dark:from-emerald-950/60 dark:via-slate-900 dark:to-blue-950/60">
                    ✦
                  </div>
                </div>
              </div>

              <h3 className="text-3xl font-black leading-[1.2] tracking-[-0.02em] text-slate-900 dark:text-slate-100 md:text-4xl">
                Sẵn sàng kiểm tra
              </h3>

              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Nhập mã chứng nhận ở phía trên để xem kết quả xác thực, trạng thái
                hiện tại và thông tin tóm tắt của chứng nhận.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function InfoCard({ label, value, mono = false }: InfoCardProps) {
  return (
    <div className="rounded-[24px] border border-border/50 bg-background/80 p-5 shadow-sm ring-1 ring-border/10 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 break-words text-lg font-semibold text-foreground",
          mono && "font-mono text-[15px]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default VerifyPage;
