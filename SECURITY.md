# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Contact the repository owner privately through the email listed on their GitHub profile and include reproduction steps, impact, and any suggested mitigation.

## Deployment notes

This portfolio project is not a managed WhatsApp service. Production operators are responsible for TLS, secret management, backups, monitoring, recipient consent, data retention, and compliance with WhatsApp's terms and applicable law.

Uploaded media is stored on the local filesystem. Use private object storage with authenticated access before operating in a multi-host or production environment.
