#!/bin/bash

# Set the directory where certificates will be stored
CERT_DIR="cert"

# Create the directory if it does not exist
mkdir -p "$CERT_DIR"

# Generate the private key (RSA 2048-bit)
openssl genpkey -algorithm RSA -out "$CERT_DIR/private.pem" -pkeyopt rsa_keygen_bits:2048

# Generate the public key from the private key
openssl rsa -in "$CERT_DIR/private.pem" -pubout -out "$CERT_DIR/public.pem"

# Print success message
echo "Keys have been generated in the $CERT_DIR/ folder."
