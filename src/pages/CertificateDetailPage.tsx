import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BigNumber } from "ethers";
import { getCertificateRegistry, certificateRegistryAddress } from "@/contracts/certificateRegistry";
import { useEthersProvider } from "@/lib/wagmi";
import { cn } from "@/lib/utils";

type CertificateStatus = "CREATED" | "ISSUED" | "SUSPENDED" | "REVOKED";

type CertificateDetail = {
  id: string;
  student: string;
  course: string;
  issuer: string;
  issuedAt: string;
  status: CertificateStatus;
  network: string;
  createdAt: string;
  updatedAt: string;
};

function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const provider = useEthersProvider();
  const [certificate, setCertificate] = useState<CertificateDetail | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const normalizedId = id?.trim();

    if (!normalizedId) {
      setCertificate(null);
      setMessage("Không có mã chứng nhận để tra cứu.");
      return;
    }

    if (!provider) {
      setCertificate(null);
      setMessage("Vui lòng kết nối ví Sepolia để xem chi tiết chứng nhận.");
      return;
    }

    const loadCertificate = async () => {
      try {
        setMessage("Đang tải chi tiết chứng nhận từ blockchain...");
        const contract = getCertificateRegistry(provider);
        const asset = await contract.getAsset(normalizedId);

        setCertificate({
          id: asset.assetId,
          student: asset.holderName,
          course: asset.assetName,
          issuer: asset.issuer,
          issuedAt: asset.issuedDate,
          status: mapStatus(asset.status),
          network: "Ethereum Sepolia",
          createdAt: formatTimestamp(asset.createdAt),
          updatedAt: formatTimestamp(asset.updatedAt),
        });
        setMessage("");
      } catch (error) {
        setCertificate(null);
        setMessage((error as Error).message || "Không thể tải chi tiết chứng nhận.");
      }
    };

    loadCertificate();
  }, [id, provider]);

  const statusLabel = certificate ? getStatusLabel(certificate.status) : "Đang tải";

  return (
    <div className="relative overflow-hidden py-10 md:py-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute right-10 top-44 h-80 w-80 rounded-full bg-blue-200/20 blur-3xl dark:bg-blue-500/10" />
      </div>

      <header className="mx-auto max-w-5xl text-center">
        <div
          className={cn(
            "inline-flex rounded-full border px-5 py-2 text-sm font-black uppercase tracking-[0.16em] shadow-sm",
            certificate ? getStatusBadgeClass(certificate.status) : "border-slate-200 bg-slate-50 text-slate-600"
          )}
        >
          {statusLabel}
        </div>

        <h1 className="mx-auto mt-6 max-w-5xl text-4xl font-black leading-[1.15] tracking-[-0.025em] text-slate-950 dark:text-white md:text-5xl lg:text-6xl">
          Chi tiết chứng nhận{" "}
          <span className="inline-block bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent dark:from-emerald-300 dark:via-cyan-300 dark:to-blue-300">
            #{id}
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          Thông tin được đọc trực tiếp từ smart contract trên Ethereum Sepolia theo mã chứng nhận đã xác thực.
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-5xl space-y-10">
        {message && (
          <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            {message}
          </p>
        )}

        {certificate && (
          <>
            <section className="rounded-[32px] border border-slate-100 bg-white/85 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70 md:p-10">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Thông tin chính
              </h2>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <DetailCard label="Mã chứng nhận" value={certificate.id} />
                <DetailCard label="Người nhận" value={certificate.student} />
                <DetailCard label="Khóa học" value={certificate.course} />
                <DetailCard label="Đơn vị cấp" value={certificate.issuer} mono />
                <DetailCard label="Ngày cấp" value={certificate.issuedAt} />
                <DetailCard label="Mạng blockchain" value={certificate.network} />
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-100 bg-slate-50/85 p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70 md:p-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  Dữ liệu blockchain
                </h2>

                <div
                  className={cn(
                    "inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.12em] shadow-sm",
                    getStatusBadgeClass(certificate.status)
                  )}
                >
                  <span className="h-3 w-3 rounded-full bg-current opacity-80" />
                  {getStatusLabel(certificate.status)}
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <DetailCard label="Trạng thái" value={getStatusLabel(certificate.status)} variant="status" />
                <DetailCard label="Smart contract" value={certificateRegistryAddress} mono />
                <DetailCard label="Thời điểm tạo" value={certificate.createdAt} />
                <DetailCard label="Cập nhật gần nhất" value={certificate.updatedAt} />
              </div>
            </section>
          </>
        )}
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          to="/verify"
          className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-800 shadow-sm transition-all duration-300 hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-400/10"
        >
          ← Tiếp tục xác thực
        </Link>

        <Link
          to="/activity"
          className="inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-[0_18px_44px_-18px_rgba(16,185,129,0.45)] transition-all duration-300 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          Xem hoạt động hệ thống
        </Link>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  mono = false,
  variant,
}: {
  label: string;
  value: string;
  mono?: boolean;
  variant?: "status";
}) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-white px-5 py-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/55 dark:hover:border-emerald-400/20">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p
        className={cn(
          "font-black leading-7 text-slate-950 dark:text-slate-100",
          mono && "break-all font-mono text-sm text-slate-800 dark:text-slate-200",
          variant === "status" && "text-xl text-emerald-700 dark:text-emerald-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function mapStatus(status: BigNumber | number): CertificateStatus {
  const value = BigNumber.isBigNumber(status) ? status.toNumber() : status;
  if (value === 1) return "ISSUED";
  if (value === 2) return "SUSPENDED";
  if (value === 3) return "REVOKED";
  return "CREATED";
}

function getStatusLabel(status: CertificateStatus) {
  switch (status) {
    case "ISSUED":
      return "Hợp lệ";
    case "CREATED":
      return "Đã tạo";
    case "SUSPENDED":
      return "Tạm dừng";
    case "REVOKED":
      return "Thu hồi";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: CertificateStatus) {
  switch (status) {
    case "ISSUED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300";
    case "CREATED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300";
    case "SUSPENDED":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300";
    case "REVOKED":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatTimestamp(value: BigNumber | number) {
  const timestamp = BigNumber.isBigNumber(value) ? value.toNumber() : value;
  if (!timestamp) return "Chưa có dữ liệu";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export default CertificateDetailPage;
