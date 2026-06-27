alter type public.upload_scan_status add value if not exists 'failed_transient';
alter type public.upload_scan_status add value if not exists 'failed_permanent';
alter type public.upload_scan_status add value if not exists 'override_approved';
