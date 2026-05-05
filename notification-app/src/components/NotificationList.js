import styles from "./NotificationList.module.css";

export default function NotificationList({ notifications, loading, activeType, page, limit }) {
  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <h2>All Notifications</h2>
        <span>
          {loading ? "Loading" : `${notifications.length} item(s)`} | Page {page} | {limit}/page
          {activeType === "all" ? "" : ` | ${activeType}`}
        </span>
      </div>

      {loading ? (
        <p className={styles.empty}>Fetching notifications...</p>
      ) : notifications.length === 0 ? (
        <p className={styles.empty}>No notifications found.</p>
      ) : (
        <ul className={styles.list}>
          {notifications.map((item) => (
            <li key={item.id} className={item.isRead ? styles.read : styles.unread}>
              <div className={styles.badges}>
                <span>{item.type}</span>
                <span>{item.isRead ? "Read" : "Unread"}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
