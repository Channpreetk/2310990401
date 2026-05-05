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
Database Choice
I suggest using PostgreSQL. As a student focusing on SQL and database management, I chose this for its strong data integrity and ability to handle complex user-notification relationships.

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