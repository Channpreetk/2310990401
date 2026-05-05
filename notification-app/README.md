# Notification Frontend (Stage 7)

Responsive Next.js frontend for notifications with:

- list view from the evaluation API
- top-N Priority Inbox
- filtering (`notification_type`)
- pagination (`page`, `limit`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```env
EVAL_API_TOKEN=your_bearer_token_here
```

3. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## API flow

- Client calls local route: `/api/notifications?limit=10&page=1&notification_type=Placement`
- Route handler proxies to: `http://20.207.122.201/evaluation-service/notifications`
- Bearer token is attached on the server using `EVAL_API_TOKEN`

## Key files

- `src/app/page.js`: UI + controls + data fetching
- `src/app/api/notifications/route.js`: secure proxy route
- `src/components/PriorityInbox.js`: top-N prioritized notifications
- `src/components/NotificationList.js`: notifications feed
- `src/lib/notifications.js`: response normalization + scoring logic

## Stage 7 Compliance Checklist

- [x] Uses the expanded Notifications API endpoint
- [x] Supports required query parameters: `limit`, `page`, `notification_type`
- [x] Supports required notification types: `Event`, `Result`, `Placement`
- [x] Shows desktop and mobile responsive UI
- [x] Includes priority inbox with top-N ranking
- [x] Includes filtering and pagination controls

## Quick Validation Commands

Run these from the workspace root to verify API behavior with your token:

```bash
node -e "const fs=require('fs');const t=fs.readFileSync('notification-app/.env.local','utf8').match(/EVAL_API_TOKEN=(.*)/)[1].trim();(async()=>{const r=await fetch('http://20.207.122.201/evaluation-service/notifications?limit=10&page=1',{headers:{Authorization:'Bearer '+t}});const j=await r.json();console.log('base',r.status,Array.isArray(j.notifications)?j.notifications.length:'n/a');})();"
```

```bash
node -e "const fs=require('fs');const t=fs.readFileSync('notification-app/.env.local','utf8').match(/EVAL_API_TOKEN=(.*)/)[1].trim();(async()=>{for (const type of ['Event','Result','Placement']){const u='http://20.207.122.201/evaluation-service/notifications?limit=10&page=1&notification_type='+encodeURIComponent(type);const r=await fetch(u,{headers:{Authorization:'Bearer '+t}});const j=await r.json();console.log(type,r.status,Array.isArray(j.notifications)?j.notifications.length:'n/a');}})();"
```

## Submission Evidence (No Video Alternative)

If you cannot provide a recording, submit with structured evidence:

1. Add 4 screenshots:
	- Desktop view with loaded notifications.
	- Type filter switched (Event/Result/Placement).
	- Different page and limit values.
	- Mobile responsive view.
2. Include terminal proof of validation commands (status 200 for base + each type).


