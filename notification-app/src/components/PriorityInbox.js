import styles from "./PriorityInbox.module.css";
import { getPriorityTopN } from "@/lib/notifications";

export default function PriorityInbox({ notifications, topN = 10 }) {
  const topNotifications = getPriorityTopN(notifications, topN);

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <h2>Priority Inbox</h2>
        <span>Top {topN}</span>
      </div>

      {topNotifications.length === 0 ? (
        <p className={styles.empty}>No notifications found for this query.</p>
      ) : (
        <ul className={styles.list}>
          {topNotifications.map((item) => (
            <li key={`${item.id}-priority`} className={styles.item}>
              <div className={styles.type}>{item.type}</div>
              <p>{item.title}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
