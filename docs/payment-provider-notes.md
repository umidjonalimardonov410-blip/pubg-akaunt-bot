# Payment Provider Verification Notes

## Click
Official documentation: https://docs.click.uz/

The Click documentation states that providers expose a billing system implementing the Shop API `Prepare` and `Complete` requests. It lists Click SuperApp, my.click.uz, USSD, and Telegram as payment interfaces and describes provider-side web and mobile interfaces. Treat Click wallet crediting as a two-step verified server callback flow: create a provider payment reference, validate the request/authentication fields, accept `Prepare`, and credit only once `Complete` is verified and idempotently recorded.

## Payme
Official documentation: https://developer.help.paycom.uz/protokol-merchant-api/

Payme Merchant API uses JSON-RPC 2.0 over HTTP POST and HTTPS/TLS. The documentation says merchant responses must return HTTP 200; non-200 responses are treated as RPC error `-32400`. The server should implement the documented Merchant API methods and return protocol-compliant JSON-RPC responses. Wallet crediting must occur only after the Payme transaction lifecycle reaches the provider-defined completed state, with provider transaction ID and idempotency checks persisted before balance mutation.

## Implementation guardrails

Never hardcode merchant credentials, invent callback payloads, or mark a payment successful from a browser redirect alone. Keep the wallet ledger canonical in UZS, store provider amounts in the smallest supported integer unit plus currency/provider metadata, verify signatures or Basic Auth according to each provider's official contract, make callbacks idempotent by provider and transaction reference, and retain the existing manual receipt path as a fallback until live merchant credentials and sandbox tests are supplied.
