#!/usr/bin/env bash
#
set -e


# Build variables.
# SOME SHOULD BE SET VIA NPM RUN.
if [[ -z "$npm_package_config_certs_dir" ]]; then
	>&2 echo "npm_package_config_certs_dir is not set"
	exit 1
else
	CERTS_DIR=$npm_package_config_certs_dir
fi

if hash openssl 2>/dev/null; then
	openssl req -x509 -nodes -newkey rsa:4096 -new -days 1024 \
		-subj "/C=SG/ST=Denial/L=Singapore/O=Dis/CN=localhost" \
		-keyout "${CERTS_DIR}/localhost.key" -out "${CERTS_DIR}/localhost.cert"
else
	echo 'openssl is not installed or not in your $PATH'
	exit 1
fi