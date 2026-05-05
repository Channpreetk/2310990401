# Stage 1

Objective
- Provide a clear REST API contract and JSON schemas so front-end developers can display notifications for authenticated users and receive real-time updates.

Core actions the platform must support
- Create/send a notification (system -> user(s))
- Fetch notifications (list, with pagination)
- Fetch a single notification
- Mark notification(s) as read/unread
- Delete/archive notification
- Subscribe to real-time notifications (WebSocket or SSE)

Common headers
- `Authorization`: `Bearer <JWT>` (required)
- `Content-Type`: `application/json`
- `Accept`: `application/json`
- `X-Request-ID`: optional trace id for idempotency/tracing

Key naming conventions
- Use predictable, resource-oriented paths: `/notifications`, `/notifications/{id}`
- Use query parameters for filtering and pagination: `?page=1&limit=20&unread=true`
- Use verbs in endpoints only when action-oriented (e.g., `/notifications/{id}/read`)

Notification object (canonical)
```json
{
  "id": "uuid-v4",
  "recipientId": "user-uuid",
  "type": "COMMENT|ALERT|SYSTEM|MESSAGE",
  "title": "string",
  "body": "string",
  "data": { },
  "isRead": false,
  "createdAt": "2026-05-05T12:34:56Z",
  "expiresAt": "2026-06-05T12:34:56Z" // optional
}
```

Create notification (used by backend services)
- POST /notifications
- Headers: `Authorization: Bearer <service-token>`
- Request body:

```json
{
  "recipientId": "user-uuid-or-null-for-broadcast",
  "recipientIds": ["user-uuid"],
  "type": "ALERT",
  "title": "Payment failed",
  "body": "Your payment of $X failed.",
  "data": { "orderId": "12345" },
  "ttlSeconds": 2592000
}
```

- Success response: `201 Created`
```json
{
  "id": "uuid-v4",
  "status": "queued"
}
```

List notifications (for a user)
- GET /notifications
- Query params: `page` (default 1), `limit` (default 20), `unread`, `type`, `sort` (e.g., `createdAt:desc`)
- Response: `200 OK`

```json
{
  "page": 1,
  "limit": 20,
  "total": 125,
  "items": [ /* Notification objects */ ]
}
```

Get single notification
- GET /notifications/{id}
- Response: `200 OK` with Notification object or `404 Not Found`

Mark as read / unread
- PATCH /notifications/{id}/read
- Body: `{ "isRead": true }`
- Or bulk: `PATCH /notifications/read` with body `{ "ids": ["id1","id2"], "isRead": true }`
- Response: `200 OK` with updated count

Delete / archive
- DELETE /notifications/{id}` or `POST /notifications/{id}/archive`

Errors
- Use standard HTTP codes and a consistent error body:

```json
{
  "code": "NOT_FOUND",
  "message": "Notification not found",
  "requestId": "..."
}
```

Real-time mechanism
- Recommended: WebSocket (bi-directional) for interactive apps; fallback: Server-Sent Events (SSE) for one-way streams.
- Connection flow (WebSocket):
  - Client connects to `wss://api.example.com/notifications/ws` with `Authorization: Bearer <JWT>` header or initial auth message.
  - Server validates token and subscribes connection to recipient's channel (e.g., `user:{userId}`).
  - Server sends events when a new notification arrives or when an existing notification is updated.

Event envelope (WebSocket messages)
```json
{
  "event": "notification.created|notification.updated|notification.read",
  "payload": { /* Notification object */ },
  "timestamp": "2026-05-05T12:34:56Z"
}
```

- For delivery guarantees, include `messageId` and let clients acknowledge (optional). Use at-least-once delivery with idempotency keys in the client.
- For large-scale fanout (broadcasts), use a server-side fanout service (Redis pub/sub, Kafka) and push to connected sockets.

Security & privacy
- Authenticate all endpoints with JWT or OAuth tokens; validate scopes (e.g., `notifications:write`, `notifications:read`).
- Ensure recipientId in create requests is authorized for the calling service.
- Encrypt sensitive `data` field if it contains PII.

Performance & UX
- Provide pagination and time-window filters to limit payload size.
- Provide a lightweight list endpoint for feeds (summary fields) and a full-detail endpoint for single notification fetch.

---

# Stage 2

Persistent storage recommendation
- Primary store: PostgreSQL (relational) for strong querying, ACID, secondary indexes. Use a `notifications` table for canonical data.
- For high write throughput and horizontal scaling of the real-time delivery layer, add Redis (for pub/sub and caching) and optionally Kafka for durable event streaming.
- If the product requires extreme schema flexibility and very large volumes per user, MongoDB (or DynamoDB) is a viable alternative, but SQL gives easier analytics and joins.

PostgreSQL schema (example)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  recipient_id UUID NOT NULL,
  "type" TEXT NOT NULL,
  title TEXT,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_isread ON notifications(recipient_id, is_read);
```

Sample SQL queries
- Fetch page of notifications (most recent first):

```sql
SELECT id, type, title, body, is_read, data, created_at
FROM notifications
WHERE recipient_id = $1 AND archived = false
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

- Count unread:
```sql
SELECT count(*) FROM notifications WHERE recipient_id = $1 AND is_read = false AND archived = false;
```

- Mark as read (single):
```sql
UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2;
```

NoSQL (MongoDB) schema (document)
```json
{
  "_id": ObjectId,
  "recipientId": "user-uuid",
  "type": "ALERT",
  "title": "...",
  "body": "...",
  "data": { },
  "isRead": false,
  "createdAt": ISODate(),
  "expiresAt": ISODate()
}
```

Sample Mongo queries
- Fetch page:
```js
db.notifications.find({ recipientId: userId, archived: false })
  .sort({ createdAt: -1 })
  .skip((page-1)*limit)
  .limit(limit)
```

Scaling & operational notes
- Indexing: index by `recipient_id` and `created_at` for fast per-user feeds.
- Partitioning/sharding: for very large datasets, partition notifications by `recipient_id` hash or by time range. PostgreSQL native partitioning helps with archiving.
- Archiving: move old notifications (e.g., >90 days) to a cheaper table or object store to keep primary table small.
- Caching: use Redis to store recent notifications or unread counts to avoid DB hot reads.
- Fanout strategies:
  - Fanout-on-write: when saving notification, synchronously push to each connected user channel. Good for small fanout sizes.
  - Fanout-on-read: store and compute feeds when users request them. Good for huge broadcast sizes (e.g., system-wide announcements) but increases read cost.
  - Hybrid: use background workers and streaming (Kafka) to process large fanouts and update caches + DB.
- Delivery guarantees: use durable message queue (Kafka/RabbitMQ) for critical notifications; use Redis pub/sub for low-latency socket delivery.

Handling growth problems
- Problem: table growth causing slow queries. Solution: partitioning, archiving, TTLs on data.
- Problem: hot users or high fanout broadcasts. Solution: use streaming (Kafka) with consumer groups and dedicated fanout workers, and rate-limit pushes.
- Problem: real-time socket scale. Solution: use horizontally scalable socket gateways (e.g., clustered socket servers behind a load balancer) with a shared pub/sub (Redis, NATS) to route messages to the right node.

Operational considerations
- Monitoring: track unread counts, queue/backlog sizes, socket connections, delivery latencies, error rates.
- Backfill and replay: keep an event stream (Kafka) if you need replay for missed deliveries.
- GDPR / retention: provide deletion/expiry APIs and encryption-at-rest for sensitive fields.

Deliverables
- This file: `notification_system_design.md` contains the API contract, JSON schemas, real-time envelope, and DB design for Stage 1 and Stage 2.

Next steps (optional)
- I can: generate OpenAPI spec from these endpoints, scaffold a minimal Express/Koa service, or implement a simple WebSocket demo and persistence layer. Tell me which you'd like next.
Stage 1
Core Actions
The notification platform supports the following primary actions:

Fetch Notifications: Retrieve alert history for the logged-in user.

Mark as Read: Update specific notification status.

Delete Notification: Remove an alert from the user's view.

REST API Design
1. Get All Notifications

Endpoint: GET /api/v1/notifications

Headers: Authorization: Bearer <access_token>

Success Response (200 OK):

JSON
[
  {
    "id": "notif-001",
    "message": "Your order has been shipped!",
    "type": "info",
    "isRead": false,
    "createdAt": "2026-05-05T10:00:00Z"
  }
]
2. Mark Notification as Read

Endpoint: PATCH /api/v1/notifications/{id}/read

Headers: Authorization: Bearer <access_token>

Stage 2

Database Schema
SQL
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(10) DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Scalability & Potential Problems
Problem: High data volume leads to slow retrieval times.

Solution: Implement Indexing on the user_id column and establish a retention policy to archive notifications older than 60 days.

Data Persistence Queries
Fetching Notifications:
SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC;

Updating Status:
UPDATE notifications SET status = 'read' WHERE notification_id = ?;


Stage 3: Database OptimizationQuery AnalysisAccuracy: The query is logically correct but performs poorly on large datasets.Performance Issue: With 5,000,000 notifications, the database likely performs a Full Table Scan, checking every row for studentID = 1042.Computation Cost: The cost is $O(N)$, where $N$ is the total row count.Index Advice: Adding indexes to every column is ineffective. While it speeds up reads, it significantly slows down INSERT operations because the database must update every index for each new notification.Proposed SolutionI would implement a Composite Index on (studentID, isRead, createdAt). This allows the database to instantly filter by student and status, while maintaining the sort order.Placement Notification QueryTo find all students who received a "Placement" notification in the last 7 days:SQLSELECT studentID 
FROM notifications 
WHERE notificationType = 'Placement' 
AND createdAt >= CURRENT_DATE - INTERVAL '7 days';
Stage 4: Scalability & PerformanceThe ProblemFetching notifications on every page load for 50,000 students creates a "Thundering Herd" effect, overwhelming the database connection pool.Proposed SolutionsRedis Caching: Store the "Unread Count" or the latest 10 notifications in an in-memory cache.Trade-off: Extremely low latency, but requires logic to ensure the cache is invalidated/updated when a notification is read.Pull vs. Push: Transition from polling to the WebSocket mechanism designed in Stage 1. This ensures the DB is only queried when a new notification actually arrives.Stage 5: High-Volume Notification ProcessingObserved ShortcomingsThe current pseudocode uses a synchronous for-loop. If the send_email API takes 1 second per call, 50,000 students would take over 13 hours to notify. Furthermore, a failure midway (like the 200 failed emails mentioned) stops the entire process, leaving the rest of the students without updates.Reliable Redesign (Message Queues)I recommend using an Asynchronous Message Queue (e.g., RabbitMQ or AWS SQS).Revised Pseudocode:JavaScriptasync function notify_all(student_ids, message) {
    // 1. Add 50k tasks to a message queue immediately (O(N) but very fast)
    for (let id in student_ids) {
        await messageQueue.add({ student_id: id, message: message });
    }
}

// 2. Separate Worker process handles tasks
worker.process(async (task) => {
    try {
        await send_email(task.student_id, task.message);
        await save_to_db(task.student_id, task.message);
        await push_to_app(task.student_id, task.message);
    } catch (err) {
        // If it fails, the task stays in the queue for a retry
        throw new Error("Retry sending notification");
    }
});
Stage 6: Priority Inbox ImplementationApproachTo maintain a top 10 list efficiently, I implement a custom sorting algorithm based on Weight (Placement=3, Result=2, Event=1) and Recency.
public List<Notification> getTop10Notifications(List<Notification> allNotifications) {
    return allNotifications.stream()
        .sorted(Comparator.comparingInt((Notification n) -> {
            switch (n.getType()) {
                case "Placement": return 3;
                case "Result": return 2;
                case "Event": return 1;
                default: return 0;
            }
        }).reversed()
        .thenComparing(Notification::getTimestamp, Comparator.reverseOrder()))
        .limit(10)
        .collect(Collectors.toList());
}

    # Stage 5 (Expanded)

    Context
    - The naive implementation loops synchronously over recipients and calls `send_email`, `save_to_db`, and `push_to_app` inline. At 50k recipients this is too slow and brittle.

    Shortcomings of the naive approach
    - Serial external calls: one slow API call stalls the whole process.
    - Partial failures: an intermittent email API failure leaves inconsistent state across recipients.
    - No batching: inefficient use of email provider APIs and network resources.
    - No retry/DLQ/reconciliation: failed sends may be lost or require manual fixes.

    Reliable redesign (summary)
    - Persist notifications first (DB/outbox), publish a single batch event to a durable queue, then use a horizontally scalable worker pool to:
      - Send emails in batches using provider bulk APIs with retries and backoff.
      - Push in-app notifications asynchronously to sockets/caches.
      - Record per-channel delivery status in `notification_deliveries`.
    - Use DLQ for permanent failures and a reconciliation job to re-enqueue unresolved messages.

    Producer pseudocode (bulk persist + publish)

    ```
    function notify_all(student_ids, message) {
      batch_id = uuid()
      now = now()
      rows = []
      for student_id in student_ids:
        id = uuid()
        rows.append({ id, recipient_id: student_id, type: 'Placement', body: message, status: 'pending', created_at: now, batch_id })
      bulk_insert_notifications(rows)
      publish('notifications.batch.created', { batch_id, ids: [id...], created_at: now })
      return { batch_id }
    }
    ```

    Worker pseudocode (consume + batched sends)

    ```
    on 'notifications.batch.created' event:
      targets = fetch_notifications_by_batch(event.batch_id)
      for chunk in chunk(targets, EMAIL_BATCH_SIZE):
        try:
          resp = email_provider.send_bulk(build_bulk_payload(chunk))
          process_email_results(resp) -- update notification_deliveries
        except TransientError:
          schedule_chunk_retry(chunk)
      concurrently push in-app notifications and update caches/delivery table
      emit_metric('notifications.batch.completed', { batch_id, success_count, failure_count })
    ```

    Idempotency & dedupe
    - Include `notification.id` and idempotency keys in provider requests and delivery records. Use `notification_deliveries` table to ensure a delivery is processed only once per `(notification_id, channel)`.

    Data model additions
    - `notifications`: add `status`, `attempts`, `last_error`, `batch_id`.
    - `notification_deliveries`: `(id, notification_id, channel, provider_id, status, attempts, last_error, last_attempt_at)`.

    Failure strategies
    - Retries: exponential backoff with jitter for transient errors.
    - DLQ: after max attempts move to dead-letter queue and alert.
    - Reconciliation: job that queries non-delivered rows and re-enqueues them.

    Reconciliation SQL (example)

    ```
    SELECT n.id, n.recipient_id
    FROM notifications n
    LEFT JOIN notification_deliveries d ON d.notification_id = n.id AND d.channel = 'email'
    WHERE n.created_at >= NOW() - INTERVAL '1 day'
      AND (d.status IS NULL OR d.status != 'delivered');
    ```

    Bulk email best practices
    - Use provider bulk endpoints, group by template/locale, and apply rate limiting (token-bucket) to stay within provider quotas.

    Monitoring and ops
    - Monitor queue lag, worker throughput, DLQ size, delivery success rate, and provider errors. Alert when DLQ grows or retry rates spike.

    Summary
    - Persist then publish; process in workers with batching, retries, and DLQ; track per-channel delivery and expose metrics. This design supports fast, reliable notifications to 50k+ recipients and provides clear recovery paths when failures occur.

    ## Stage 6

    ### Task
    - Build a Priority Inbox that always returns the top N most important notifications (e.g., top 10) per user. Importance is a combination of `placement` > `result` > `event` and recency.

    ### Constraints
    - You will fetch notifications from the provided Notification API endpoint (no DB writes required): `http://20.207.122.201/evaluation-service/notifications`.
    - Do not store notifications; compute priority on-the-fly or in-memory.

    ### Scoring approach
    - Assign type weights: `Placement = 3`, `Result = 2`, `Event = 1`.
    - Compute a recency score that decays with age. Example: `recency = 1 / (1 + age_hours)` so recent notifications score higher.
    - Combined score: `score = typeWeight * W + recency`, where `W` amplifies type importance (suggested `W = 1000`).

    ### Complexity
    - Naive: fetch M notifications, compute score, sort → O(M log M). Acceptable when M is small (< few thousands).
    - Large M optimization: use a min-heap of size K (top N) to get O(M log K) time and O(K) memory.

    ### Example Node.js implementation (fetch + sort)

    
    async function getTopNNotifications(apiUrl, N = 10) {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('API error ' + res.status);
      const body = await res.json();
      const now = Date.now();

      const typeWeight = w => (w === 'Placement' ? 3 : w === 'Result' ? 2 : 1);

      const scored = (body.notifications || []).map(n => {
        const ts = Date.parse(n.Timestamp || n.timestamp || n.createdAt);
        const ageHours = Math.max(0, (now - ts) / 3600_000);
        const recency = 1 / (1 + ageHours); // recent -> closer to 1
        const weight = typeWeight(n.Type || n.type || n.notificationType);
        const score = weight * 1000 + recency;
        return { n, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, N).map(x => x.n);
    }

    // Usage:
    // getTopNNotifications('http://20.207.122.201/evaluation-service/notifications', 10)
    //   .then(top => console.log(top))
    //   .catch(err => console.error(err));
    ```

    ### Min-heap optimization (for large M)

    ```js
    class MinHeap {
      constructor(compare) { this.compare = compare; this.data = []; }
      push(x) {
        this.data.push(x); this._siftUp(this.data.length - 1);
        return this;
      }
      pop() { if (!this.data.length) return null; const top = this.data[0]; const last = this.data.pop(); if (this.data.length) { this.data[0] = last; this._siftDown(0);} return top; }
      size() { return this.data.length }
      _siftUp(i) { while (i > 0) { const p = Math.floor((i-1)/2); if (this.compare(this.data[i], this.data[p]) >= 0) break; [this.data[i], this.data[p]] = [this.data[p], this.data[i]]; i = p; } }
      _siftDown(i) { const n = this.data.length; while (true) { let l = 2*i+1, r = l+1, smallest = i; if (l < n && this.compare(this.data[l], this.data[smallest]) < 0) smallest = l; if (r < n && this.compare(this.data[r], this.data[smallest]) < 0) smallest = r; if (smallest === i) break; [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]; i = smallest; } }
    }

    async function getTopNNotificationsHeap(apiUrl, N = 10) {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error('API error ' + res.status);
      const body = await res.json();
      const now = Date.now();

      const weightOf = w => (w === 'Placement' ? 3 : w === 'Result' ? 2 : 1);

      const heap = new MinHeap((a, b) => a.score - b.score);
      for (const n of (body.notifications || [])) {
        const ts = Date.parse(n.Timestamp || n.timestamp || n.createdAt);
        const ageHours = Math.max(0, (now - ts) / 3600_000);
        const recency = 1 / (1 + ageHours);
        const w = weightOf(n.Type || n.type || n.notificationType);
        const score = w * 1000 + recency;
        const item = { n, score };
        if (heap.size() < N) heap.push(item);
        else if (score > heap.data[0].score) { heap.pop(); heap.push(item); }
      }

      const out = [];
      while (heap.size()) out.push(heap.pop());
      return out.sort((a,b)=>b.score-a.score).map(x=>x.n);
    }
    ```

    ### Notes
    - Choose `W` (type weight multiplier) to reflect how strongly type should dominate recency. Tunable via A/B testing.
    - If API returns only a small recent window, on-the-fly sorting is simplest. If API can return very large lists, prefer the heap approach.
    - Consider caching the top-N result per user for a short TTL (e.g., 30–60s) to reduce repeated computation.

    ### Complexity recap
    - Sort approach: O(M log M) time, O(M) memory.
    - Heap approach: O(M log K) time, O(K) memory (K = desired top N).

    ### Deliverables
    - Algorithm explanation, sample Node.js implementations (`getTopNNotifications` and `getTopNNotificationsHeap`), trade-offs, and complexity.

## Stage 7

### Front-end implementation completed
- Framework: Next.js (JavaScript, App Router)
- Path: `notification-app`
- Features implemented:
  - Fetch notifications via local proxy route that forwards to `http://20.207.122.201/evaluation-service/notifications`
  - Query support: `limit`, `page`, `notification_type`
  - Responsive dashboard UI for desktop/mobile
  - Priority Inbox (top 10) with type + recency scoring
  - Full notification list with type/read badges

### Security handling
- Bearer token is read server-side from `.env.local` as `EVAL_API_TOKEN`.
- Client calls local route `/api/notifications` so token is not exposed in browser code.

### Main files
- `notification-app/src/app/page.js`
- `notification-app/src/app/api/notifications/route.js`
- `notification-app/src/lib/notifications.js`
- `notification-app/src/components/PriorityInbox.js`
- `notification-app/src/components/NotificationList.js`

### Run steps
1. `cd notification-app`
2. `npm install`
3. create `.env.local` with `EVAL_API_TOKEN=<your_token>`
4. `npm run dev`

### Validation status
- `npm run lint` passed.
- `npm run build` passed.
