{{/* The release's name, used as prefix of every object: "agenda" or "<release>-agenda-ambulatorio". */}}
{{- define "agenda.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end }}

{{/* Labels every object carries. Call with (dict "root" $ "component" "backend"). */}}
{{- define "agenda.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .root.Chart.Name .root.Chart.Version }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
app.kubernetes.io/part-of: agenda-ambulatorio
{{ include "agenda.selectorLabels" . }}
{{- end }}

{{/* The labels a component's pods are found by: they never change between versions. */}}
{{- define "agenda.selectorLabels" -}}
app.kubernetes.io/name: {{ .root.Chart.Name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/* Settings shared by every pod: no service account token, no service environment variables. */}}
{{- define "agenda.podDefaults" -}}
automountServiceAccountToken: false
# Kubernetes would add variables such as <SERVICE>_PORT to every container: the Kafka image
# reads any KAFKA_* variable as configuration, so they are left out everywhere.
enableServiceLinks: false
{{- end }}

{{/* A container that cannot gain privileges and holds no Linux capability. */}}
{{- define "agenda.containerSecurity" -}}
allowPrivilegeEscalation: false
capabilities:
  drop: ["ALL"]
{{- end }}

{{- define "agenda.dbHost" -}}
{{- if .Values.postgresql.enabled -}}
{{- printf "%s-postgres" (include "agenda.fullname" .) -}}
{{- else -}}
{{- required "postgresql.external.host is needed when postgresql.enabled is false" .Values.postgresql.external.host -}}
{{- end -}}
{{- end }}

{{- define "agenda.dbPort" -}}
{{- if .Values.postgresql.enabled -}}5432{{- else -}}{{ .Values.postgresql.external.port }}{{- end -}}
{{- end }}

{{- define "agenda.dbSecretName" -}}
{{- .Values.postgresql.existingSecret | default (printf "%s-postgres" (include "agenda.fullname" .)) -}}
{{- end }}

{{- define "agenda.kafkaBootstrap" -}}
{{- if .Values.kafka.enabled -}}
{{- printf "%s-kafka:9092" (include "agenda.fullname" .) -}}
{{- else -}}
{{- required "kafka.external.bootstrapServers is needed when kafka.enabled is false" .Values.kafka.external.bootstrapServers -}}
{{- end -}}
{{- end }}

{{- define "agenda.image" -}}
{{- printf "%s:%s" .repository .tag -}}
{{- end }}
