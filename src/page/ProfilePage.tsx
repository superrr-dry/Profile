import { useEffect } from "react";
import { useSkills } from "../hooks/useSkills";


interface AppLink {
  name: string;
  description: string;
  platforms: Array<{
    type: "ios" | "android" | "web";
    url: string;
  }>;
  icon?: string;
}

const ProfilePage = () => {
  // スキルデータを静的JSONファイルから取得
  const { skills, loading, error, lastUpdated, refetchSkills } = useSkills();

  // URLハッシュに基づいてスクロールする
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, []);

  // アプリリンク
  const apps: AppLink[] = [
    {
      name: "OwnReview",
      description: "新感覚レビュー型SNS！投稿に五段階評価を付けて本音を共有。 リアルな評価があなたの選択をサポート。 ",
      platforms: [
        {
          type: "ios",
          url: "https://apps.apple.com/us/app/ownreview/id6743192347"
        },
        {
          type: "android",
          url: "https://play.google.com/store/apps/details?id=com.ownreview.ownreview"
        }
      ],
      icon: "",
    },
  ];

  // スキルシートのリンク
  const skillSheetLinks = [
    {
      title: "経歴書",
      url: "https://docs.google.com/spreadsheets/d/1lgPviAVsiMyNAWr5ajNXJ2s4MbF-RtpM4X-V-QrUjIo/edit?gid=1779571354#gid=1779571354",
      icon: "📄",
      description: "スキルシート",
    },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "frontend":
        return "🎨";
      case "backend":
        return "⚙️";
      case "devops":
        return "🚀";
      case "mobile":
        return "📱";
      case "tools":
        return "🔧";
      default:
        return "💻";
    }
  };


  return (
    <div className="profile-page">
      {/* ヘッダー */}
      <header className="profile-header">
        <div className="profile-avatar">
          <img
            src="/avatar.jpg"
            alt="Profile"
            className="avatar-image"
            onError={(e) => {
              e.currentTarget.src =
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzciIHI9IjE1IiBmaWxsPSIjNjU3Mzg4Ii8+CjxwYXRoIGQ9Ik0yNSA3NUMyNSA2Ni43MTU3IDMxLjcxNTcgNjAgNDAgNjBINjBDNjguMjg0MyA2MCA3NSA2Ni43MTU3IDc1IDc1VjgwSDI1Vjc1WiIgZmlsbD0iIzY1NzM4OCIvPgo8L3N2Zz4K";
            }}
          />
        </div>
        <div className="profile-info">
          <h1>渡辺 一善</h1>
          <h2>プログラマー</h2>
          <p>
            ユーザーの課題を解決し、安心してお使いいただけるシステムを作ります。<br />
            現実的な制約を考慮しながら、確実に成果につながる提案をします
          </p>
        </div>
      </header>


      {/* スキルシートリンク */}
      <section className="documents-section">
        <h3>📋 経歴</h3>
        <div className="document-links">
          {skillSheetLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="document-card"
            >
              <div className="document-icon">{link.icon}</div>
              <div className="document-content">
                <h4>{link.title}</h4>
                <p>{link.description}</p>
              </div>
              <div className="external-link-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15,3 21,3 21,9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* アプリリンク */}
      <section id="apps" className="apps-section">
        <h3>📱 アプリ</h3>
        <div className="apps-grid">
          {apps.map((app, index) => (
            <div key={index} className="app-card">
              <div className="app-header">
                <div className="app-icon">{app.icon}</div>
                <h4>{app.name}</h4>
              </div>
              <div className="app-content">
                <p>{app.description}</p>
              </div>
              <div className="app-actions">
                {app.platforms.map((platform, platformIndex) => (
                  <a
                    key={platformIndex}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`download-badge ${platform.type}`}
                  >
                    {platform.type === "ios" ? (
                      <img 
                        src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                        alt="Download on the App Store"
                        className="badge-image"
                      />
                    ) : platform.type === "android" ? (
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                        alt="Get it on Google Play"
                        className="badge-image"
                        style={{width: '155px', height: '60px', objectFit: 'contain'}}
                        loading="lazy"
                      />
                    ) : (
                      <div className="web-badge">
                        <span className="store-icon">🌐</span>
                        <div className="button-content">
                          <span className="store-name">Open Web App</span>
                        </div>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* スキルセクション */}
      <section id="skills" className="skills-section">
        <div className="skills-header">
          <h3>🛠️ スキル経歴</h3>
          {lastUpdated && (
            <div className="skills-meta">
              <div className="data-info">
                <span className="last-updated">
                  最終更新: {lastUpdated.toLocaleDateString('ja-JP')} {lastUpdated.toLocaleTimeString('ja-JP')}
                </span>
              </div>
              <button 
                onClick={refetchSkills} 
                className="refresh-btn"
                disabled={loading}
              >
                🔄 更新
              </button>
            </div>
          )}
        </div>
        
        {loading && <div className="loading">スキルデータを読み込み中...</div>}
        {error && (
          <div className="error">
            エラー: {error}
            <button onClick={refetchSkills} className="retry-btn">再試行</button>
          </div>
        )}
        
        <div className="skills-grid">
          {["frontend", "backend", "devops", "mobile", "tools"].map((category) => (
            <div key={category} className="skill-category">
              <h4>
                {getCategoryIcon(category)}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h4>
              <div className="skill-items">
                {skills
                  .filter((skill) => skill.category === category)
                  .map((skill) => (
                    <div key={skill.name} className="skill-item">
                      <div className="skill-info">
                        <span className="skill-name">{skill.name}</span>
                        {skill.experience && (
                          <span className="skill-experience">{skill.experience}</span>
                        )}
                      </div>
                      <div className="skill-bar">
                        <div
                          className="skill-progress"
                          style={{ width: `${Math.min(100, (skill.level / 36) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* 連絡先 */}
      <section className="contact-section">
        <h3>📞 連絡先</h3>
        <div className="contact-info">
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <a href="mailto:gouhuishe@gmail.com">gouhuishe@gmail.com</a>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="profile-footer">
        <p>© 2025 Ituski Watanabe - Profile Page</p>
      </footer>
    </div>
  );
};

export default ProfilePage;
