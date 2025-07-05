import { useState } from "react";
import { BusinessCardQR, type BusinessCardQRProps } from "./BusinessCardQR";

export const PrintPreviewQR = ({
  qrProps,
}: {
  qrProps: BusinessCardQRProps;
}) => {
  const [previewMode, setPreviewMode] = useState<"screen" | "print">("screen");

  // 名刺サイズシミュレーション（89mm × 51mm）
  const businessCardStyle = {
    width: "89mm",
    height: "51mm",
    border: "1px solid #ccc",
    padding: "5mm",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  };

  return (
    <div className="print-preview-container">
      <div className="preview-controls">
        <button
          onClick={() => setPreviewMode("screen")}
          className={previewMode === "screen" ? "active" : ""}
        >
          画面表示
        </button>
        <button
          onClick={() => setPreviewMode("print")}
          className={previewMode === "print" ? "active" : ""}
        >
          印刷プレビュー
        </button>
      </div>

      <div className="preview-area">
        {previewMode === "print" ? (
          <div style={businessCardStyle}>
            <BusinessCardQR
              {...qrProps}
              size={80} // 名刺サイズ（約2cm×2cm）
            />
          </div>
        ) : (
          <BusinessCardQR {...qrProps} size={300} />
        )}
      </div>
    </div>
  );
};
