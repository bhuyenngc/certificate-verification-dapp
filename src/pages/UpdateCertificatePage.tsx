import { useEffect, useState } from "react";
import searchIcon from "@/assets/search2.png";
import statusIcon from "@/assets/status.png";
import recordIcon from "@/assets/record.png";
import { canManageCertificates, getCertificateRegistry } from "@/contracts/certificateRegistry";
import { useEthersProvider, useEthersSigner } from "@/lib/wagmi";

type UpdateStep = {
  step: string;
  icon: string;
  title: string;
  desc: string;
};

type CertificateListItem = {
  assetId: string;
  holderName: string;
  assetName: string;
  status: string;
  blockNumber: number;
  logIndex: number;
};

const updateSteps: UpdateStep[] = [
  {
    step: "01",
    icon: searchIcon,
    title: "Tìm chứng nhận cần cập nhật",
    desc: "Nhập mã chứng nhận để xác định đúng hồ sơ cần thay đổi trạng thái trên hệ thống.",
  },
  {
    step: "02",
    icon: statusIcon,
    title: "Chọn trạng thái mới",
    desc: "Thiết lập trạng thái như hợp lệ, tạm dừng hoặc thu hồi kèm ghi chú nếu cần.",
  },
  {
    step: "03",
    icon: recordIcon,
    title: "Ghi nhận thay đổi minh bạch",
    desc: "Sau khi xác nhận, thay đổi sẽ được lưu lại để phục vụ kiểm tra và đối chiếu về sau.",
  },
];

const statusHints = [
  {
    label: "Hợp lệ",
    desc: "Chứng nhận đang có hiệu lực bình thường.",
  },
  {
    label: "Tạm dừng",
    desc: "Dùng khi cần chờ xác minh thêm.",
  },
  {
    label: "Thu hồi",
    desc: "Dùng khi chứng nhận không còn hợp lệ.",
  },
];

function UpdateCertificatePage() {
  const signer = useEthersSigner();
  const provider = useEthersProvider();
  const [assetId, setAssetId] = useState("");
  const [status, setStatus] = useState("1");
  const [updateDate, setUpdateDate] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCertificateList, setShowCertificateList] = useState(false);
  const [certificateList, setCertificateList] = useState<CertificateListItem[]>([]);
  const [listMessage, setListMessage] = useState("");
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

  useEffect(() => {
    if (!showCertificateList) return;

    if (!provider) {
      setCertificateList([]);
      setListMessage("Vui lòng kết nối ví để tải danh sách chứng nhận.");
      return;
    }

    const loadCertificateList = async () => {
      try {
        setCertificateList([]);
        setListMessage("Đang tải danh sách chứng nhận từ blockchain...");
        const contract = getCertificateRegistry(provider);
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 999);
        const [createdEvents, statusEvents] = await Promise.all([
          contract.queryFilter(contract.filters.AssetCreated(), fromBlock, latestBlock),
          contract.queryFilter(contract.filters.AssetStatusUpdated(), fromBlock, latestBlock),
        ]);

        const latestEventsByAsset = new Map<string, { blockNumber: number; logIndex: number }>();
        [...createdEvents, ...statusEvents].forEach((event) => {
          const eventAssetId = event.args?.assetId as string | undefined;
          if (!eventAssetId) return;

          const current = latestEventsByAsset.get(eventAssetId);
          const isNewer =
            !current ||
            event.blockNumber > current.blockNumber ||
            (event.blockNumber === current.blockNumber && event.logIndex > current.logIndex);

          if (isNewer) {
            latestEventsByAsset.set(eventAssetId, {
              blockNumber: event.blockNumber,
              logIndex: event.logIndex,
            });
          }
        });

        const rows = await Promise.all(
          [...latestEventsByAsset.entries()].map(async ([eventAssetId, position]) => {
            const asset = await contract.getAsset(eventAssetId);
            return {
              assetId: asset.assetId || eventAssetId,
              holderName: asset.holderName || "Chưa có tên người nhận",
              assetName: asset.assetName || "Chưa có tên khóa học",
              status: getStatusText(parseContractStatus(asset.status)),
              blockNumber: position.blockNumber,
              logIndex: position.logIndex,
            };
          })
        );

        const nextList = rows
          .sort(
            (a, b) =>
              b.blockNumber - a.blockNumber ||
              b.logIndex - a.logIndex
          )
          .slice(0, 12);

        setCertificateList(nextList);
        setListMessage(nextList.length ? "" : "Chưa có chứng nhận nào trên contract.");
      } catch (error) {
        setCertificateList([]);
        setListMessage((error as Error).message || "Không thể tải danh sách chứng nhận.");
      }
    };

    loadCertificateList();
  }, [provider, showCertificateList]);

  const handleUpdate = async () => {
    if (!signer) {
      setMessage("Vui lòng kết nối ví Sepolia trước khi cập nhật.");
      return;
    }
    if (canManage === false) {
      setMessage("Bạn không có quyền cập nhật chứng nhận. Chỉ ví của đơn vị phát hành hoặc quản trị viên mới được thực hiện thao tác này.");
      return;
    }
    if (!assetId.trim()) {
      setMessage("Vui lòng nhập mã chứng nhận cần cập nhật.");
      return;
    }

    try {
      setIsUpdating(true);
      setMessage("Đang gửi giao dịch cập nhật trạng thái...");
      const contract = getCertificateRegistry(signer);
      const updateNote = [note, updateDate ? `Update date: ${updateDate}` : ""].filter(Boolean).join(" | ");
      const tx = await contract.updateStatus(assetId.trim(), Number(status), updateNote || "Updated from frontend", {
        gasLimit: 300000,
      });
      await tx.wait();
      setMessage(`Đã cập nhật trạng thái cho ${assetId.trim()}.`);
    } catch (error) {
      const reason = (error as { reason?: string; message?: string }).reason;
      setMessage(reason ? `Giao dịch thất bại: ${reason}` : "Giao dịch thất bại. Kiểm tra mã chứng nhận và trạng thái hiện tại.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="pb-10 lg:pb-14">
      {/* HERO */}
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=80"
            alt="Digital workflow and blockchain update"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/82" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/82 to-emerald-950/48" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-28 lg:px-12 lg:py-32">
          <div className="max-w-5xl">
            <p className="inline-flex rounded-full border border-emerald-200/20 bg-emerald-400/10 px-5 py-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur-sm">
              CẬP NHẬT TRẠNG THÁI
            </p>

            <h1 className="mt-6 pb-2 text-5xl font-extrabold leading-[1.08] tracking-[-0.03em] md:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-emerald-200 via-white to-cyan-200 bg-clip-text text-transparent">
                Quản lý trạng thái chứng nhận minh bạch
              </span>
            </h1>

            <p className="mt-6 max-w-5xl text-lg font-medium leading-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] md:text-xl md:leading-9">
              Mô phỏng bước cập nhật tình trạng của một chứng nhận đã tồn tại.
              Người dùng có thể tra cứu đúng hồ sơ, chọn trạng thái mới và chuẩn bị cho
              bước ghi nhận thay đổi một cách rõ ràng, có kiểm soát.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-white/80">
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                Ethereum Sepolia
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                Update Status Flow
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                Transparent Change Log
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-12 px-6 lg:px-8">
        {/* FLOW */}
        <section>
          <div className="rounded-[32px] border border-slate-100 bg-white/80 px-6 py-8 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 lg:px-8 lg:py-9">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                LUỒNG CẬP NHẬT
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-900 dark:text-slate-100">
                3 bước chính trước khi xác nhận thay đổi
              </h2>

              <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                Quy trình được giữ đơn giản để phù hợp với bản demo PoC, nhưng vẫn thể hiện
                rõ logic quản lý trạng thái chứng nhận trên blockchain.
              </p>
            </div>

            <div className="mt-12 grid items-start gap-8 md:grid-cols-3">
              {updateSteps.map((item) => (
                <FlowStepCard key={item.step} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* FORM */}
        <section>
          <div className="rounded-[32px] border border-slate-100 bg-white/88 p-6 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/75 lg:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-none flex-1">

                <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.03em] bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
  Điều chỉnh trạng thái chứng nhận
</h2>

                <p className="mt-4 text-0xl leading-9 text-slate-600 dark:text-slate-400">
                  Điền thông tin cần thiết để mô phỏng thao tác cập nhật trạng thái và chuẩn bị cho bước ghi nhận thay đổi trên hệ thống.
                </p>
              </div>

              <InfoTooltip />
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {canManage === false && (
                <p className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  Bạn không có quyền cập nhật hoặc xem danh sách chứng nhận. Ví hiện tại chỉ có thể xác thực và xem chi tiết chứng nhận.
                </p>
              )}
              <FieldCard label="Mã chứng nhận">
                <input
                  type="text"
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  placeholder="Ví dụ: CERT-2024-001"
                  className="mt-4 h-14 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                />
              </FieldCard>

              <FieldCard label="Trạng thái mới">
                <select
                  onChange={(event) => setStatus(String(event.currentTarget.selectedIndex + 1))}
                  className="mt-4 h-14 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-800 outline-none transition-all duration-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                >
                  <option>Hợp lệ</option>
                  <option>Tạm dừng</option>
                  <option>Thu hồi</option>
                </select>
              </FieldCard>

              <FieldCard label="Ngày cập nhật">
                <input
                  type="date"
                  value={updateDate}
                  onChange={(event) => setUpdateDate(event.target.value)}
                  className="mt-4 h-14 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                />
              </FieldCard>

              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-5 py-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  GỢI Ý TRẠNG THÁI
                </p>

                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {statusHints.map((item) => (
                    <li key={item.label}>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.label}:
                      </span>{" "}
                      {item.desc}
                    </li>
                  ))}
                </ul>
              </div>

              <FieldCard label="Ghi chú" wide>
                <textarea
                  rows={5}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Mô tả lý do hoặc nội dung thay đổi..."
                  className="mt-4 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4 text-base font-medium text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/30"
                />
              </FieldCard>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating || canManage === false}
                className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-[0_18px_44px_-18px_rgba(16,185,129,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Bắt đầu cập nhật
              </button>

              <button
                type="button"
                onClick={() => {
                  if (canManage === false) {
                    setMessage("Bạn không có quyền xem danh sách chứng nhận. Chỉ ví của đơn vị phát hành hoặc quản trị viên mới được xem danh sách này.");
                    return;
                  }
                  setShowCertificateList(true);
                }}
                className="inline-flex flex-1 items-center justify-center rounded-[22px] border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Xem danh sách
              </button>
            </div>
            {message && (
              <p className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                {message}
              </p>
            )}
          </div>
        </section>
      </div>

      {showCertificateList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Đóng danh sách chứng nhận"
            onClick={() => setShowCertificateList(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]"
          />

          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_40px_120px_-32px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
            <div className="p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                    DANH SÁCH CHỨNG NHẬN
                  </p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                    Chọn chứng nhận cần cập nhật
                  </h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                    Bấm vào một dòng để tự điền mã chứng nhận vào form cập nhật trạng thái.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCertificateList(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ×
                </button>
              </div>

              <div className="mt-7 max-h-[520px] overflow-y-auto pr-1">
                {listMessage && (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    {listMessage}
                  </p>
                )}

                <div className="space-y-3">
                  {certificateList.map((item) => (
                    <button
                      key={item.assetId}
                      type="button"
                      onClick={() => {
                        setAssetId(item.assetId);
                        setShowCertificateList(false);
                        setMessage(`Đã chọn chứng nhận ${item.assetId}.`);
                      }}
                      className="w-full rounded-[22px] border border-slate-100 bg-white px-5 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/70 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {item.assetId}
                          </p>
                          <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">
                            {item.holderName}
                          </p>
                          <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
                            {item.assetName}
                          </p>
                        </div>

                        <StatusBadge status={item.status} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowStepCard({ item }: { item: UpdateStep }) {
  return (
    <div className="group flex h-full flex-col items-center rounded-[28px] px-5 py-6 text-center transition-all duration-300 hover:bg-slate-50 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.16)] dark:hover:bg-slate-950/50">
      <span className="mb-4 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
        BƯỚC {item.step}
      </span>

      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 shadow-sm ring-1 ring-slate-200/70 transition-transform duration-300 group-hover:scale-[1.04] dark:bg-slate-800 dark:ring-slate-700/60">
        <img
          src={item.icon}
          alt={item.title}
          className="h-10 w-10 object-contain"
        />
      </div>

      <h3 className="flex min-h-[96px] max-w-[280px] items-center justify-center text-balance text-center text-[2rem] font-black leading-[1.2] tracking-[-0.03em] text-slate-900 dark:text-slate-100">
        {item.title}
      </h3>

      <p className="mt-4 min-h-[144px] max-w-[320px] text-balance text-lg leading-8 text-slate-600 dark:text-slate-400">
        {item.desc}
      </p>
    </div>
  );
}

function InfoTooltip() {
  return (
    <div className="group relative shrink-0 self-start">
      <div className="flex flex-col items-center">
        <button
          type="button"
          className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Xem tóm tắt cập nhật"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 4.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6.75Zm1.5 10.5h-3a.75.75 0 0 1 0-1.5h.75v-3h-.75a.75.75 0 0 1 0-1.5H12a.75.75 0 0 1 .75.75v3.75h.75a.75.75 0 0 1 0 1.5Z" />
          </svg>
        </button>

        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Tóm tắt cập nhật
        </p>
      </div>

      <div className="pointer-events-none absolute right-0 top-16 z-20 w-[280px] translate-y-2 rounded-[18px] border border-slate-200/90 bg-white/98 p-4 opacity-0 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 backdrop-blur-md transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950/98">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          TÓM TẮT CẬP NHẬT
        </p>

        <div className="mt-3 space-y-2.5">
          <SummaryRow label="Hiện tại" value="Hợp lệ" tone="emerald" />
          <SummaryRow label="Sau cập nhật" value="Thu hồi" tone="rose" />
        </div>

        <div className="mt-3 rounded-[14px] border border-amber-200/70 bg-amber-50/80 px-3.5 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Tác động
          </p>
          <p className="mt-1.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Trạng thái mới sẽ được dùng để đối chiếu ở trang xác thực.
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldCard({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        wide
          ? "md:col-span-2 rounded-[24px] border border-slate-100 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
          : "rounded-[24px] border border-slate-100 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
      }
    >
      <label className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-rose-700 dark:text-rose-300";

  return (
    <div className="rounded-[14px] border border-slate-200/80 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badgeClasses: Record<string, string> = {
    issued: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    revoked: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300",
    created: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
    suspended: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300",
    default: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };

  const normalizedStatus = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const statusTone = normalizedStatus.includes("phat hanh")
    ? "issued"
    : normalizedStatus.includes("thu hoi")
      ? "revoked"
      : normalizedStatus.includes("tam dung")
        ? "suspended"
        : normalizedStatus.includes("tao")
          ? "created"
          : "default";

  return (
    <span
      className={`inline-flex min-w-[140px] justify-center rounded-full border px-3 py-1 text-sm font-bold ${badgeClasses[statusTone]}`}
    >
      {status}
    </span>
  );
}

function getStatusText(status: number | undefined) {
  if (status === 1) return "Đã phát hành";
  if (status === 2) return "Tạm dừng";
  if (status === 3) return "Đã thu hồi";
  return "Đã tạo";
}

function parseContractStatus(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  if (value !== undefined && value !== null) {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? undefined : numericValue;
  }
  return undefined;
}

export default UpdateCertificatePage;

