import type { CampusNode } from "../data/campus";

type BubbleProps = {
  node: CampusNode;
  onClick: (node: CampusNode) => void;
  notificationCount?: number;
  requestCount?: number;
};

function Bubble({
  node,
  onClick,
  notificationCount = 0,
  requestCount = 0
}: BubbleProps) {
  const isCommunity = node.type === "organisation";
  const isMyClass = node.description === "MY CLASS";

  const getSymbol = () => {
    switch (node.type) {
      case "institution":
        return "✦";
      case "department":
        return "⌘";
      case "class":
        return "▦";
      case "organisation":
        return "⚑";
      case "group":
        return "◎";
      default:
        return "✧";
    }
  };

  return (
    <button
      className={`bubble bubble-${node.type} ${
        isCommunity ? `bubble-club-${node.id}` : ""
      } ${isMyClass ? "bubble-my-class" : ""}`}
      onClick={() => onClick(node)}
      type="button"
    >
      {notificationCount > 0 && (
        <span className="bubble-notification-badge">
          {notificationCount > 99 ? "99+" : notificationCount}
        </span>
      )}

      {requestCount > 0 && (
        <span
          className={`bubble-request-badge ${
            notificationCount > 0
              ? "bubble-request-badge-stacked"
              : ""
          }`}
        >
          {requestCount > 99 ? "99+" : requestCount}
        </span>
      )}

      {!isCommunity && (
        <>
          <span className="bubble-symbol">{getSymbol()}</span>
          <span className="bubble-description">
            {node.description}
          </span>
        </>
      )}

      <strong>{node.name}</strong>
    </button>
  );
}

export default Bubble;