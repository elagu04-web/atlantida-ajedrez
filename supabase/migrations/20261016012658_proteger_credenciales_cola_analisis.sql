begin; revoke all on net.http_request_queue,net._http_response from public,anon,authenticated; commit;
-- On managed pg_net the extension owner can retain PUBLIC grants.
-- The following relay migration keeps all private job capabilities out of net.
