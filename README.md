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
Both Cloudflare tokens are resolved by reference through `secret-run` at the moment a command runs.
The defaults are in the `Makefile` and can be overridden in `.env`:

| variable | default | permissions |
| --- | --- | --- |
| `CF_INFRA_TOKEN_REF` | `op:Botropolis/Cloudflare infra token/credential` | see below |
| `CF_DEPLOY_TOKEN_REF` | `op:Botropolis/Cloudflare deploy token/credential` | Account → Workers Scripts → Edit |

The infra token is scoped to the two zones only, so it cannot touch anything else in the account.

- Zone → Zone → Read
- Zone → DNS → Edit
- Zone → Zone Settings → Edit
- Zone → Single Redirect → Edit
- Zone → Email Routing Rules → Edit
- Account → Workers Scripts → Edit
- Account → Email Routing Addresses → Edit

CI uses the deploy token as the repository secret `CLOUDFLARE_API_TOKEN`, with `CLOUDFLARE_ACCOUNT_ID` as a repository variable.

## Bootstrap

This happens once, and is recorded here so it can be repeated for another domain.

1. In Cloudflare, add both sites on the Free plan.
   Delete every record Cloudflare imports from Namecheap, because Terraform owns them all.
2. Create both tokens and store them in 1Password under the refs above.
3. In HCP Terraform, create the org `Botropolis-City` and a CLI-driven workspace `botropolis-city`.
   **Set its execution mode to Local before the first `terraform init`.**
   Otherwise `init` creates the workspace in Remote mode, where the runs have no token.
4. Put the Cloudflare nameserver pair on both domains in the `namecheap` repo, apply it, and wait for both zones to show Active.
5. `make site-deploy`, then `make infra-plan` and `make infra-apply`.
6. Click the verification link Cloudflare sends to the forwarding address.
   Mail does not forward until then.
7. Add `botropolis.city` under the GitHub org's Verified domains.
   Set `github_verification_code` in `infra/terraform.auto.tfvars` and apply again.
8. Wire CI to deploy:

   ```
   secret-run --stdin "op:Botropolis/Cloudflare deploy token/credential" -- gh secret set CLOUDFLARE_API_TOKEN -R Botropolis-City/botropolis.city
   gh variable set CLOUDFLARE_ACCOUNT_ID -R Botropolis-City/botropolis.city --body "$(terraform -chdir=infra output -raw account_id)"
   ```

9. `make verify` until every check is green.
