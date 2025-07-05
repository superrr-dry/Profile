import { useMemo, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export type BusinessCardQRProps = {
  websiteUrl: string;
  size?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  customization?: {
    bgColor?: string;
    fgColor?: string;
    logoUrl?: string;
  };
};

export const BusinessCardQR = ({
  websiteUrl,
  size = 300, // 名刺用に最適化されたサイズ
  errorCorrectionLevel = "Q", // 25%エラー訂正（名刺の損傷に対応）
  customization = {},
}: BusinessCardQRProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

  // URL検証とエンコーディング
  const validatedUrl = useMemo(() => {
    try {
      const url = new URL(websiteUrl);
      return url.toString();
    } catch {
      return websiteUrl.startsWith("http")
        ? websiteUrl
        : `https://${websiteUrl}`;
    }
  }, [websiteUrl]);

  // 高解像度PNG生成（印刷用）
  const downloadHighResPNG = useCallback(async () => {
    if (!qrRef.current) return;

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(qrRef.current, {
        width: size * 4, // 300DPI対応の4倍解像度
        height: size * 4,
        pixelRatio: 4,
        backgroundColor: customization.bgColor || "#ffffff",
      });

      const link = document.createElement("a");
      link.download = "business-card-qr-300dpi.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("QR code download failed:", error);
    }
  }, [size, customization.bgColor]);

  // SVG生成（ベクター形式・印刷最適）
  const downloadSVG = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "business-card-qr.svg";
    link.click();

    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="business-card-qr-container">
      <div
        ref={qrRef}
        className="qr-code-wrapper"
        style={{
          padding: `${size * 0.15}px`, // 適切なquiet zone（15%）
          backgroundColor: customization.bgColor || "#ffffff",
        }}
      >
        <QRCodeSVG
          value={validatedUrl}
          size={size}
          level={errorCorrectionLevel}
          bgColor={customization.bgColor || "#FFFFFF"}
          fgColor={customization.fgColor || "#000000"}
          marginSize={4} // 4モジュールのquiet zone
          imageSettings={
            customization.logoUrl
              ? {
                  src: customization.logoUrl,
                  height: size * 0.2,
                  width: size * 0.2,
                  excavate: true, // ロゴ部分を掘り抜く
                  opacity: 1,
                }
              : undefined
          }
          title="DevOps Portfolio QR Code"
        />
      </div>

      <div className="download-controls">
        <button onClick={downloadHighResPNG} className="download-btn">
          高解像度PNG (300DPI)
        </button>
        <button onClick={downloadSVG} className="download-btn">
          ベクターSVG (印刷最適)
        </button>
      </div>
    </div>
  );
};
