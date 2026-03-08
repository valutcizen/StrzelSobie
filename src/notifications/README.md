# Notifications Module

This module owns notification persistence and delivery orchestration.

## Current behavior

- Always stores and marks in-app notifications for supported events.
- Sends email notifications only when email transport is configured.
- If email is not configured, notification flow falls back to in-app only (no email attempt, no error for caller).

## Retention

- Notification expiration is managed by the module.
- Default retention window is 4 weeks (28 days).
