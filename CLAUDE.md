# botropolis.city

The Botropolis website, served by a static-assets-only Cloudflare Worker, with the Terraform for its two zones.
The application itself is a separate repo at `~/workspaces/github/botropolis`.
The registrar records live in `~/workspaces/gitlab/namecheap`.

`make verify` is the acceptance test, and it runs against the live domains.
Run it before and after any change in `infra/`.

## Rules

- **Never put a token value on a command line or in a file.**
  The Makefile resolves both Cloudflare tokens through `secret-run` by reference.
- **`infra/` is applied locally** (HCP workspace `Botropolis-City/botropolis-city`, Local execution).
  Nothing applies on push; CI only checks formatting and deploys the Worker.
- **The Worker must exist before a custom domain can bind to it.**
  On a fresh account, deploy first and apply second, or the apply fails with error 10092.
- **Every DNS record in both zones is Terraform's.**
  A record added in the dashboard is drift, and the next apply will not know about it.
- Files over 25 MiB cannot be Worker assets.
  Large video goes in an R2 bucket on `media.botropolis.city`, which does not exist yet.
