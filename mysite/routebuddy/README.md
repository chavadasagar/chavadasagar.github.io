# RouteBuddy Prototype V2

This version follows the revised onboarding:

1. Select only: Vehicle / No Vehicle
2. Enter name
3. Select job status and route
   - I have a job
   - Looking for job
4. If user has no vehicle, enter monthly budget
5. Final matching list based on role

Matching logic:
- Vehicle owners see users who do not have a vehicle.
- Users without a vehicle see:
  - vehicle owners already going to office on a similar route
  - vehicle owners who are looking for a job and are available for daily pickup/drop
- Vehicle owners who are looking for a job can use the app to find nearby users who can pay monthly for regular pickup/drop.

This is a mobile-first front-end prototype using only HTML, CSS and JavaScript.
No backend, real maps, GPS or payments are connected yet.
