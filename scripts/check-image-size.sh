#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: check-image-size.sh <image> <max-mb>" >&2
  exit 2
fi

image="$1"
max_mb="$2"

if ! [[ "$max_mb" =~ ^[0-9]+$ ]]; then
  echo "max-mb must be a whole number of megabytes, got '$max_mb'" >&2
  exit 2
fi

size_bytes="$(docker image inspect --format '{{.Size}}' "$image")"
size_mb=$(( (size_bytes + 999999) / 1000000 ))

if [ "$size_mb" -gt "$max_mb" ]; then
  echo "$image is ${size_mb} MB, above the ${max_mb} MB budget. Trim the production dependencies or raise the budget on purpose." >&2
  exit 1
fi

echo "$image is ${size_mb} MB, within the ${max_mb} MB budget."
