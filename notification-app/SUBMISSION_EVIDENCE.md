# Submission Evidence (No Video)

This report is used when a video recording is not available.

## Requirement Coverage

- Frontend implemented with React/Next.js: Yes
- Endpoint used: http://20.207.122.201/evaluation-service/notifications
- Required query parameters supported: limit, page, notification_type
- Required types supported: Event, Result, Placement
- Desktop and mobile responsive UI: Yes
- Priority inbox (top-N): Yes

## Validation Results

Use the output from the README validation commands and paste results below.

### Base Query
- Command: notifications?limit=10&page=1
- Status: 200
- Notes: ______________________________________

### Type Query - Event
- Status: 200
- Notes: ______________________________________

### Type Query - Result
- Status: 200
- Notes: ______________________________________

### Type Query - Placement
- Status: 200
- Notes: ______________________________________

## Screenshot Evidence

Place screenshots in notification-app/evidence/ with these names:

1. desktop-loaded.png
2. filter-type.png
3. pagination-limit.png
4. mobile-view.png

## Reviewer Notes

- Token is handled server-side via EVAL_API_TOKEN in .env.local.
- Notification API is called through local proxy route /api/notifications.
- Lint and build pass.
