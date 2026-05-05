"use client";

import { useEffect, useMemo, useState } from "react";
import NotificationList from "@/components/NotificationList";
import PriorityInbox from "@/components/PriorityInbox";
import styles from "./page.module.css";
import { normalizeNotificationsResponse } from "@/lib/notifications";

export default function Home() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [notificationType, setNotificationType] = useState("all");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("page", String(page));
    if (notificationType !== "all") {
      params.set("notification_type", notificationType);
    }
    return params.toString();
  }, [limit, page, notificationType]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/notifications?${query}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Request failed (${response.status})`);
        }

        const json = await response.json();
        setNotifications(normalizeNotificationsResponse(json));
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setNotifications([]);
          setError(requestError.message || "Failed to load notifications");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [query]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Evaluation Dashboard</p>
          <h1>Notification Inbox</h1>
          <p>
            Responsive feed for all notifications with type filtering,
            pagination, and a top-N Priority Inbox.
          </p>
        </section>

        <section className={styles.controls}>
          <label>
            Type
            <select
              value={notificationType}
              onChange={(event) => {
                setNotificationType(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="Placement">Placement</option>
              <option value="Result">Result</option>
              <option value="Event">Event</option>
            </select>
          </label>

          <label>
            Per page
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>

          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={loading}
            >
              Next
            </button>
          </div>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.grid}>
          <PriorityInbox notifications={notifications} topN={10} />
          <NotificationList
            notifications={notifications}
            loading={loading}
            activeType={notificationType}
            page={page}
            limit={limit}
          />
        </div>
      </main>
    </div>
  );
}
