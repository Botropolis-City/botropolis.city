# botropolis.city

The Botropolis website, an Astro site served by a static-assets-only Cloudflare Worker, with the Terraform for its two zones.
The application itself is a separate repo at `~/workspaces/github/botropolis`.
The registrar records live in `~/workspaces/gitlab/namecheap`.

`make verify` is the acceptance test, and it runs against the live domains.
Run it before and after any change in `infra/`.

## Rules

- **Media comes from `make media-import`, never by hand.** It reads the botropolis repo's `dist/demo/manifest.json`; `src/data/media.json` is its output, committed, and the page's only source of what exists.
  Upload (`make media-upload`) before pushing a `media.json` that names new clips.
- **Copy for the city comes from the app.** View names and questions are in `pkg/city/view.go`, hover cards in `pkg/city/plan.go`, colours in `pkg/ui/theme.go`, and what each object means in its README; quote them rather than paraphrase.

- **Never put a token value on a command line or in a file.**
  The infra token lives only in the HCP workspace; the Makefile resolves the deploy token through `secret-run` by reference.
- **`infra/` is VCS-driven** (HCP workspace `Botropolis-City/botropolis-city`): a merge to `main` that touches `infra/` applies.
  Change it through a pull request and read the speculative plan before merging; `make infra-plan` runs the same plan from a working tree.
- **The Worker must exist before a custom domain can bind to it.**
  On a fresh account, deploy first and apply second, or the apply fails with error 10092.
- **Every DNS record in both zones is Terraform's.**
  A record added in the dashboard is drift, and the next apply will not know about it.
- Files over 25 MiB cannot be Worker assets.
  Large video goes in an R2 bucket on `media.botropolis.city`, which does not exist yet.
