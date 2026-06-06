# Vercel httpstat Attempt

Captured: 2026-06-05
Vercel CLI:  Vercel CLI 54.6.1
Local httpstat binary:  not-installed

## https://www.archestimator.com/
```text
Vercel CLI 54.6.1 (Node.js 25.8.0)
Error: The <path> argument must be a relative API path (e.g., '/' or '/api/hello'), not a full URL.
To target a specific deployment within the currently linked project, use the --deployment <id|url> flag.
  ▲ vercel httpstat path [options]

  Execute httpstat with automatic deployment URL and protection bypass to
  visualize HTTP timing statistics.

  Options:

       --deployment <ID|URL>         The deployment ID or URL to target
       --protection-bypass <SECRET>  Protection bypass secret for accessing protected
                                     deployments
  -y,  --yes                         Skip confirmation when linking is required (e.g.
                                     in non-interactive mode)


  Global Options:

       --cwd <DIR>            Sets the current working directory for a single
                              run of a command
  -d,  --debug                Debug mode (default off)
  -Q,  --global-config <DIR>  Path to the global `.vercel` directory
  -h,  --help                 Output usage information
  -A,  --local-config <FILE>  Path to the local `vercel.json` file
       --no-color             No color mode (default off)
       --non-interactive      Run without interactive prompts; when an agent is
                              detected this is the default
  -S,  --scope                Set a custom scope
  -t,  --token <TOKEN>        Login token
  -v,  --version              Output the version number


  Examples:

  - Visualize timing for a GET request to an API endpoint

    $ vercel httpstat /api/hello

  - Make a POST request with data and see timing details

    $ vercel httpstat /api/users -- -X POST -d '{"name": "John"}'

  - Target a specific deployment by ID

    $ vercel httpstat /api/status --deployment ERiL45NJvP8ghWxgbvCM447bmxwV

  - Use curl flags after the separator

    $ vercel httpstat /api/test -- -H "Content-Type: application/json" -X PUT

  - Use with protection bypass secret

    $ vercel httpstat /api/protected --protection-bypass <secret>

```

## https://www.archestimator.com/features
```text
Vercel CLI 54.6.1 (Node.js 25.8.0)
Error: The <path> argument must be a relative API path (e.g., '/' or '/api/hello'), not a full URL.
To target a specific deployment within the currently linked project, use the --deployment <id|url> flag.
  ▲ vercel httpstat path [options]

  Execute httpstat with automatic deployment URL and protection bypass to
  visualize HTTP timing statistics.

  Options:

       --deployment <ID|URL>         The deployment ID or URL to target
       --protection-bypass <SECRET>  Protection bypass secret for accessing protected
                                     deployments
  -y,  --yes                         Skip confirmation when linking is required (e.g.
                                     in non-interactive mode)


  Global Options:

       --cwd <DIR>            Sets the current working directory for a single
                              run of a command
  -d,  --debug                Debug mode (default off)
  -Q,  --global-config <DIR>  Path to the global `.vercel` directory
  -h,  --help                 Output usage information
  -A,  --local-config <FILE>  Path to the local `vercel.json` file
       --no-color             No color mode (default off)
       --non-interactive      Run without interactive prompts; when an agent is
                              detected this is the default
  -S,  --scope                Set a custom scope
  -t,  --token <TOKEN>        Login token
  -v,  --version              Output the version number


  Examples:

  - Visualize timing for a GET request to an API endpoint

    $ vercel httpstat /api/hello

  - Make a POST request with data and see timing details

    $ vercel httpstat /api/users -- -X POST -d '{"name": "John"}'

  - Target a specific deployment by ID

    $ vercel httpstat /api/status --deployment ERiL45NJvP8ghWxgbvCM447bmxwV

  - Use curl flags after the separator

    $ vercel httpstat /api/test -- -H "Content-Type: application/json" -X PUT

  - Use with protection bypass secret

    $ vercel httpstat /api/protected --protection-bypass <secret>

```
