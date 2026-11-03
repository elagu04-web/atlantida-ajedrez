import {pagosRuntime} from '../_shared/pagos-runtime.ts';
// Public provider endpoint: every request must pass HMAC validation before fetch/DB.
Deno.serve(pagosRuntime(true));
