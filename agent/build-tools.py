# -*- coding: utf-8 -*-
"""
Register the two webhook tools and attach them to the agent.

Design note that matters: the LLM only supplies what it can actually know from the
conversation. Identifiers come from dynamic variables set during the ring, so the model
is never asked to invent a conversation id or recall a customer uuid — and cannot get
them wrong. Enums are declared here as well as in the database, so a hallucinated
category is rejected before it reaches a request.
"""
import io, json, os, subprocess, sys

BASE = "https://northwind-dispatch.vercel.app"
API = "https://api.elevenlabs.io/v1/convai"

KEY = os.environ["ELEVENLABS_API_KEY"]
# Reference, not value. A literal here ends up in plaintext in the config that
# `elevenlabs agents pull` writes into the repo — see docs/provisioned-resources.md.
SECRET_ID = os.environ["NORTHWIND_SECRET_ID"]
AGENT = os.environ["ELEVENLABS_AGENT_ID"]

SERVICE_TYPES = ["hvac_no_heat", "hvac_no_cool", "plumbing_leak", "plumbing_clog", "other"]
URGENCIES = ["emergency", "same_day", "routine"]

HEADERS = {"x-northwind-secret": {"secret_id": SECRET_ID}}


def prop(**kw):
    return kw


GET_AVAILABILITY = {
    "tool_config": {
        "type": "webhook",
        "name": "get_availability",
        "description": (
            "Look up open appointment windows. Call this as soon as you know the service "
            "type and urgency. Do not ask the caller to hold while it runs. The response "
            "contains a 'speak' field you can say to the caller as written."
        ),
        "response_timeout_secs": 15,
        "api_schema": {
            "url": f"{BASE}/api/tools/get-availability",
            "method": "POST",
            "request_headers": HEADERS,
            "content_type": "application/json",
            "request_body_schema": {
                "type": "object",
                "required": ["service_type", "urgency"],
                "properties": {
                    "service_type": prop(
                        type="string", enum=SERVICE_TYPES,
                        description="The category of problem the caller described."),
                    "urgency": prop(
                        type="string", enum=URGENCIES,
                        description=(
                            "How urgent this is, per the emergency definitions in the "
                            "knowledge base.")),
                },
            },
        },
    }
}

BOOK_JOB = {
    "tool_config": {
        "type": "webhook",
        "name": "book_job",
        "description": (
            "Book the appointment. Call this only after the service address has been "
            "confirmed out loud and the caller has explicitly agreed to a specific time "
            "window. Call it once per booking. The response contains a 'speak' field you "
            "can say as written. If it returns should_transfer, hand off to a human."
        ),
        "response_timeout_secs": 20,
        "api_schema": {
            "url": f"{BASE}/api/tools/book-job",
            "method": "POST",
            "request_headers": HEADERS,
            "content_type": "application/json",
            "request_body_schema": {
                "type": "object",
                "required": ["slot_id", "service_type", "urgency", "issue_summary"],
                "properties": {
                    # Supplied by the platform / the ring, never by the model.
                    "conversation_id": prop(
                        type="string", dynamic_variable="system__conversation_id"),
                    "customer_id": prop(type="string", dynamic_variable="customer_id"),
                    "callback_number": prop(
                        type="string", dynamic_variable="callback_number"),
                    # Supplied by the model, from the conversation.
                    "slot_id": prop(
                        type="string",
                        description=(
                            "The slot_id of the chosen window, copied exactly from the "
                            "get_availability response. Never construct this yourself.")),
                    "service_type": prop(type="string", enum=SERVICE_TYPES,
                                         description="The category of problem."),
                    "urgency": prop(type="string", enum=URGENCIES,
                                    description="The urgency assigned during triage."),
                    "issue_summary": prop(
                        type="string",
                        description=(
                            "One sentence describing the problem in the caller's own "
                            "terms. Maximum 200 characters.")),
                    "service_address": prop(
                        type="string",
                        description=(
                            "The full service address exactly as confirmed aloud by the "
                            "caller.")),
                },
            },
        },
    }
}


def post(path, payload):
    io.open("_t.json", "w", encoding="utf-8").write(json.dumps(payload))
    r = subprocess.run(
        ["curl", "-s", "-o", "_o.json", "-w", "%{http_code}", "-X", "POST",
         f"{API}{path}", "-H", f"xi-api-key: {KEY}",
         "-H", "Content-Type: application/json", "--data-binary", "@_t.json"],
        capture_output=True, text=True)
    body = json.loads(io.open("_o.json", "rb").read().decode("utf-8"))
    return r.stdout.strip(), body


ids = []
for payload in (GET_AVAILABILITY, BOOK_JOB):
    name = payload["tool_config"]["name"]
    code, body = post("/tools", payload)
    if body.get("detail"):
        det = body["detail"]
        msg = det[0].get("msg") if isinstance(det, list) else str(det)
        loc = det[0].get("loc") if isinstance(det, list) else ""
        print(f"  {name}: HTTP {code}  {msg}  @ {loc}")
        sys.exit(1)
    tid = body.get("id") or body.get("tool_id")
    ids.append(tid)
    print(f"  {name}: HTTP {code}  id={tid}")

io.open("_ids.txt", "w").write("\n".join(i for i in ids if i))
print("tool ids written")
