param(
  [string]$Bucket = "gs://tw-industrypages"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$exclude = "(^|/)(\.git|\.github|node_modules)(/|$)|(^|/)\.local-server\.cjs$|(^|/)deploy-gcloud-bucket\.ps1$"

if (Get-Command gcloud -ErrorAction SilentlyContinue) {
  gcloud storage rsync . $Bucket --recursive --delete-unmatched-destination-objects --exclude="$exclude"
  gcloud storage objects update "$Bucket/**/*.html" --cache-control="no-cache, max-age=0" --quiet
  gcloud storage objects update "$Bucket/**/*.css" --cache-control="no-cache, max-age=0" --quiet
  gcloud storage objects update "$Bucket/**/*.js" --cache-control="no-cache, max-age=0" --quiet
  gcloud storage objects update "$Bucket/images/**" --cache-control="public, max-age=31536000" --quiet
  Write-Host "Deployed to $Bucket with refreshed cache headers."
  exit 0
}

if (Get-Command gsutil -ErrorAction SilentlyContinue) {
  gsutil -m rsync -r -d -x "$exclude" . $Bucket
  gsutil -m setmeta -h "Cache-Control:no-cache, max-age=0" "$Bucket/**/*.html" "$Bucket/**/*.css" "$Bucket/**/*.js"
  gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" "$Bucket/images/**"
  Write-Host "Deployed to $Bucket with refreshed cache headers."
  exit 0
}

throw "Google Cloud CLI was not found. Install Google Cloud SDK, run 'gcloud auth login', then rerun this script."
