## Medium Priority

- [ ] Add validation to prevent negative hose length values.
- [ ] Add sensible maximum limits for pump pressure and max pressure.
- [ ] Prevent saving reports with physically invalid calculator inputs.

Low Priority - Return a generic webhook verification failure message to the caller while keeping detailed Stripe verification errors in server logs only.

## Low Priority

- [ ] Remove duplicate Supabase GoTrueClient instances by ensuring the app uses one shared Supabase client.
- [ ] Handle logged-out /saved-setups and /account states without logging AuthSessionMissingError to the browser console.

Low Priority - Review CORS behaviour on API routes and confirm Access-Control-Allow-Origin is only as broad as needed.