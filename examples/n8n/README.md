# n8n Workflow Example

This folder contains an importable n8n workflow:

- `opencode-serve-proxy-workflow.json`

## What It Does

- Exposes a webhook endpoint in n8n (`POST /webhook/opencode-chat`)
- Forwards incoming JSON body directly to `opencode serve`
- Returns opencode response JSON back to the caller

## Required Environment Variable

Set this in your n8n environment:

- `OPENCODE_SERVER_URL=http://<server-ip>:3002/v1/chat/completions`

If unset, the workflow defaults to:

- `http://127.0.0.1:3002/v1/chat/completions`

## Import Steps

1. Open n8n.
2. Import `opencode-serve-proxy-workflow.json`.
3. Activate the workflow.
4. Send a request to the webhook URL.

## Example Request to n8n Webhook

```bash
curl -X POST "http://<n8n-host>/webhook/opencode-chat" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Hello"}]}'
```
