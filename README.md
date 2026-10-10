# botropolis.city

The website for [Botropolis](https://github.com/auroq/botropolis), and the infrastructure that serves it.

| path | what |
| --- | --- |
| `site/` | the static site, served as-is |
| `wrangler.jsonc` | the `botropolis-city` Worker: static assets only, no code |
| `infra/` | Terraform for both Cloudflare zones: custom domains, the `.dev` redirect, email, DNS |
| `testing/acceptance/verify.sh` | asserts the live end state of both domains |

The registrar is Namecheap.
The nameserver delegation for both domains lives in the `namecheap` repo, not here.

## Who owns what

CI deploys the Worker on every push to `main`.
Terraform owns the edge around it, which is everything the Worker cannot carry itself.
The two are independent once bootstrapped, with one ordering rule:
a custom domain can only bind to a Worker that already exists, so the first deploy has to happen before the first apply.

| hostname | does |
| --- | --- |
| `botropolis.city`, `www.botropolis.city` | the site |
| `botropolis.dev`, `www.botropolis.dev` | 301 to the same path on `botropolis.city` |
| `hello@`, `security@botropolis.city` | forward to the maintainer |

`botropolis.dev` sends and receives no mail, and says so: null MX, `v=spf1 -all`, DMARC `p=reject`.

## Working on the site

```
make site-dev        # http://localhost:8787
make site-deploy     # only needed before CI is wired up
```

## Secrets

Nothing secret is stored in this repo or in a `.env`.

| token | lives in | used by |
| --- | --- | --- |
| infra | the HCP workspace, as the sensitive env var `CLOUDFLARE_API_TOKEN` | Terraform runs on HCP |
| deploy | the repo secret `CLOUDFLARE_API_TOKEN`, and 1Password for `make site-deploy` | `wrangler deploy` |

The account also holds other zones, so the infra token names these two zones explicitly rather than "all zones".

**Infra token** (Zone Resources: `botropolis.city`, `botropolis.dev`; Account Resources: the account holding them)

- Zone → Zone → Read
- Zone → DNS → Edit
- Zone → Zone Settings → Edit
- Zone → Single Redirect → Edit
- Zone → Email Routing Rules → Edit
- Zone → Workers Routes → Edit
- Account → Workers Scripts → Edit
- Account → Email Routing Addresses → Edit

**Deploy token**

- Account → Workers Scripts → Edit

## How changes reach the edge

The HCP workspace `Botropolis-City/botropolis-city` is connected to this repo, with working directory `infra/` and trigger pattern `infra/**`.

- A pull request touching `infra/` gets a speculative plan, posted as a check.
- A merge to `main` plans and applies.
- `make infra-plan` runs the same speculative plan from a working tree, on HCP, with the workspace's token.
  There is no local apply; HCP refuses one for a VCS-driven workspace.

## Bootstrap

Done once, and recorded so it can be repeated.

1. In Cloudflare, add both sites on the Free plan.
   Delete every record Cloudflare imports from Namecheap, because Terraform owns them all.
2. Point both domains at the Cloudflare nameservers (`namecheap` repo) and wait for both zones to show Active.
3. Create both tokens with the permissions above.
4. In HCP Terraform, create the org `Botropolis-City`, connect GitHub (the `Botropolis-City` org), and create a **version-control** workspace `botropolis-city` on this repo:
   working directory `infra`, trigger patterns `infra/**`, apply method manual for the first run.
   Add the infra token as a sensitive **environment** variable `CLOUDFLARE_API_TOKEN`.
5. Wire CI and deploy the Worker first, because a custom domain cannot bind to a Worker that does not exist (error 10092):

   ```
   secret-run --stdin "op:Botropolis/Cloudflare - Botropolis Deploy Token/credential" -- gh secret set CLOUDFLARE_API_TOKEN -R Botropolis-City/botropolis.city
   gh variable set CLOUDFLARE_ACCOUNT_ID -R Botropolis-City/botropolis.city --body "$(op read "op://Botropolis/Cloudflare - Botropolis Deploy Token/Account ID")"
   git push github main
   ```

   The push starts both the deploy job and an HCP run.
   Confirm the HCP run only once the deploy job is green.
6. Click the verification link Cloudflare sends to the forwarding address.
   Until then the API refuses the forwarding rules (`2054 Destination address is not verified`), so the first apply always fails on them.
   Click it, then start a new run.
   Test from an address other than the forwarding target: Gmail files a forwarded copy of your own message under Sent only, so a self-test looks like a failure.
7. Add `botropolis.city` under the GitHub org's Verified domains and set `github_verification_code` in `infra/variables.tf`.
8. Switch the workspace's apply method to auto.
9. `make verify` until every check is green.
