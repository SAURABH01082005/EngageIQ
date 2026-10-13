import "./AppShell.css";

function AppShell({ children, scroll = false, className = "", size = "lg" }) {
  return (
    <div className="app-viewport">
      <div
        className={[
          "app-shell",
          "liquid-glass",
          scroll && "app-shell--scroll",
          size && `app-shell--${size}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

export default AppShell;
