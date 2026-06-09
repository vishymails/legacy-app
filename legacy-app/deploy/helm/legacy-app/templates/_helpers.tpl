{{/*
Expand the chart name.
*/}}
{{- define "legacy-app.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully-qualified app name.
Truncates to 63 chars (DNS label limit).
*/}}
{{- define "legacy-app.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to every resource.
*/}}
{{- define "legacy-app.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
app.kubernetes.io/name: {{ include "legacy-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — used in both Deployment and Service selectors.
*/}}
{{- define "legacy-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "legacy-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
