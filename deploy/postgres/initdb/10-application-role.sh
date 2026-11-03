#!/bin/bash
# Provision the non-superuser PostgreSQL role that the long-lived Payload
# application connects with.
#
# The official PostgreSQL image creates `POSTGRES_USER` as a *server
# superuser*. That is convenient for development and unnecessarily broad for a
# public-facing web application, so this script separates the two roles:
#
#   POSTGRES_USER (aau_admin) -> cluster/database administration only
#   APP_DB_USER   (aau_app)   -> LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE,
#                                and owner of the application database + its
#                                public schema
#
# Ownership (rather than a DML-only grant set) is required because this
# architecture runs Payload's `prodMigrations` at container start, and those
# migrations perform DDL. This is a deliberate, documented trade: the web role
# is a schema owner but is NOT a server superuser. If the project later wants a
# DML-only web role, move migrations to a separate source-free migration runner
# with its own credential first, prove that path, then reduce these privileges.
#
# Payload's Postgres adapter only issues `CREATE EXTENSION` for explicitly
# configured `extensions`, and this project configures none — so no superuser
# grant is needed "for Payload".
#
# Official image contract: scripts in /docker-entrypoint-initdb.d run ONLY when
# the data directory is empty, i.e. exactly once, on first initialization. An
# already-initialized cluster is never touched by this file; converting an
# existing cluster is an audited one-time DBA procedure (see deploy/README.md).

set -euo pipefail

: "${APP_DB_USER:?APP_DB_USER must be set for application role provisioning}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD must be set for application role provisioning}"

# `psql -v` + quote_literal/quote_ident keeps the credentials out of string
# concatenation, so an awkward password cannot alter the statement.
psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v app_user="$APP_DB_USER" \
  -v app_password="$APP_DB_PASSWORD" <<-'EOSQL'
	SELECT format(
	  'CREATE ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD %L',
	  :'app_user', :'app_password'
	)
	\gexec

	-- The application role owns the database and the schema it must migrate,
	-- which is what makes runtime DDL possible without any superuser grant.
	SELECT format('ALTER DATABASE %I OWNER TO %I', current_database(), :'app_user')
	\gexec

	SELECT format('ALTER SCHEMA public OWNER TO %I', :'app_user')
	\gexec

	SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', current_database(), :'app_user')
	\gexec

	-- Revoke the implicit PUBLIC create grant so only the owner may add objects.
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

echo "Provisioned non-superuser application role: ${APP_DB_USER}"
