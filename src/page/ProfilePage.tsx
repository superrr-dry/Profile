import { useEffect } from "react";

interface SkillItem {
  name: string;
  level: number;
  category: "frontend" | "backend" | "devops" | "mobile";
}

interface AppLink {
  name: string;
  description: string;
  platform: "ios" | "android" | "web";
  url: string;
  icon?: string;
}

const ProfilePage = () => {
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

  // スキルデータ
  const skills: SkillItem[] = [
    { name: "React", level: 90, category: "frontend" },
    { name: "TypeScript", level: 85, category: "frontend" },
    { name: "Node.js", level: 80, category: "backend" },
    { name: "AWS", level: 85, category: "devops" },
    { name: "Docker", level: 88, category: "devops" },
    { name: "Kubernetes", level: 75, category: "devops" },
    { name: "React Native", level: 70, category: "mobile" },
    { name: "Swift", level: 65, category: "mobile" },
  ];

  // アプリリンク
  const apps: AppLink[] = [
    {
      name: "DevOps Monitor",
      description: "Kubernetes クラスター監視アプリ",
      platform: "ios",
      url: "https://apps.apple.com/app/your-devops-app",
      icon: "📱",
    },
    {
      name: "Infrastructure Tracker",
      description: "AWSリソース管理ツール",
      platform: "android",
      url: "https://play.google.com/store/apps/details?id=your.app",
      icon: "🔧",
    },
    {
      name: "Portfolio Dashboard",
      description: "プロジェクト管理ダッシュボード",
      platform: "web",
      url: "https://your-portfolio-dashboard.com",
      icon: "🖥️",
    },
  ];

  // スキルシートのリンク
  const skillSheetLinks = [
    {
      title: "詳細スキルシート (PDF)",
      url: "/assets/skill-sheet.pdf",
      icon: "📄",
      description: "技術スキルの詳細な評価レポート",
    },
    {
      title: "GitHub Profile",
      url: "https://github.com/yourusername",
      icon: "🐙",
      description: "ソースコードとプロジェクト履歴",
    },
    {
      title: "LinkedIn Profile",
      url: "https://linkedin.com/in/yourusername",
      icon: "💼",
      description: "職歴と推薦状",
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
      default:
        return "💻";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "ios":
        return "🍎";
      case "android":
        return "🤖";
      case "web":
        return "🌐";
      default:
        return "📱";
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
          <h1>Your Name</h1>
          <h2>DevOps Engineer</h2>
          <p>
            フルスタック開発からインフラ運用まで、モダンな技術スタックでスケーラブルなシステムを構築します。
          </p>
        </div>
      </header>

      {/* スキルセクション */}
      <section id="skills" className="skills-section">
        <h3>🛠️ Technical Skills</h3>
        <div className="skills-grid">
          {["frontend", "backend", "devops", "mobile"].map((category) => (
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
                        <span className="skill-level">{skill.level}%</span>
                      </div>
                      <div className="skill-bar">
                        <div
                          className="skill-progress"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* スキルシートリンク */}
      <section className="documents-section">
        <h3>📋 Skill Sheets & Documents</h3>
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
              <div className="external-link-icon">↗️</div>
            </a>
          ))}
        </div>
      </section>

      {/* アプリリンク */}
      <section id="apps" className="apps-section">
        <h3>📱 My Applications</h3>
        <div className="apps-grid">
          {apps.map((app, index) => (
            <a
              key={index}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="app-card"
            >
              <div className="app-header">
                <div className="app-icon">{app.icon}</div>
                <div className="platform-badge">
                  {getPlatformIcon(app.platform)} {app.platform.toUpperCase()}
                </div>
              </div>
              <div className="app-content">
                <h4>{app.name}</h4>
                <p>{app.description}</p>
              </div>
              <div className="app-action">
                <span>
                  {app.platform === "ios"
                    ? "App Store"
                    : app.platform === "android"
                      ? "Google Play"
                      : "Open Web App"}
                </span>
                <span className="arrow">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 連絡先 */}
      <section className="contact-section">
        <h3>📞 Contact</h3>
        <div className="contact-info">
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <a href="mailto:your.email@example.com">your.email@example.com</a>
          </div>
          <div className="contact-item">
            <span className="contact-icon">🌐</span>
            <a
              href="https://your-portfolio.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              your-portfolio.com
            </a>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📱</span>
            <span>+81-90-1234-5678</span>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="profile-footer">
        <p>© 2025 Your Name - DevOps Engineer</p>
        <p>このページはQRコードからアクセスされました 📱</p>
      </footer>
    </div>
  );
};

export default ProfilePage;
