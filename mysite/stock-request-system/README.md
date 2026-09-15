# StockFlow - LocalStorage Stock Request & Approval System

## Technology
- HTML
- CSS
- Vanilla JavaScript
- Browser LocalStorage
- No backend / no database / no framework

## Roles & Demo Login

| Role | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| Pune Requester | pune | pune123 |
| Approver | approver | approve123 |

## Workflow
1. Admin adds and manages stock.
2. Pune User creates an item request.
3. Request starts with `Pending` status.
4. Approver reviews request.
5. Approver must enter a reason/note.
6. If approved:
   - Request becomes `Approved`
   - Requested quantity is deducted from stock.
7. If rejected:
   - Request becomes `Rejected`
   - Stock does not change.
8. User can see request status, decision reason and timeline.

## Features

### Admin
- Dashboard
- Add stock item
- Edit stock item
- Adjust quantity
- Delete stock item
- Low stock indicator
- View all requests

### Pune User
- Dashboard
- View available stock
- Create item request
- Validate requested quantity against current stock
- My request history
- View approval/rejection reason
- Request timeline

### Approver
- Dashboard
- Pending approval queue
- See requested quantity and current available stock
- Approve with note/reason
- Reject with mandatory reason
- Approved quantity automatically deducted from stock
- View all request history

## Run
Just extract the ZIP and open `index.html` in Chrome/Edge.

For best results you can also use VS Code Live Server, but it is not required.

## Reset Demo Data
Open browser DevTools > Application > Local Storage and clear the site data, then refresh.

LocalStorage keys:
- `sf_users_v1`
- `sf_stock_v1`
- `sf_requests_v1`
- `sf_session_v1`

## Important
This is a frontend-only demo. Passwords are stored in LocalStorage/plain JavaScript for demo purposes only.
For a real production application use a backend API, proper authentication, authorization and a database.
