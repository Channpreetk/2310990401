const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function pickDateValue(item) {
  return item.createdAt || item.timestamp || item.Timestamp || item.created_at;
}

function pickTypeValue(item) {
  return item.type || item.Type || item.notificationType || item.notification_type || "Event";
}

export function normalizeNotificationsResponse(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.notifications || payload?.items || payload?.data || [];

  return list.map((item, index) => {
    const createdAtRaw = pickDateValue(item);
    const createdAt = createdAtRaw ? new Date(createdAtRaw).toISOString() : new Date().toISOString();

    return {
      id: item.id || item.notificationId || item.notification_id || `generated-${index}`,
      title: item.title || item.subject || pickTypeValue(item),
      body: item.body || item.message || item.description || "",
      type: pickTypeValue(item),
      createdAt,
      isRead: Boolean(item.isRead ?? item.is_read ?? false),
    };
  });
}

export function getPriorityTopN(notifications, topN) {
  const now = Date.now();

  return [...notifications]
    .map((item) => {
      const timestamp = Date.parse(item.createdAt);
      const ageHours = Math.max(0, (now - timestamp) / 3600000);
      const recency = 1 / (1 + ageHours);
      const weight = TYPE_WEIGHT[item.type] || 1;
      return {
        ...item,
        score: weight * 1000 + recency,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
