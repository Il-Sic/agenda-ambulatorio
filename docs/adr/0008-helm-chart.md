# 8. A Helm chart with its own small manifests

Status: accepted

## Context

Docker Compose runs the whole application on one computer. Running it on Kubernetes takes the
same pieces, backend, frontend, PostgreSQL and Kafka, with the same settings and health checks,
and with secrets that never enter the repository.

## Decision

- **One chart, with its own templates.** Backend and frontend are Deployments. PostgreSQL and
  Kafka are single-instance StatefulSets with a volume each, written in this chart instead of
  pulled in as third-party charts: a few dozen lines each, they behave like `compose.yaml` and
  change only when this repository does. Both can be switched off in favour of an existing
  database and Kafka cluster, which is what a real installation would use.
- **The backend stays at one instance.** Sessions live in its memory, so the chart offers no
  replicas until they move to a shared store (README, known limits). The frontend keeps no state
  and runs two copies.
- **nginx learns where the backend is from the environment.** The image fills in `BACKEND_URL`
  at start. Its default is the compose service, so compose did not change; the chart passes the
  name of the release's backend service.
- **The password is generated once.** Left empty, the database password is generated at install,
  read back on upgrade, and kept on uninstall like the database volume, so a new install finds the
  database it left behind.
- **Least privilege.** Every container runs as a fixed user that is not root, cannot gain
  privileges, drops all Linux capabilities and, where the image allows, has a read-only root
  filesystem. Pods get no service account token and no service variables: the Kafka image would
  read any `KAFKA_*` variable as configuration. The backend image now has a fixed numeric user, so
  that Kubernetes can check it.
- **Probes that mean something.** The backend uses Spring Boot's liveness and readiness groups,
  with a startup probe that allows for the first start. An init container waits for the database,
  because the schema is migrated as the backend starts.

## Consequences

- The images are not published: to try the chart they are loaded into the cluster, or pushed to a
  registry named in the values.
- The single PostgreSQL and Kafka have no replicas and no backups: fine for a demo, not for
  production.
- Verified on a local kind cluster: install, upgrade, uninstall and reinstall, and the whole
  end-to-end suite through a port-forward.
