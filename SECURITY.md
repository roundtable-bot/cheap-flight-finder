# Security Policy

## Reporting a vulnerability

Please don't open a public issue for security problems. Report them privately through [GitHub's private vulnerability reporting](https://github.com/roundtable-bot/cheap-flight-finder/security/advisories/new).

Include what you found, how to reproduce it, and what an attacker could do with it. You can expect a first reply within 7 days. We'll keep you updated and credit you in the release notes unless you'd rather stay anonymous.

## Scope

Things we especially want to hear about:

- A skill instruction that could lead an agent to book, pay, or share personal or payment details without the user's explicit confirmation.
- Prompt injection: text on a flight site that could make an agent following these skills do something harmful.
- Bundled scripts that run untrusted code, write outside their cache folder, or leak data.

Problems with the flight sites themselves should go to those sites.

## Supported versions

Only the latest release gets security fixes.
