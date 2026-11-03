# Host provisioning contract — staging and production

**Audience:** the infrastructure operator/agent who will provision the real
university VPS. This repository's authors have no access to that host and must
not be given any.

**This file contains NO secrets.** It names variables, paths, ports and
policies. Every value marked `<...>` is supplied by the operator on the host.

**Status legend used throughout:**

| Status | Meaning |
|---|---|
| `PASS` | Proven in this repository's CI against real containers |
| `PENDING REAL VPS` | Can only be proven on the actual host. **Not** satisfied by a CI simulation |
| `PENDING GITHUB CONFIGURATION` | Needs a repository/Environment setting |
| `PENDING RELEASE ACTIVATION` | Deliberately switched off until the host exists |

---

## 0. What has and has not been proven

The repository proves the deployment *logic*: locking, backup verification,
restore ordering, candidate health gating, migration-aware recovery, secret
parsing, artifact identity. All of that runs in CI against real PostgreSQL,
Redis and the exact runner image.

It cannot prove anything about **this host**. In particular these remain
`PENDING REAL VPS` and must not be recorded as passing on the strength of a
Docker simulation:

- that CSF actually denies the application ports from the internet;
- that an off-host backup copy exists and can be restored **from**;
- that the stack returns after a reboot;
- that cPanel-generated Apache config survives a rebuild with the proxy intact;
- that mail (Exim/Dovecot), PowerDNS, Pure-FTPd and cPanel's MariaDB are
  unaffected;
- that the host has enough free memory and disk under real load.

---

## 1. Host assumptions

Audited state of the target host:

| Property | Value |
|---|---|
| OS | AlmaLinux 9.8 |
| Control panel | cPanel/WHM 11.136.0.35 |
| Virtualisation | KVM VPS |
| CPU / RAM | 8 vCPU / ~11 GiB |
| Root filesystem | ~237 GiB ext4, ~216 GiB free at audit |
| Swap | **none active** |
| Firewall | CSF/lfd (+ cPHulk) |
| SELinux | disabled |
| Web server | Apache/httpd 2.4.68 owns :80 and :443 |
| Also running | Exim, Dovecot, PowerDNS, Pure-FTPd, cPanel-managed MariaDB 11.4 |
| Docker / Compose | **not installed** |
| PostgreSQL / Redis | **not installed** (this stack brings its own, in containers) |

Domains:

- `aauye-edu.net` resolves to this host and is the existing cPanel account.
- `aau.edu.ye` resolves to a **different** host and is **not** a local cPanel
  domain. Nothing here may assume it is routed to this VPS.

**No swap plus ~11 GiB shared with mail, DNS and MariaDB** is the single most
important constraint. It is why staging carries explicit memory and PID limits
and production deliberately does not carry invented ones — see §9.

---

## 2. Prerequisites to install

1. Docker Engine and the Compose v2 plugin (`docker compose`, not
   `docker-compose`).
2. Confirm the Docker daemon does not conflict with CSF's iptables management.
   Docker writes its own iptables rules; CSF must be configured to coexist
   rather than flush them. **PENDING REAL VPS.**
3. Nothing else. No Node.js, no pnpm, no Git checkout, no PostgreSQL or Redis
   packages: the stack ships everything in containers, and the VPS never
   receives application source.

---

## 3. Directory layout

Production and staging are **siblings**, never nested — so no recursive
operation or relative path in one can reach the other.

```
/srv/aau/production/
  deploy/
    docker-compose.vps.yml          root:root 0644
    .env.production                 root:root 0600   <- secrets
    release-policy.conf             root:root 0644
    authorized-releases             root:root 0644   (if using the allow-list)
    deployed-image                  root:root 0644   <- release state, written by deploy/restore
    locks/                          root:root 0700
    scripts/                        root:root 0755, files 0755
  uploads/                          10001:10001 0755 <- app writes here
  backups/                          root:root 0700   <- every row of the DB

/srv/aau/staging/                   identical shape, staging values
```

Create with:

```
install -d -o root -g root -m 0755 /srv/aau/production/deploy/scripts
install -d -o root -g root -m 0700 /srv/aau/production/deploy/locks
install -d -o root -g root -m 0700 /srv/aau/production/backups
install -d -o 10001 -g 10001 -m 0755 /srv/aau/production/uploads/media
install -d -o 10001 -g 10001 -m 0755 /srv/aau/production/uploads/private
```

`10001:10001` is the `nextjs` user inside the runner image. The application runs
non-root and cannot chown its own upload directory.

**Root-owned, and not writable by any deploy account:** everything under
`deploy/` including `scripts/`, `release-policy.conf` and `authorized-releases`.
A deploy account that can edit the entrypoint or the release policy has
defeated both.

Files to copy from this repository (they are the only repository content the
host ever receives):

```
deploy/docker-compose.vps.yml   -> /srv/aau/<env>/deploy/
deploy/postgres/                -> /srv/aau/<env>/deploy/postgres/
deploy/scripts/                 -> /srv/aau/<env>/deploy/scripts/
```

---

## 4. Compose projects, ports and state

| | production | staging |
|---|---|---|
| Compose project | `aau-production` | `aau-staging` |
| Stable bind | `127.0.0.1:3000` | `127.0.0.1:13000` |
| Candidate bind | `127.0.0.1:3001` | `127.0.0.1:13001` |
| Volumes | `aau-production_*` | `aau-staging_*` |
| Uploads | `/srv/aau/production/uploads` | `/srv/aau/staging/uploads` |
| Backups | `/srv/aau/production/backups` | `/srv/aau/staging/backups` |
| Release state | `/srv/aau/production/deploy/deployed-image` | `/srv/aau/staging/deploy/deployed-image` |
| Operation lock | `/srv/aau/production/deploy/locks/operations.lock` | `/srv/aau/staging/deploy/locks/operations.lock` |
| Env file | `/srv/aau/production/deploy/.env.production` | `/srv/aau/staging/deploy/.env.staging` |
| GHCR package | `ghcr.io/aau-university/aau-platform` | `ghcr.io/aau-university/aau-platform-staging` |

The **candidate** bind is where a new release is health-gated before it is
allowed onto the stable port. No reverse proxy may ever be pointed at it.

**Never shared between environments:** database volume, Redis persistence,
uploads, backup directory, env file, release state, operation lock, credentials,
`PAYLOAD_SECRET`, or GHCR package.

---

## 5. Environment variables

**Names only. Never send values to this repository, a PR, or an issue.**

Required in **both** `.env.<env>` files:

```
POSTGRES_ADMIN_USER          POSTGRES_ADMIN_PASSWORD      POSTGRES_DB
APP_DB_USER                  APP_DB_PASSWORD
REDIS_PASSWORD
PAYLOAD_SECRET
INITIAL_ADMIN_EMAIL          INITIAL_ADMIN_PASSWORD  (first launch only, see §11)
RATE_LIMIT_WINDOW_SECONDS    RATE_LIMIT_MAX_REQUESTS
```

Staging additionally sets the resource limits in §9.

### 5.1 The quoting contract — read before generating a password

`docker compose --env-file` does **not** read the file literally. Measured
behaviour (re-measured on every CI run by
`tests/deploy/env-contract-drill.sh`):

| Written in the file | What the container receives |
|---|---|
| `PASS=a$B` | `a` + the value of `B` — **mangled** |
| `PASS=abc #x` | `abc` — **truncated** |
| `PASS="a\nb"` | `a`, a real newline, `b` — **mangled** |
| `PASS="a$B"` | interpolated even inside double quotes — **mangled** |
| `PASS='a$B #x!'` | `a$B #x!` exactly — **correct** |

**Single-quote every value.** A value must not contain a single quote. Generate
with e.g. `openssl rand -base64 48 | tr -d "'\n"`.

The deploy scripts read this file with a reader that reproduces exactly these
rules and **refuses** any line whose meaning would depend on interpolation, so a
mis-quoted value fails the deploy loudly rather than being read differently by
the scripts and the containers.

### 5.2 Deliberately absent

- **`APP_IMAGE`** — release identity lives in `deployed-image`, written only by
  a successful deploy or restore. An `APP_IMAGE` in the env file would let a
  bare `docker compose up` months later resurrect that release. The compose file
  has no default either, so such a call fails loudly. Use
  `deploy/scripts/compose.sh`, which supplies it from the state file.
- **`DATABASE_URI` / `DATABASE_DIRECT_URI`** — the application assembles and
  percent-encodes the URI from the discrete `APP_DB_*` values, so the password
  exists in exactly one place and in one encoding.
- **`NEXT_PUBLIC_SERVER_URL`** — inlined at image build time. Setting it here
  has no effect.
- **`PAYLOAD_ALLOW_INSECURE_ORIGIN`** — a test-only escape hatch. Setting it in
  production disables the HTTPS-origin guard.

---

## 6. GHCR authentication

The packages are private, and production and staging are **separate GHCR
packages** so that the package itself is the trust boundary. That separation is
only real if the host cannot use one environment's credentials for the other.

Every `docker` call in a deployment runs as root — the deploy accounts are
deliberately not in the `docker` group — so by default they would all share one
credential store at `/root/.docker/config.json`, and a single `docker login`
there would authorise pulls from **both** packages. The deploy scripts
therefore set `DOCKER_CONFIG` per environment
(`/srv/aau/<env>/docker`), so each environment holds only a token for its own
channel. Log in once per environment, as root:

```
DOCKER_CONFIG=/srv/aau/production/docker \
  docker login ghcr.io -u <github-user> --password-stdin   # read:packages, production package only

DOCKER_CONFIG=/srv/aau/staging/docker \
  docker login ghcr.io -u <github-user> --password-stdin   # read:packages, staging package only
```

Use tokens scoped to **`read:packages` only**, each granted access to just its
own package. The host never pushes.

Verify the separation rather than assuming it: with the staging credential
store, pulling a **production** digest must FAIL.

```
DOCKER_CONFIG=/srv/aau/staging/docker docker pull ghcr.io/<owner>/<repo>@sha256:<production digest>
# expected: denied / unauthorized
```

Both directories must be root-owned, mode `0700` — they hold registry tokens.

---

## 7. Deploy accounts

Two accounts, one per environment. Neither is root, and **neither may be in the
`docker` group** — membership is root-equivalent, because it can bind-mount `/`.

| | production | staging |
|---|---|---|
| Account | `aau-deploy` | `aau-deploy-staging` |
| Shell | a **real** shell (see below) | a real shell |
| Privileged capability | one wildcard-free sudo rule | one or two |

### 7.1 Why not `nologin`

`--shell /usr/sbin/nologin` does **not** work. OpenSSH runs a remote command
through the account's login shell (`$SHELL -c "<command>"`), and nologin refuses
every invocation including command execution, so the deploy would never run. The
account therefore has a real shell and is constrained by a **forced command**.

### 7.2 authorized_keys

```
command="/srv/aau/production/deploy/scripts/ssh-forced-command.sh",\
no-agent-forwarding,no-port-forwarding,no-x11-forwarding,no-pty \
ssh-ed25519 AAAA... aau-deploy@ci
```

With a forced command, sshd ignores whatever the client asked for and always
runs that wrapper; the client's request survives only in
`$SSH_ORIGINAL_COMMAND`. The wrapper accepts exactly two shapes — an image
digest, or `seed <full|reset-and-full>` — and nothing else.

The staging copy needs **no editing**. The wrapper derives its environment from
its own installed path (`/srv/aau/{production,staging}/deploy/scripts/...`), so
installing it at the staging path is the whole configuration, and an
unrecognised location is refused rather than guessed.

**Ownership is part of the control, not a detail.** This wrapper is what
constrains the deploy account, so the deploy account must not be able to
rewrite it, replace it, or move it somewhere that makes the staging path
resolve to production:

```
chown root:root /srv/aau/<env>/deploy/scripts/ssh-forced-command.sh
chmod 0755      /srv/aau/<env>/deploy/scripts/ssh-forced-command.sh
# and every directory on the path, so the file cannot be swapped by
# replacing a parent:
chown root:root /srv /srv/aau /srv/aau/<env> /srv/aau/<env>/deploy /srv/aau/<env>/deploy/scripts
chmod 0755      /srv /srv/aau /srv/aau/<env> /srv/aau/<env>/deploy /srv/aau/<env>/deploy/scripts
```

The same applies to `~aau-deploy/.ssh/authorized_keys` itself: root-owned, mode
`0600`, and not writable by the deploy account — otherwise the account can drop
the forced command by adding a second key.

### 7.3 sudoers

`/etc/sudoers.d/aau-deploy`, mode `0440`, validated with `visudo -c`:

```
aau-deploy         ALL=(root) NOPASSWD: /srv/aau/production/deploy/scripts/deploy-entrypoint.sh
aau-deploy-staging ALL=(root) NOPASSWD: /srv/aau/staging/deploy/scripts/deploy-entrypoint.sh
aau-deploy-staging ALL=(root) NOPASSWD: /srv/aau/staging/deploy/scripts/seed-entrypoint.sh
Defaults!/srv/aau/production/deploy/scripts/deploy-entrypoint.sh !requiretty
Defaults!/srv/aau/staging/deploy/scripts/deploy-entrypoint.sh    !requiretty
Defaults!/srv/aau/staging/deploy/scripts/seed-entrypoint.sh      !requiretty
```

No wildcards, no shell, no `env_keep` additions. `env_reset` must stay on
(the default).

**Production has no seed rule, and must not be given one.** Deploying and
writing canonical content are different capabilities, and production's content
is the accepted migrated dataset rather than this repository's fixtures. Both
Seed modes are refused against production in three independent places — the
runner, `seed.sh`, and `seed-entrypoint.sh` itself, which checks the environment
its own installed path selects. A production copy of the entrypoint is therefore
inert, and installing one is a mistake rather than a capability.

Production content is installed once, by an operator on the host, with
`deploy/scripts/initialize-from-backup.sh` (see `deploy/README.md` §12b), and
recovered afterwards with `restore.sh`. Neither has an SSH verb: neither is
something a remote key may trigger.

The entrypoints derive their environment from **their own installed path**, not
from an argument or an environment variable — so the staging key cannot request
a production deployment even if it is stolen.

---

## 8. Artifact and release authorization

The entrypoint authorizes on three axes:

1. **Shape** — an immutable `<repo>@sha256:<64 hex>` digest. Never a tag.
2. **Channel** — the environment's own GHCR package (§4). A staging artifact is
   structurally incapable of entering the production path.
3. **Release** — a root-owned policy file the deploy account cannot write.

`/srv/aau/<env>/deploy/release-policy.conf` (root:root 0644) must exist, or the
deploy is refused. One of:

```
# Strong: only digests an operator has recorded may be deployed.
authorized_digests_file=/srv/aau/production/deploy/authorized-releases
```

```
# Weaker, for unattended CI deployment. Must be chosen explicitly and is
# logged on every run.
authorized_digests=any-in-channel
```

`authorized-releases` is one `sha256:<64 hex>` per line.

**Recommended:** `any-in-channel` for staging, the allow-list for production.

### 8.1 Provenance attestations — a plan limitation

GitHub's artifact attestations are available for public repositories on every
plan, but for **private** repositories they require **GitHub Enterprise Cloud**.
This repository is private and owned by a personal account, so on the current
plan the attestation step cannot succeed.

It is therefore gated on the repository variable
`ARTIFACT_ATTESTATIONS_AVAILABLE`, and the build summary states plainly which
situation applies. **PENDING GITHUB CONFIGURATION.** Until it is set:

- release identity is still the immutable registry digest;
- the entrypoint still enforces channel and release policy;
- what is missing is cryptographic proof of the build's origin.

Do not record provenance as satisfied.

---

## 9. Resource limits

Two things are true at once, and the earlier version of this section stated only
the second, which contradicted the compose file:

1. **The compose file applies a conservative default ceiling to every
   environment** (`mem_limit`/`pids_limit` with `${…:-default}`), so a container
   is NEVER unbounded. On a host with **no swap** and ~11 GiB shared with Exim,
   Dovecot, PowerDNS and MariaDB, an unbounded container that leaks lets the
   kernel OOM-killer pick a victim across the whole host — mail or MariaDB are
   plausible. The default keeps a leak local. These defaults are conservative
   **unvalidated ceilings, not measured sizing.**

2. **Neither environment's numbers are measured yet.** Staging is where a
   runaway migration or a load test is expected, so keep it at or below the
   conservative default and adjust after the first soak
   (`APP_MEM_LIMIT`, `POSTGRES_MEM_LIMIT`, `REDIS_MEM_LIMIT`, and the `PIDS`
   pair). Production runs on the same conservative default ceiling until it is
   **replaced with a value measured on this host** — the default is safe (never
   unlimited) but not tuned, and inventing a tuned number by editing a document
   is exactly what not to do.

**PENDING REAL VPS (blocks `PRODUCTION_VPS_READY=true`):** measure peak RSS and
PID counts of `app-prod` and `postgres-prod` under representative load, set the
production `*_MEM_LIMIT`/`*_PIDS_LIMIT` from that measurement, and record whether
swap should be enabled at all. Do not promote the current defaults to "validated"
without the measurement.

---

## 10. Reverse proxy

Routing model:

```
public HTTPS name -> CSF -> cPanel Apache :443 -> narrow vhost proxy -> 127.0.0.1:<port>
```

Use `deploy/reverse-proxy/apache-cpanel.conf.example`. The essential points:

- **Never edit cPanel-generated `httpd.conf`.** Use the per-user, per-domain
  userdata include directories, then `ensure_vhost_includes`,
  `rebuildhttpdconf`, `restartsrv_httpd`.
- The rule must capture **one vhost**, not the server. It must not capture
  `mail.*`, `webmail.*`, `cpanel.*`, `whm.*`, `autodiscover.*`, `autoconfig.*`,
  `cpcalendars.*`, `cpcontacts.*`, or `/.well-known/acme-challenge` — breaking
  the last one breaks AutoSSL renewal and takes the site down later in a way
  that looks like an application fault.
- Preserve forwarding headers, allow chunked/streamed responses, set a
  deliberate `LimitRequestBody`, and use a proxy timeout longer than the
  application's own handling.
- Staging needs its **own hostname**. The public origin is baked into the image
  and drives CORS, CSRF and cookie scope.

**PENDING REAL VPS:** all of it, including that the include survives a cPanel
rebuild.

---

## 11. Retiring the bootstrap password

`INITIAL_ADMIN_PASSWORD` is needed only until the configured Super Admin
exists. **Deleting the line is not enough** — the running container keeps the
environment it was created with. After the first successful deployment:

1. delete the line from `/srv/aau/<env>/deploy/.env.<env>`;
2. `deploy/scripts/compose.sh up --detach --force-recreate app-prod`
   (same known-good digest, from the release-state file);
3. verify `/api/health` returns 200 **and** admin login still works;
4. confirm the variable is gone:
   `docker inspect <container> --format '{{json .Config.Env}}' | grep -c INITIAL_ADMIN_PASSWORD` → `0`.

The runtime bootstrap never resets an existing Super Admin's password, so this
is safe: after retirement it validates the account and does nothing else.

---

## 12. Backups and the retention contract

`deploy/scripts/backup.sh` produces a verified restore point: a `pg_dump`
readable by `pg_restore`, a fully-read uploads archive, compatibility metadata,
a `MANIFEST` and `SHA256SUMS`, all `0600` under a `0700` directory.

**A Docker volume is not a backup, and neither is a copy on the same disk.**

`PENDING REAL VPS`, and non-negotiable before production:

1. at least one current copy leaves the host, to storage that a compromise or a
   disk failure here cannot reach;
2. a restore **from that off-host copy** has been performed at least once. An
   untested backup is a hypothesis.

### 12.1 Disk alerting

There is no automatic pruning here, deliberately, so disk exhaustion has to be
noticed rather than absorbed. On a host where Docker, PostgreSQL, the uploads,
the container logs and these backups may all share one filesystem, "the disk
filled up" presents as a failed backup, a failed migration and a failed mail
queue at the same time.

`deploy/scripts/retention-report.sh` is read-only and reports what exists and
which images each backup still depends on. It is a report, not a cron job: the
dangerous operation is deleting an image a retained backup needs, and that
decision belongs to a person.

**PENDING REAL VPS:** configure a free-space alert on the filesystem holding
`/srv/aau` (and on `/var/lib/docker` if it is separate), at a threshold that
leaves room to take one more full backup. Also confirm the container log bounds
(`local` driver, 20 MB x 5 per service) are actually in force.

### 12.2 Backups and images retire together

`restore.sh` starts the application image recorded in the backup's metadata,
because a restored schema needs the build that understands it. **A retained
backup whose paired image has been pruned from both the host and the registry
is not a restore point.**

So: image retention must be at least as long as backup retention. Never run
`docker system prune --volumes` on this host — it would destroy the database and
the uploads. Retire images deliberately, after confirming no retained backup
still names them.

---

## 13. Networking and exposure

What the compose file does: PostgreSQL and Redis publish **no host port** and
sit on an `internal: true` network, so they have no ordinary route off the host
and nothing outside the Docker network routes in.

**What that does NOT mean:** it is not isolation from the Docker *host*. The
host owns the bridge and can reach container IPs directly, and anything running
as root there can reach them regardless. The host is a privileged trust
boundary. That is precisely why Redis and PostgreSQL both require
authentication even here.

**PENDING REAL VPS — verify from OUTSIDE the host:**

| Port | Required state |
|---|---|
| 3000, 3001, 13000, 13001 | closed from the internet |
| 5432, 6379 | closed from the internet, and not published at all |
| 80, 443 | open (Apache) |
| SSH | open, key-only, per the account policy above |

Test with an external scanner, not with `ss`/`netstat` on the host itself —
those cannot see what the firewall does to remote traffic.

---

## 14. Two distinct test phases

**A. Internal infrastructure smoke** — over an SSH tunnel to
`127.0.0.1:13000`, before DNS/TLS exist. Proves: containers start, health is
green, migrations applied, the identity bootstrap ran, PostgreSQL and Redis
respond, uploads persist across a restart.

**B. Real functional staging** — through the public HTTPS staging hostname and
Apache. Proves: TLS, `Secure` cookies, CSRF, admin login, uploads through the
proxy, streaming, public forms and rate limiting.

**A is not a weaker version of B — it cannot test what B tests at all**, because
those behaviours depend on a real HTTPS origin. Do not relax the production
origin rules to make an HTTP tunnel behave like public staging: that would
disable the exact control the tunnel cannot exercise.

---

## 15. Required real-host drills

None of these can be satisfied by CI. Each must be performed and recorded.

| # | Drill | What it proves |
|---|---|---|
| 1 | **Reboot** | The whole stack returns unattended, in the right order, with data intact and the proxy working |
| 2 | **Rollback (schema unchanged)** | A failed candidate never reaches the stable port, and the previous release is RESTORED by restarting it. It is not uninterrupted: the maintenance window stops it before the candidate starts, so the criterion is that service returns on the stable port under the previous release, and that no candidate ever served it |
| 3 | **Restore** | `restore.sh` returns the database *and* the paired image to a known state |
| 4 | **Off-host restore** | A restore from the OFF-HOST copy (§12). The one that actually matters |
| 5 | **Backup/image retention** | A retained backup's paired image is still pullable |
| 6 | **Seed: preserve** | A normal staging deploy leaves content untouched |
| 7 | **Seed: full** | The explicit one-shot Seed creates canonical content and verifies it |
| 8 | **Seed: reset-and-full** | Works on staging; **refused** on production, as is `full` |
| 8a | **First-install initialization** | `initialize-from-backup.sh` founds a virgin production environment from the final verified staging platform backup, and refuses a second run |
| 9 | **Minimal bootstrap** | A normal deploy creates missing Roles and the Super Admin and nothing else |
| 10 | **Upload persistence** | Media survives a redeploy, a restart and a reboot |
| 11 | **Public HTTPS smoke** | `/api/health` and `/` over the real origin; admin login works |
| 12 | **Firewall exposure** | §13, from outside the host |
| 13 | **cPanel non-regression** | Mail send/receive, webmail, cPanel/WHM UI, AutoSSL renewal and MariaDB all still work after every change |
| 14 | **Resource measurement** | §9 — peak RSS under load, and the swap decision |
| 15 | **Concurrency** | A deploy and a restore cannot overlap (the shared lock, on the real host) |
| 16 | **Disk pressure** | Fill the filesystem deliberately and confirm the alert fires, the backup refuses at its preflight, and nothing silently records a partial restore point |

Drill 13 deserves emphasis: this stack is a guest on a host that already serves
the university's mail and DNS. **Breaking mail is a worse outcome than a failed
deployment.** Run it after Docker installation, after the CSF changes, after the
Apache include, and after the first real deployment.

---

## 16. Activation checklist

Repository/GitHub — **PENDING GITHUB CONFIGURATION**:

- [ ] `production` Environment, restricted to the release ref, required reviewers
- [ ] `staging` Environment
- [ ] Secrets: `VPS_SSH_HOST`, `VPS_SSH_USER`, `VPS_SSH_KEY`, `VPS_SSH_PORT`,
      `VPS_SSH_KNOWN_HOSTS`
- [ ] Secrets: `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY`,
      `STAGING_SSH_PORT`, `STAGING_SSH_KNOWN_HOSTS`
- [ ] Variables: `PRODUCTION_SERVER_URL`, `PRODUCTION_RELEASE_REF`,
      `PRODUCTION_VPS_READY`
- [ ] Variables: `STAGING_SERVER_URL`, `STAGING_RELEASE_REF`, `STAGING_VPS_READY`
- [ ] `ARTIFACT_ATTESTATIONS_AVAILABLE` (only if the plan supports it — §8.1)
- [ ] Branch/ruleset protection on the release ref

Host — **PENDING REAL VPS**:

- [ ] Docker + Compose installed; CSF coexistence verified
- [ ] Directory layout, ownership and modes (§3)
- [ ] Env files installed `root:root 0600`, single-quoted (§5)
- [ ] `release-policy.conf` for each environment (§8)
- [ ] GHCR read-only login per environment (§6)
- [ ] Deploy accounts, forced commands, sudoers; **not** in the `docker` group (§7)
- [ ] Apache userdata includes for production and staging (§10)
- [ ] Off-host backup destination configured **and restored from** (§12)
- [ ] External port scan (§13)
- [ ] All 17 drills in §15 performed and recorded (1-16, plus 8a)
- [ ] cPanel/mail/MariaDB non-regression confirmed

Host key capture, once, and **not over the network**. `ssh-keyscan` at deploy
time is trust-on-first-use on every run; running it once is still
trust-on-first-use, just once — it accepts whichever key answers, so anyone able
to intercept that single moment gets their key pinned permanently.

Read the fingerprint from the provider's authenticated console (the out-of-band
console session, not SSH), where the host prints its own keys:

```
# ON THE VPS, in the provider's console:
for f in /etc/ssh/ssh_host_*_key.pub; do ssh-keygen -lf "$f"; done
```

Then obtain the key line and verify its fingerprint matches what the console
showed, before it is trusted:

```
# on the operator's machine:
ssh-keyscan -p <port> <host> > /tmp/candidate_known_hosts
ssh-keygen -lf /tmp/candidate_known_hosts     # compare against the console output
```

Only when every fingerprint matches does that file become `known_hosts` (and the
`VPS_SSH_KNOWN_HOSTS` secret). If they differ, stop — do not retry until the
discrepancy is explained.

---

## 17. Reporting back

Send **status only**, never values:

> "§3 done. §5 done, 12 variables set. §7 done, both accounts, verified not in
> the docker group. §15 drills 1–3, 6, 9, 10 pass. Drill 4 blocked: no off-host
> destination yet. Drill 13 pass."

If a step cannot be completed, say which and why. **Do not work around a refusal
in a deploy script** — every one of them exists because the alternative was
losing data.
