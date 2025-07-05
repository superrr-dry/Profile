import { useState, useEffect, useMemo } from "react";
import { BusinessCardQR } from "./BusinessCardQR";

const QRCodeGenerator = () => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [previewMode, setPreviewMode] = useState<"screen" | "print">("screen");

  // リサイズ監視
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", updateSize);
    updateSize();

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // レスポンシブサイズ計算
  const responsiveSize = useMemo(() => {
    const baseSize = 300;
    if (windowSize.width < 768)
      return Math.min(baseSize * 0.8, windowSize.width * 0.8);
    if (windowSize.width < 1024) return baseSize * 0.9;
    return baseSize;
  }, [windowSize.width]);

  // プロジェクトルートURL
  const baseUrl = window.location.origin;
  const profileUrl = `${baseUrl}/`;

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
    margin: "20px auto",
  };

  return (
    <div className="qr-generator-container">
      <h2>DevOps Portfolio QR Code Generator</h2>

      {/* プレビューモード切り替え */}
      <div className="preview-controls">
        <button
          onClick={() => setPreviewMode("screen")}
          className={`preview-btn ${previewMode === "screen" ? "active" : ""}`}
        >
          画面表示
        </button>
        <button
          onClick={() => setPreviewMode("print")}
          className={`preview-btn ${previewMode === "print" ? "active" : ""}`}
        >
          印刷プレビュー
        </button>
      </div>

      {/* URL表示 */}
      <div
        style={{
          background: "#f8fafc",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 5px 0", fontWeight: "600", color: "#374151" }}>
          QRコードのリンク先:
        </p>
        <code
          style={{
            background: "#e5e7eb",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "0.9rem",
            color: "#1f2937",
          }}
        >
          {profileUrl}
        </code>

        {/* 開発環境での確認方法 */}
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            background: "#fef3c7",
            borderRadius: "6px",
            fontSize: "0.9rem",
          }}
        >
          <strong>🔧 開発環境での確認:</strong>
          <br />
          スマホで QRコード読取 → <code>{baseUrl}/</code> が開く
        </div>
      </div>

      {/* QRコード表示エリア */}
      <div className="qr-content">
        {previewMode === "print" ? (
          <div style={businessCardStyle}>
            <BusinessCardQR
              websiteUrl={profileUrl}
              size={80} // 名刺サイズ（約2cm×2cm）
              errorCorrectionLevel="Q"
              customization={{
                bgColor: "#ffffff",
                fgColor: "#2563eb",
              }}
            />
          </div>
        ) : (
          <BusinessCardQR
            websiteUrl={profileUrl}
            size={responsiveSize}
            errorCorrectionLevel="Q"
            customization={{
              bgColor: "#ffffff",
              fgColor: "#2563eb",
            }}
          />
        )}
      </div>

      {/* 説明文 */}
      <div className="qr-info">
        <h3>📱 QRコード仕様</h3>
        <ul>
          <li>
            QRコードをスキャンすると <strong>プロフィールページ</strong>{" "}
            が開きます
          </li>
          <li>
            リンク先: <code>{profileUrl}</code>
          </li>
          <li>スキル・アプリ・連絡先がすべて1ページで確認できます</li>
        </ul>

        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: "8px",
            padding: "15px",
            marginTop: "15px",
          }}
        >
          <h4 style={{ color: "#047857", margin: "0 0 10px 0" }}>
            📋 開発環境での動作確認方法
          </h4>
          <ol style={{ color: "#065f46", margin: 0 }}>
            <li>スマートフォンでQRコードリーダーを起動</li>
            <li>このQRコードをスキャン</li>
            <li>
              <code>{baseUrl}/</code> が開く
            </li>
            <li>プロフィールページが表示されることを確認</li>
            <li>同一Wi-Fi環境なら他デバイスからもアクセス可能</li>
          </ol>
        </div>

        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            padding: "15px",
            marginTop: "15px",
          }}
        >
          <h4 style={{ color: "#92400e", margin: "0 0 10px 0" }}>
            ⚠️ 本番環境での注意
          </h4>
          <p style={{ color: "#92400e", margin: 0 }}>
            本番デプロイ時は <code>baseUrl</code> が実際のドメイン（例:
            https://your-domain.com）に変更されます。
            <br />
            QRコードは本番URL用に再生成してください。
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
