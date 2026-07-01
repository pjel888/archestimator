# Cloudflare Worker Long Version Upload Attempt

Started: 2026-07-01T05:48:11Z
Command: npx -y wrangler@4.106.0 versions upload --name archestimator-proof --keep-vars --minify --no-upload-source-maps --tag cloudflare-only-20260701054811 --message 'Publish Cloudflare-only runtime'


 ⛅️ wrangler 4.106.0
────────────────────
🌀 Building list of assets...
✨ Read 303 files from the assets directory /Users/philiplewis/Documents/archestimator/.open-next/assets
🌀 Starting asset upload...
No updated asset files to upload. Proceeding with deployment...
Total Upload: 21541.89 KiB / gzip: 5562.68 KiB
Worker Startup Time: 30 ms
Your Worker has access to the following bindings:
Binding                                                           Resource            
env.COLLAB_ROOMS (CollaborationRoom)                              Durable Object      
env.EMAIL (unrestricted)                                          Send Email          
env.UPLOAD_JOBS_QUEUE (archestimator-upload-jobs)                 Queue               
env.ARCH_DB (363c756a-7c4d-42fe-908f-6d328bfa4acb)                D1 Database         
env.ARCH_UPLOADS_R2 (archestimator-proof-uploads)                 R2 Bucket           
env.IMAGES                                                        Images              
env.ASSETS                                                        Assets              

Uploaded archestimator-proof (571.85 sec)
Worker Version ID: 8a55ee02-8186-4c8a-a785-5c4bc214cfa7

To deploy this version to production traffic use the command wrangler versions deploy

Changes to non-versioned settings (config properties 'logpush' or 'tail_consumers') take effect after your next deployment using the command wrangler versions deploy

Changes to triggers (routes, custom domains, cron schedules, etc) must be applied with the command wrangler triggers deploy


Finished: 2026-07-01T05:58:43Z
Exit status: 0
